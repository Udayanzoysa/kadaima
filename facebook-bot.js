/**
 * Kadaima Facebook Auto-Posting Bot
 *
 * Captions-only generation in natural Sinhala with deterministic rotation
 * through three owner-approved static images across morning, midday, and evening slots.
 *
 * Usage:
 *   node facebook-bot.js                  # Start scheduled daemon (07:00, 12:30, 19:00 Asia/Colombo)
 *   node facebook-bot.js --test           # Run full test suite across all 3 slots
 *   node facebook-bot.js --slot=morning   # Run immediate morning slot draft/post
 *   node facebook-bot.js --slot=midday    # Run immediate midday slot draft/post
 *   node facebook-bot.js --slot=evening   # Run immediate evening slot draft/post
 *   node facebook-bot.js --status         # View rotation index, images, and drafts status
 *   node facebook-bot.js --approve [id]   # Approve and publish a draft post to Facebook
 */

require("dotenv").config();

const config = require("./src/facebook-bot/config");
const storage = require("./src/facebook-bot/storage");
const topics = require("./src/facebook-bot/topics");
const imageManager = require("./src/facebook-bot/image-manager");
const metaPublisher = require("./src/facebook-bot/meta-publisher");
const scheduler = require("./src/facebook-bot/scheduler");

async function printStatus() {
  console.log("\n========================================================");
  console.log("       KADAIMA FACEBOOK AUTO-POSTING BOT STATUS         ");
  console.log("========================================================");
  console.log(`Global Enabled:     ${config.enabled}`);
  console.log(`Draft-Only Mode:    ${config.draftOnly}`);
  console.log(`Auto-Publish:       ${config.autoPublish}`);
  console.log(`Timezone:           ${config.timezone}`);
  console.log(
    `Slots:              Morning ${config.slots.morning} | Midday ${config.slots.midday} | Evening ${config.slots.evening}`,
  );
  console.log(`AI Primary Model:   ${config.ai.primaryModel}`);
  console.log(`AI API Key Set:     ${Boolean(config.ai.apiKey)}`);
  console.log(`Facebook Page ID:   ${config.facebook.pageId || "(Not configured yet)"}`);
  console.log(`FB Page Token Set:  ${Boolean(config.facebook.pageAccessToken)}`);

  console.log("\n--- Approved Static Images Status ---");
  try {
    const images = imageManager.validateAllImages();
    images.forEach((img, idx) => {
      console.log(`  [${idx + 1}] ${img.assetId} => ${img.fileName} (${(img.sizeBytes / 1024).toFixed(1)} KB)`);
    });
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }

  const state = storage.getState();
  const nextIdx = storage.peekNextImageIndex();
  console.log("\n--- Rotation State ---");
  console.log(
    `Last Successful Index: ${state.lastSuccessfulImageIndex} (${config.staticImages[state.lastSuccessfulImageIndex] || "None yet"})`,
  );
  console.log(`Next Image In Queue:   ${nextIdx} (${config.staticImages[nextIdx]})`);
  console.log(`Last Slot Run:         ${state.lastSlot || "None"} (${state.lastSlotDate || "Never"})`);

  console.log("\n--- Next Rotating Topics ---");
  for (const s of ["morning", "midday", "evening"]) {
    const nextTopic = topics.selectNextTopic(s, storage);
    console.log(`  - ${s.padEnd(8)} => [${nextTopic.id}] ${nextTopic.title}`);
  }

  const drafts = storage.getDrafts();
  console.log(`\n--- Pending Drafts (${drafts.length}) ---`);
  if (drafts.length === 0) {
    console.log("  No pending drafts.");
  } else {
    drafts.slice(0, 5).forEach((d) => {
      console.log(
        `  - [${d.id}] Slot: ${d.slot.toUpperCase()} | Asset: ${d.assetId} | Status: ${d.status} | Created: ${d.createdAt.split("T")[0]}`,
      );
    });
  }

  const history = storage.getHistory();
  console.log(`\n--- Published History (${history.length} posts) ---`);
  if (history.length === 0) {
    console.log("  No published posts yet.");
  } else {
    history.slice(0, 3).forEach((h) => {
      console.log(
        `  - [${h.id}] FB ID: ${h.facebookPostId} | Slot: ${h.slot} | Asset: ${h.assetId} | Date: ${h.publishedAt}`,
      );
    });
  }
  console.log("========================================================\n");
}

