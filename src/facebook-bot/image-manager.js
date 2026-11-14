/**
 * Image Manager for Kadaima Facebook Auto-Posting Bot.
 * Strictly rotates through the three approved owner-uploaded images.
 * NEVER generates or fetches new images.
 */

const fs = require("fs");
const path = require("path");
const config = require("./config");
const storage = require("./storage");

const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

const MIME_MAP = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

class ImageManager {
  /**
   * Search candidate directories for an asset matching the logical ID.
   */
  resolveAssetFile(assetId) {
    const candidateDirs = [config.paths.publicImagesDir, config.paths.fallbackImagesDir];

    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;

      for (const ext of SUPPORTED_EXTENSIONS) {
        const candidate = path.join(dir, `${assetId}${ext}`);
        if (fs.existsSync(candidate)) {
          const stats = fs.statSync(candidate);
          if (stats.size > 0) {
            return {
              assetId,
              filePath: candidate,
              fileName: path.basename(candidate),
              extension: ext,
              mimeType: MIME_MAP[ext] || "image/png",
              sizeBytes: stats.size,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Verifies that all 3 approved static images exist and are readable.
   * Throws an explicit actionable error if any is missing.
   */
  validateAllImages() {
    const status = [];
    const missing = [];

    for (const assetId of config.staticImages) {
      const resolved = this.resolveAssetFile(assetId);
      if (resolved) {
        status.push(resolved);
      } else {
        missing.push(assetId);
      }
    }

    if (missing.length > 0) {
      const errMsg =
        `[FB Image Manager Error] Missing approved static images: ${missing.join(", ")}.\n` +
        `Expected candidate directories: \n` +
        ` - ${config.paths.publicImagesDir}\n` +
        ` - ${config.paths.fallbackImagesDir}\n` +
        `Supported extensions: ${SUPPORTED_EXTENSIONS.join(", ")}.\n` +
        `DO NOT use AI to generate missing artwork. Please upload all 3 approved images before running.`;
      const err = new Error(errMsg);
      err.missingAssets = missing;
      throw err;
    }

    return status;
  }

  /**
   * Resolves the next image asset according to the deterministic rotation sequence.
   * Maps slot to asset: morning -> 0 (01), midday -> 1 (02), evening -> 2 (03), or sequential.
   * Does NOT advance the index until confirmed successful publish.
   */
  getNextRotatedImage(slot) {
    this.validateAllImages();

    let nextIndex;
    if (slot && ["morning", "midday", "evening"].includes(slot)) {
      const slotMap = { morning: 0, midday: 1, evening: 2 };
      nextIndex = slotMap[slot];
    } else {
      nextIndex = storage.peekNextImageIndex();
    }

    const assetId = config.staticImages[nextIndex];
    const resolved = this.resolveAssetFile(assetId);

    if (!resolved) {
      throw new Error(`Failed to resolve asset for rotation index ${nextIndex} (${assetId})`);
    }

    const buffer = fs.readFileSync(resolved.filePath);

    return {
      assetId,
      filePath: resolved.filePath,
      fileName: resolved.fileName,
      mimeType: resolved.mimeType,
      sizeBytes: resolved.sizeBytes,
      buffer,
      rotationIndex: nextIndex,
    };
  }

  /**
   * Resolves a specific image asset by index or ID (e.g., when retrying a draft).
   */
  getImageByAssetId(assetId) {
    const resolved = this.resolveAssetFile(assetId);
    if (!resolved) {
      throw new Error(`Could not find static image asset '${assetId}'`);
    }
    const buffer = fs.readFileSync(resolved.filePath);
    const rotationIndex = config.staticImages.indexOf(assetId);

    return {
      assetId,
      filePath: resolved.filePath,
      fileName: resolved.fileName,
      mimeType: resolved.mimeType,
      sizeBytes: resolved.sizeBytes,
      buffer,
      rotationIndex: rotationIndex >= 0 ? rotationIndex : 0,
    };
  }
}

module.exports = new ImageManager();
