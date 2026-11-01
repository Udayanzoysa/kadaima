/**
 * Configuration manager for the Kadaima Facebook Auto-Posting Bot.
 * Loads environment settings and defaults strictly following KADAIMA_FACEBOOK_CAPTIONS_3_FIXED_IMAGES_ROTATION.md.
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Attempt to read AI_API_KEY from lms-api/.env if not present in the current workspace
function resolveAiApiKey() {
  if (process.env.AI_API_KEY && process.env.AI_API_KEY !== "your-gemini-api-key") {
    return process.env.AI_API_KEY.trim();
  }
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  const candidatePaths = [
    path.join(__dirname, "../../../lms-api/.env"),
    path.join(process.cwd(), "../lms-api/.env"),
    "D:\\Personal\\Projects\\lms-api\\.env",
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("AI_API_KEY=")) {
            const val = trimmed.split("=", 2)[1]?.trim();
            if (val && val !== "your-gemini-api-key") {
              return val;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return "";
}

function parseBool(val, fallback = false) {
  if (val === undefined || val === null || val === "") return fallback;
  const s = String(val).toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes";
}

const config = {
  // Global bot enabled switch
  enabled: parseBool(process.env.KADAIMA_FB_ENABLED, false),

  // Default to draft-only mode as required by Section 4
  draftOnly: parseBool(process.env.KADAIMA_FB_DRAFT_ONLY, true),

  // Auto-publish must remain false until owner approves
  autoPublish: parseBool(process.env.KADAIMA_FB_AUTO_PUBLISH, false),

  // Timezone (Asia/Colombo)
  timezone: process.env.KADAIMA_FB_TZ || "Asia/Colombo",

  // Scheduled Slots
  slots: {
    morning: process.env.KADAIMA_FB_MORNING || "07:00",
    midday: process.env.KADAIMA_FB_MIDDAY || "12:30",
    evening: process.env.KADAIMA_FB_EVENING || "19:00",
  },

  // Captions-only enforcement
  captionsOnly: parseBool(process.env.KADAIMA_FB_CAPTIONS_ONLY, true),

  // The 3 approved logical image IDs
  staticImages: (process.env.KADAIMA_FB_STATIC_IMAGES || "kadaima-post-01,kadaima-post-02,kadaima-post-03")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Natural CTA target URL
  ctaUrl: process.env.KADAIMA_FB_CTA_URL || "https://kadaima.com",

  // Meta Graph API Credentials
  facebook: {
    pageId: (process.env.FACEBOOK_PAGE_ID || process.env.KADAIMA_FB_PAGE_ID || "").trim(),
    pageAccessToken: (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.KADAIMA_FB_PAGE_ACCESS_TOKEN || "").trim(),
    apiVersion: process.env.KADAIMA_FB_API_VERSION || "v19.0",
  },

  // AI Configuration (Gemini)
  ai: {
    apiKey: resolveAiApiKey(),
    primaryModel: process.env.AI_MODEL || "gemini-flash-latest",
    fallbackModels: (process.env.AI_MODEL_FALLBACKS || "gemini-flash-lite-latest,gemini-2.5-flash")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  // Directory paths
  paths: {
    publicImagesDir: path.join(process.cwd(), "public/media/facebook"),
    fallbackImagesDir: path.join(process.cwd(), "data/facebook-bot/media"),
    dataDir: path.join(process.cwd(), "data/facebook-bot"),
    stateFile: path.join(process.cwd(), "data/facebook-bot/state.json"),
    draftsFile: path.join(process.cwd(), "data/facebook-bot/drafts.json"),
    historyFile: path.join(process.cwd(), "data/facebook-bot/history.json"),
  },
};

module.exports = config;

