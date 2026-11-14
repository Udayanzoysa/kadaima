/**
 * Meta Facebook Page Publishing Client.
 * Uploads a photo post with caption to the configured Facebook Page via Graph API.
 * Respects draft-only mode and requires explicit auto-publish configuration.
 */

const config = require("./config");
const storage = require("./storage");
const imageManager = require("./image-manager");

class MetaFacebookPublisher {
  constructor() {
    this.pageId = config.facebook.pageId;
    this.token = config.facebook.pageAccessToken;
    this.apiVersion = config.facebook.apiVersion || "v19.0";
  }

  /**
   * Publishes or creates a draft for a slot post.
   */
  async publishOrDraft({
    slot,
    caption,
    solution,
    topicId = null,
    topicTitle = null,
    topicIndex = null,
    forcePublish = false,
    dryRun = false,
  }) {
    // 1. Resolve next static image in deterministic rotation
    const imageInfo = imageManager.getNextRotatedImage(slot);

    const draftId = `draft_${slot}_${Date.now()}`;
    const draftRecord = {
      id: draftId,
      slot,
      topicId,
      topicTitle,
      topicIndex,
      caption,
      solution: solution || null,
      assetId: imageInfo.assetId,
      imageFile: imageInfo.fileName,
      imagePath: imageInfo.filePath,
      rotationIndex: imageInfo.rotationIndex,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };

    // Save to drafts storage
    storage.saveDraft(draftRecord);

    // 2. Check if we should stop at draft stage
    const shouldPublish = !dryRun && (forcePublish || (config.enabled && config.autoPublish && !config.draftOnly));

    if (!shouldPublish) {
      if (topicId) {
        storage.recordTopicUsed(slot, topicId, topicIndex);
      }
      console.log(`\n[FB Bot] ========================================`);
      console.log(`[FB Bot] DRAFT CREATED (${slot.toUpperCase()} SLOT)`);
      if (topicId) {
        console.log(`[FB Bot] Topic: [${topicId}] ${topicTitle}`);
      }
      console.log(
        `[FB Bot] Assigned Image: ${imageInfo.assetId} (${imageInfo.fileName}) [Index ${imageInfo.rotationIndex}]`,
      );
      console.log(`[FB Bot] Draft ID: ${draftId}`);
      console.log(`[FB Bot] Draft Mode Active: Auto-publishing is OFF${dryRun ? " (DRY RUN)" : ""}.`);
      console.log(`[FB Bot] Preview:\n${caption}\n`);
      if (solution) {
        console.log(`[FB Bot] Private Solution: ${solution}`);
      }
      console.log(`[FB Bot] ========================================\n`);

      return {
        success: true,
        mode: "DRAFT",
        draftId,
        slot,
        topicId,
        topicTitle,
        assetId: imageInfo.assetId,
        imageFile: imageInfo.fileName,
        caption,
        solution,
        message: "Draft saved successfully. Awaiting owner review/approval.",
      };
    }

    // 3. Auto-publish flow
    return this.postToFacebookPage({
      draftId,
      slot,
      topicId,
      topicTitle,
      topicIndex,
      caption,
      solution,
      imageInfo,
    });
  }

  /**
   * Direct Meta Graph API Photo upload.
   */
  async postToFacebookPage({
    draftId,
    slot,
    topicId = null,
    topicTitle = null,
    topicIndex = null,
    caption,
    solution,
    imageInfo,
  }) {
    if (!this.token) {
      const errMsg = "Missing FACEBOOK_PAGE_ACCESS_TOKEN. Cannot publish to Facebook.";
      console.error(`[FB Publisher] ${errMsg}`);
      storage.updateDraftStatus(draftId, "FAILED", { error: errMsg });
      return { success: false, error: errMsg };
    }

    const pageId = this.pageId || "me";
    const targetEndpoint = pageId.toLowerCase() === "me" ? "me" : encodeURIComponent(pageId);

    const postPhoto = async (endpoint) => {
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("access_token", this.token);
      const blob = new Blob([new Uint8Array(imageInfo.buffer)], { type: imageInfo.mimeType });
      formData.append("source", blob, imageInfo.fileName);

      return fetch(`https://graph.facebook.com/${this.apiVersion}/${endpoint}/photos`, {
        method: "POST",
        body: formData,
      });
    };

    try {
      console.log(`[FB Publisher] Uploading ${imageInfo.fileName} to Facebook Page (${targetEndpoint})...`);
      let response = await postPhoto(targetEndpoint);
      let data = await response.json().catch(() => ({}));

      // Retry /me/photos if direct ID is rejected as global ID
      if (!response.ok && targetEndpoint !== "me" && data?.error?.message?.toLowerCase().includes("global id")) {
        console.warn("[FB Publisher] Direct page ID rejected. Retrying with /me/photos...");
        response = await postPhoto("me");
        data = await response.json().catch(() => ({}));
      }

      if (!response.ok) {
        const errorMsg = data?.error?.message || `Facebook API HTTP ${response.status}`;
        console.error(`[FB Publisher] Facebook API Error: ${errorMsg}`);
        storage.updateDraftStatus(draftId, "FAILED", { error: errorMsg });
        return { success: false, error: errorMsg };
      }

      const facebookPostId = data.id || data.post_id;
      console.log(`[FB Publisher] SUCCESS! Published post to Facebook. Post ID: ${facebookPostId}`);

      // Advance rotation index & topic rotation ONLY after confirmed successful publish!
      storage.advanceImageIndex(imageInfo.rotationIndex);
      if (topicId) {
        storage.recordTopicUsed(slot, topicId, topicIndex);
      }

      // Record in history log
      const historyEntry = storage.recordSuccessfulPublish({
        id: draftId,
        facebookPostId,
        slot,
        topicId,
        topicTitle,
        assetId: imageInfo.assetId,
        imageFile: imageInfo.fileName,
        caption,
        solution,
      });

      // Update draft status
      storage.updateDraftStatus(draftId, "PUBLISHED", {
        facebookPostId,
        publishedAt: new Date().toISOString(),
      });

      return {
        success: true,
        mode: "PUBLISHED",
        facebookPostId,
        slot,
        assetId: imageInfo.assetId,
        imageFile: imageInfo.fileName,
        historyEntry,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[FB Publisher] Network error publishing post: ${errorMsg}`);
      storage.updateDraftStatus(draftId, "FAILED", { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Manually approves and publishes a previously generated draft.
   */
  async approveAndPublishDraft(draftId) {
    const draft = storage.findDraftById(draftId);
    if (!draft) {
      throw new Error(`Draft with ID '${draftId}' not found.`);
    }

    if (draft.status === "PUBLISHED") {
      throw new Error(`Draft '${draftId}' has already been published to Facebook (Post ID: ${draft.facebookPostId}).`);
    }

    const imageInfo = imageManager.getImageByAssetId(draft.assetId);

    return this.postToFacebookPage({
      draftId: draft.id,
      slot: draft.slot,
      topicId: draft.topicId || null,
      topicTitle: draft.topicTitle || null,
      topicIndex: draft.topicIndex ?? null,
      caption: draft.caption,
      solution: draft.solution,
      imageInfo,
    });
  }
}

module.exports = new MetaFacebookPublisher();
