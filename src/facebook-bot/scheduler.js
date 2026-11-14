/**
 * Scheduler for Kadaima Facebook Auto-Posting Bot.
 * Monitors local time in Asia/Colombo and fires morning (07:00), midday (12:30), and evening (19:00) slots.
 */

const config = require("./config");
const storage = require("./storage");
const imageManager = require("./image-manager");
const aiCaptions = require("./ai-captions");
const validator = require("./validator");
const metaPublisher = require("./meta-publisher");

class BotScheduler {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
  }

  /**
   * Returns current date & time components in Asia/Colombo.
   */
  getColomboTime() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: config.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getVal = (type) => parts.find((p) => p.type === type)?.value;

    const year = getVal("year");
    const month = getVal("month");
    const day = getVal("day");
    const hour = getVal("hour");
    const minute = getVal("minute");

    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hour}:${minute}`,
      hour: parseInt(hour, 10),
      minute: parseInt(minute, 10),
    };
  }

  /**
   * Executes a specific slot pipeline:
   * 1. Validate images
   * 2. Generate Sinhala caption with AI
   * 3. Validate caption & duplicate prevention
   * 4. Assign next rotated static image
   * 5. Save draft or publish to Meta Graph API
   */
  async runSlot(slot, { forcePublish = false, dryRun = false } = {}) {
    console.log(`\n[FB Bot Scheduler] >>> Starting pipeline for slot: ${slot.toUpperCase()} <<<`);

    // Step 1: Validate images
    imageManager.validateAllImages();

    // Step 2: Generate & validate caption with rotating topic + auto-retry
    console.log(`[FB Bot Scheduler] Generating ${slot} caption with AI...`);
    const genResult = await aiCaptions.generateCaptionForSlot(slot);

    // Step 3: Log validation summary
    const valResult = genResult.validation || validator.validate(genResult.caption, slot);
    console.log(
      `[FB Bot Scheduler] Caption validated (${genResult.topicId || "default"}): ${valResult.charCount} chars, ${valResult.wordCount} words.`,
    );

    // Step 4: Publish or save draft
    const publishResult = await metaPublisher.publishOrDraft({
      slot,
      caption: genResult.caption,
      solution: genResult.solution,
      topicId: genResult.topicId,
      topicTitle: genResult.topicTitle,
      topicIndex: genResult.topicIndex,
      forcePublish,
      dryRun,
    });

    return publishResult;
  }

  /**
   * Checks if current Colombo time matches any slot and has not been run today.
   */
  async checkAndTrigger() {
    const { dateStr, timeStr } = this.getColomboTime();
    const state = storage.getState();

    for (const [slot, targetTime] of Object.entries(config.slots)) {
      if (timeStr === targetTime) {
        const slotKey = `${dateStr}_${slot}`;
        if (state.lastTriggeredSlot === slotKey) {
          // Already triggered this minute
          continue;
        }

        console.log(`[FB Bot Scheduler] Target time reached for ${slot} (${timeStr} Asia/Colombo)`);
        state.lastTriggeredSlot = slotKey;
        storage.saveState(state);

        try {
          await this.runSlot(slot);
        } catch (err) {
          console.error(`[FB Bot Scheduler] Error running ${slot} slot:`, err.message);
        }
      }
    }
  }

  /**
   * Starts background scheduler daemon.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[FB Bot Scheduler] Daemon started in timezone: ${config.timezone}`);
    console.log(`[FB Bot Scheduler] Scheduled times:`);
    console.log(`  - Morning: ${config.slots.morning}`);
    console.log(`  - Midday:  ${config.slots.midday}`);
    console.log(`  - Evening: ${config.slots.evening}`);
    console.log(`[FB Bot Scheduler] Mode: ${config.draftOnly ? "DRAFT ONLY (Awaiting Owner Review)" : "AUTO-PUBLISH"}`);

    // Check every 30 seconds
    this.intervalHandle = setInterval(() => {
      this.checkAndTrigger().catch((e) => console.error("[FB Bot Interval Error]", e));
    }, 30000);

    // Initial check
    this.checkAndTrigger().catch((e) => console.error("[FB Bot Initial Check Error]", e));
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    console.log("[FB Bot Scheduler] Daemon stopped.");
  }
}

module.exports = new BotScheduler();
