/**
 * Standalone 24/7 WhatsApp AI chatbot for student support.
 *
 * Runs alongside (not inside) the Next.js app — whatsapp-web.js drives a
 * headless Puppeteer browser to stay connected to WhatsApp Web, which is
 * far too long-lived/stateful for a serverless API route.
 *
 * Usage:
 *   node whatsapp-bot.js
 *
 * On first run, scan the printed QR code with WhatsApp on your phone
 * (Linked Devices > Link a Device). The session is cached locally so
 * subsequent runs reconnect without scanning again.
 */

require("dotenv").config();

const fs = require("fs");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

/**
 * Puppeteer's bundled Chromium download can fail silently in some
 * environments. If that happens, fall back to a system-installed
 * Chrome/Edge instead of requiring `npx puppeteer browsers install chrome`.
 * Override with CHROME_EXECUTABLE_PATH in .env if yours lives elsewhere.
 */
function resolveChromeExecutablePath() {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  return candidates.find((path) => path && fs.existsSync(path));
}

const chromeExecutablePath = resolveChromeExecutablePath();
if (chromeExecutablePath) {
  console.log(`Using local Chrome install: ${chromeExecutablePath}`);
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "techwing-lms-bot" }),
  puppeteer: {
    headless: true,
    executablePath: chromeExecutablePath, // undefined => Puppeteer's bundled Chromium
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
});

client.on("qr", (qr) => {
  console.log("Scan this QR code with WhatsApp (Linked Devices > Link a Device):");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp Bot is ready!");
});

client.on("auth_failure", (message) => {
  console.error("WhatsApp authentication failed:", message);
  console.error("Delete .wwebjs_auth and run again, then re-scan the QR code.");
});

client.on("disconnected", (reason) => {
  console.warn("WhatsApp client disconnected:", reason);
  if (reason === "LOGOUT") {
    console.warn(
      "Session was logged out (unlinked from phone, or WhatsApp invalidated it).\n" +
        "1) Close this terminal (Ctrl+C)\n" +
        "2) Delete the .wwebjs_auth folder if it still exists\n" +
        "3) Run: npm run whatsapp-bot\n" +
        "4) Scan the new QR from WhatsApp → Linked devices → Link a device",
    );
  }
});

// Prevent an unhandled logout/cleanup crash from killing Node with a stack dump.
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (msg.includes("EBUSY") || msg.includes("LOGOUT") || msg.includes("unlink")) {
    console.warn("Session cleanup hit a locked file (safe to ignore). Restart and re-scan QR if needed.");
    return;
  }
  console.error("Unhandled rejection:", reason);
});

/**
 * Same brain as the website "Ask Kadaima Expert" widget:
 * calls NestJS POST /support/chat so WhatsApp + web share one reply source.
 */
async function getAIResponse(studentMessage) {
  const apiUrl = (
    process.env.SUPPORT_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5425"
  ).replace(/\/$/, "");

  try {
    const res = await fetch(`${apiUrl}/support/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: studentMessage }),
    });
    if (!res.ok) {
      throw new Error(`Support API returned ${res.status}`);
    }
    const data = await res.json();
    if (!data?.reply) {
      throw new Error("Support API returned an empty reply");
    }
    return data.reply;
  } catch (error) {
    console.error("Support chat API failed:", error.message || error);
    return (
      `🤖 Sorry — I couldn't reach the Kadaima Expert service just now. ` +
      `Please try again in a moment, or use the chat on the website.`
    );
  }
}

client.on("message", async (message) => {
  try {
    // Ignore groups, status broadcasts, and empty/non-text pings.
    if (message.from.endsWith("@g.us") || message.from === "status@broadcast") {
      return;
    }
    if (message.fromMe) {
      return;
    }

    const text = (message.body || "").trim();
    if (!text) {
      console.log(`Skipped non-text message from ${message.from} (type: ${message.type})`);
      return;
    }

    console.log(`Incoming message from ${message.from}: ${text}`);

    const aiResponse = await getAIResponse(text);

    // Prefer reply(); fall back to sendMessage for newer @lid chat IDs.
    try {
      await message.reply(aiResponse);
    } catch (replyError) {
      console.warn("message.reply failed, trying chat.sendMessage…", replyError.message);
      const chat = await message.getChat();
      await chat.sendMessage(aiResponse);
    }

    console.log(`Replied to ${message.from}`);
  } catch (error) {
    console.error("Error handling incoming message:", error);
  }
});

client.initialize();
