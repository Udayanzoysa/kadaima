/**
 * Persistent state and history storage for the Facebook Auto-Posting Bot.
 * Manages deterministic rotation indices, pending drafts, and last 30 captions history.
 */

const fs = require("fs");
const path = require("path");
const config = require("./config");

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeReadJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[FB Bot Storage] Warning reading ${filePath}: ${err.message}`);
    return defaultValue;
  }
}

function safeWriteJson(filePath, data) {
  ensureDirectoryExists(path.dirname(filePath));
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, filePath);
}

class BotStorage {
  constructor() {
    ensureDirectoryExists(config.paths.dataDir);
  }

  // --- State & Rotation Management ---

  getState() {
    const defaultState = {
      lastSuccessfulImageIndex: -1, // -1 means next is 0 (first image)
      lastSlot: null,
      lastSlotDate: null,
      lastPublishedAt: null,
      updatedAt: new Date().toISOString(),
    };
    return safeReadJson(config.paths.stateFile, defaultState);
  }

  saveState(state) {
    safeWriteJson(config.paths.stateFile, {
      ...state,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Calculates the next deterministic image index without modifying persisted state.
   */
  peekNextImageIndex() {
    const state = this.getState();
    const count = config.staticImages.length || 3;
    const currentIndex = typeof state.lastSuccessfulImageIndex === "number" ? state.lastSuccessfulImageIndex : -1;
    return (currentIndex + 1) % count;
  }

  /**
   * Advances the rotation index ONLY after confirmed successful publishing.
   */
  advanceImageIndex(confirmedIndex) {
    const state = this.getState();
    state.lastSuccessfulImageIndex = confirmedIndex;
    state.lastPublishedAt = new Date().toISOString();
    this.saveState(state);
    return state.lastSuccessfulImageIndex;
  }

  // --- Drafts Management ---

  getDrafts() {
    return safeReadJson(config.paths.draftsFile, []);
  }

  saveDraft(draft) {
    const drafts = this.getDrafts();
    const index = drafts.findIndex((d) => d.id === draft.id);
    if (index >= 0) {
      drafts[index] = { ...drafts[index], ...draft, updatedAt: new Date().toISOString() };
    } else {
      drafts.unshift({ ...draft, createdAt: new Date().toISOString() });
    }
    safeWriteJson(config.paths.draftsFile, drafts);
    return draft;
  }

  findDraftById(id) {
    const drafts = this.getDrafts();
    return drafts.find((d) => d.id === id) || null;
  }

  updateDraftStatus(id, status, extra = {}) {
    const drafts = this.getDrafts();
    const draft = drafts.find((d) => d.id === id);
    if (draft) {
      draft.status = status;
      Object.assign(draft, extra, { updatedAt: new Date().toISOString() });
      safeWriteJson(config.paths.draftsFile, drafts);
      return draft;
    }
    return null;
  }

  // --- History Management (for Duplicate Prevention) ---

  getHistory() {
    return safeReadJson(config.paths.historyFile, []);
  }

  recordSuccessfulPublish(record) {
    const history = this.getHistory();
    const entry = {
      id: record.id || `post_${Date.now()}`,
      facebookPostId: record.facebookPostId,
      slot: record.slot,
      assetId: record.assetId,
      imageFile: record.imageFile,
      caption: record.caption,
      solution: record.solution || null,
      publishedAt: new Date().toISOString(),
    };
    history.unshift(entry);
    // Keep reasonable log size
    const trimmed = history.slice(0, 200);
    safeWriteJson(config.paths.historyFile, trimmed);

    // Update state
    const state = this.getState();
    state.lastSlot = record.slot;
    state.lastSlotDate = new Date().toISOString().split("T")[0];
    this.saveState(state);

    return entry;
  }

  getLastPublishedCaptions(limit = 30) {
    const history = this.getHistory();
    return history.slice(0, limit).map((h) => h.caption);
  }
}

module.exports = new BotStorage();