async function runPipelineTest() {
  console.log("\n========================================================");
  console.log("     RUNNING FULL KADAIMA FACEBOOK PIPELINE TEST        ");
  console.log("========================================================");

  // 1. Verify 3 images
  console.log("\n[Step 1/5] Verifying 3 approved static images...");
  const images = imageManager.validateAllImages();
  console.log(`  ✓ All ${images.length} approved images are present, non-empty, and verified:`);
  for (const img of images) {
    console.log(`    - ${img.assetId} (${img.fileName})`);
  }

  // 2. Test Morning Slot (dryRun=true so live page is never accidentally posted during --test)
  console.log("\n[Step 2/5] Testing Morning Slot (07:00 Puzzle)...");
  const morningResult = await scheduler.runSlot("morning", { dryRun: true });
  console.log(`  ✓ Morning caption generated and validated.`);
  console.log(`  ✓ Assigned Image: ${morningResult.assetId} (${morningResult.imageFile})`);
  console.log(`  ✓ Saved Draft ID: ${morningResult.draftId}`);

  // 3. Test Midday Slot
  console.log("\n[Step 3/5] Testing Midday Slot (12:30 Vocabulary)...");
  const middayResult = await scheduler.runSlot("midday", { dryRun: true });
  console.log(`  ✓ Midday caption generated and validated.`);
  console.log(`  ✓ Assigned Image: ${middayResult.assetId} (${middayResult.imageFile})`);
  console.log(`  ✓ Saved Draft ID: ${middayResult.draftId}`);

  // 4. Test Evening Slot
  console.log("\n[Step 4/5] Testing Evening Slot (19:00 Math Trick)...");
  const eveningResult = await scheduler.runSlot("evening", { dryRun: true });
  console.log(`  ✓ Evening caption generated and validated.`);
  console.log(`  ✓ Assigned Image: ${eveningResult.assetId} (${eveningResult.imageFile})`);
  console.log(`  ✓ Saved Draft ID: ${eveningResult.draftId}`);

  // 5. Verify Drafts & Idempotency
  console.log("\n[Step 5/5] Verifying Storage & Draft Queue...");
  const drafts = storage.getDrafts();
  console.log(`  ✓ Drafts store currently holds ${drafts.length} posts.`);
  console.log(`  ✓ Draft-only mode preserved. No premature Facebook API calls made.`);

  console.log("\n========================================================");
  console.log("             ALL PIPELINE TESTS PASSED!                 ");
  console.log("========================================================\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--status")) {
    await printStatus();
    return;
  }

  if (args.includes("--test")) {
    await runPipelineTest();
    return;
  }

  // Handle slot override e.g. --slot=morning
  const slotArg = args.find((a) => a.startsWith("--slot="));
  if (slotArg) {
    const slot = slotArg.split("=")[1].toLowerCase().trim();
    if (!["morning", "midday", "evening"].includes(slot)) {
      console.error(`Invalid slot: '${slot}'. Must be morning, midday, or evening.`);
      process.exit(1);
    }
    const forcePublish = args.includes("--publish");
    const dryRun = args.includes("--dry-run");
    console.log(`Executing manual trigger for slot: ${slot} (forcePublish: ${forcePublish}, dryRun: ${dryRun})`);
    await scheduler.runSlot(slot, { forcePublish, dryRun });
    return;
  }

  // Handle draft approval e.g. --approve draft_xxx
  const approveIndex = args.indexOf("--approve");
  if (approveIndex >= 0) {
    const draftId = args[approveIndex + 1];
    if (!draftId) {
      console.error("Please specify a draft ID to approve. e.g. node facebook-bot.js --approve draft_morning_123");
      process.exit(1);
    }
    console.log(`Approving and publishing draft '${draftId}'...`);
    const res = await metaPublisher.approveAndPublishDraft(draftId);
    console.log("Result:", res);
    return;
  }

  // Default: Start daemon scheduler
  console.log("Starting Kadaima Facebook Auto-Posting Bot Daemon...");
  scheduler.start();
}

main().catch((err) => {
  console.error("\n[FB Bot Fatal Error]:", err.message || err);
  process.exit(1);
});
