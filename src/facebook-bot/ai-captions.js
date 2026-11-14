/**
 * AI Sinhala Caption Generator for Kadaima Facebook Auto-Posting Bot.
 * Generates TEXT-ONLY captions in natural Sinhala Unicode using Google Gemini.
 * NEVER generates image prompts or artwork.
 */

const path = require("path");
const config = require("./config");
const storage = require("./storage");
const topics = require("./topics");
const validator = require("./validator");

// Attempt to load GoogleGenerativeAI from local or sibling node_modules
function loadGoogleGenerativeAI() {
  try {
    return require("@google/generative-ai").GoogleGenerativeAI;
  } catch {
    try {
      const altPath = path.join(__dirname, "../../../lms-api/node_modules/@google/generative-ai");
      return require(altPath).GoogleGenerativeAI;
    } catch {
      return null;
    }
  }
}

const GoogleGenerativeAI = loadGoogleGenerativeAI();

const SYSTEM_PROMPT = `You write short, accurate, engaging Sinhala Facebook captions for Kadaima,
a Sri Lankan online quiz, exam preparation and learning platform.
OUTPUT: caption text only. DO NOT generate images, image prompts,
image descriptions, HTML, Markdown code fences, LaTeX ($...$, \\times, \\frac) or graphics.
Use plain Unicode math symbols (×, ÷, −, ², √) only.
Use pure natural Sinhala Unicode (NEVER mix Telugu, Hindi, Tamil or other scripts), with English terms only when teaching them.
Under 1 minute to read; be friendly, varied in phrasing, useful, not clickbait.
Educational content must be mathematically and factually 100% accurate and age-appropriate.
Do not invent exam results, teacher testimonials or platform offers.
Never ask for passwords, personal data or telephone numbers in comments.
Include a gentle relevant CTA to https://kadaima.com, with varied phrasing.
Strictly follow TODAY'S ASSIGNED TOPIC and NEVER repeat recent puzzles, math tricks, numbers, or English words.
Return plain-text caption only; no text intended for an image.`;

class AiCaptionGenerator {
  constructor() {
    this.apiKey = config.ai.apiKey;
    const configured = [
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite",
      config.ai.primaryModel,
      ...(config.ai.fallbackModels || []),
    ].filter((m) => Boolean(m) && m !== "gemini-2.5-flash");
    this.models = [...new Set(configured)];
  }

  /**
   * Calls Google Gemini with model candidates and timeout protection.
   */
  async callGemini(userPrompt, systemInstruction = SYSTEM_PROMPT) {
    if (!this.apiKey) {
      throw new Error("Missing Gemini API key! Configure AI_API_KEY in .env or lms-api/.env");
    }

    if (GoogleGenerativeAI) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      for (const modelName of this.models) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 900,
            },
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), 20000),
          );

          const resultPromise = model.generateContent(userPrompt);
          const result = await Promise.race([resultPromise, timeoutPromise]);
          const text = result?.response?.text();
          if (text && text.trim()) {
            return {
              text: this.cleanCaptionText(text.trim()),
              modelUsed: modelName,
            };
          }
        } catch (err) {
          console.warn(`[AI Captions] Model ${modelName} error: ${err.message}. Trying next candidate...`);
        }
      }
    }

    // Fallback to REST API if SDK not available
    for (const modelName of this.models) {
      const cleanModel = modelName.replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 900 },
          }),
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return {
              text: this.cleanCaptionText(text.trim()),
              modelUsed: cleanModel,
            };
          }
        }
      } catch (err) {
        console.warn(`[AI Captions] REST fallback ${cleanModel} error: ${err.message}`);
      }
    }

    throw new Error("All Gemini models failed or timed out.");
  }

  /**
   * Strips markdown fences, quotes, and image prompts.
   */
  cleanCaptionText(raw) {
    let cleaned = raw;
    cleaned = cleaned.replace(/^```[a-z]*\n?/gim, "").replace(/```$/gim, "");
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/(?:image prompt|prompt for image|graphic description):.*$/gim, "");
    return cleaned.trim();
  }

  /**
   * Formats recent captions for this slot so Gemini sees the actual problems/tricks/words (not just greetings).
   */
  buildRecentContext(slot) {
    const recentSlotCaptions = storage.getRecentCaptionsForSlot(slot, 10);
    if (recentSlotCaptions.length === 0) {
      return "";
    }

    const formatted = recentSlotCaptions
      .map((c, i) => {
        const compact = c.replace(/\s+/g, " ").trim().slice(0, 420);
        return `${i + 1}. ${compact}`;
      })
      .join("\n");

    let extraNotice = "";
    if (slot === "midday") {
      const usedWords = new Set();
      for (const cap of recentSlotCaptions) {
        for (const w of validator.extractMiddayEnglishWords(cap)) {
          usedWords.add(w);
        }
      }
      if (usedWords.size > 0) {
        extraNotice = `\nDo NOT reuse ANY of these recently taught English words: ${[...usedWords].join(", ")}.`;
      }
    }

    return `\n\nRECENT PREVIOUS ${slot.toUpperCase()} POSTS (STRICTLY DO NOT REPEAT these questions, tricks, numbers, or word sets):\n${formatted}${extraNotice}`;
  }

  /**
   * Builds the prompt for the given slot and rotating daily topic.
   */
  buildSlotPrompt(slot, topic, retryFeedback = "") {
    const recentCaptionsNotice = this.buildRecentContext(slot);
    const retryNotice = retryFeedback
      ? `\n\nIMPORTANT CORRECTION NEEDED (previous attempt failed validation): ${retryFeedback}`
      : "";

    if (slot === "morning") {
      return `SLOT: Morning (07:00 Asia/Colombo)
TODAY'S ASSIGNED TOPIC: ${topic.title}
TOPIC INSTRUCTION: ${topic.promptInstruction}

Requirements:
1. Start with a warm, fresh Sinhala good-morning greeting containing "☀️ සුබ උදෑසනක්!" — vary the second sentence naturally each day.
2. Write ONE short, engaging school-level question or puzzle strictly matching TODAY'S ASSIGNED TOPIC above.
3. Encourage students to comment their answer (e.g. ඔයාගේ උත්තරය comment කරන්න).
4. Include a natural, varied CTA to explore more quizzes: 👉 ${config.ctaUrl} 💙
5. Use plain Unicode symbols (×, ÷, −) — NEVER use LaTeX ($...$). Clear line breaks, 1-3 emojis maximum, under 1 minute read.
6. OUTPUT FORMAT: Put the public caption first. On the very last line, output "SOLUTION: <the correct answer>" so we can verify and save it privately.${recentCaptionsNotice}${retryNotice}`;
    }

    if (slot === "midday") {
      return `SLOT: Midday (12:30 Asia/Colombo)
TODAY'S ASSIGNED VOCABULARY THEME: ${topic.title}
TOPIC INSTRUCTION: ${topic.promptInstruction}

Requirements:
1. Title: 📘 අද English වචන 10ක් ඉගෙන ගමු! (${topic.title} වගේ තේමාවක් සිංහලෙන් සඳහන් කරන්න)
2. Write a short, fresh 1-sentence Sinhala intro about today's theme.
3. Exactly 10 numbered bullet items matching TODAY'S ASSIGNED VOCABULARY THEME:
   1. Word — සිංහල තේරුම
   2. ... up to 10.
   Ensure every translation is 100% accurate and natural Sinhala Unicode.
4. Invite interaction: අද වචනවලින් එකක් තෝරලා වාක්‍යයක් comment කරන්න!
5. Natural CTA: තවත් quizzes සහ ඉගෙනුම් ද්‍රව්‍ය සඳහා 👉 ${config.ctaUrl}
6. Clean line spacing, friendly tone.${recentCaptionsNotice}${retryNotice}`;
    }

    if (slot === "evening") {
      return `SLOT: Evening (19:00 Asia/Colombo)
TODAY'S ASSIGNED MATH TRICK: ${topic.title}
TRICK INSTRUCTION: ${topic.promptInstruction}

Requirements:
1. Title: 🌙 අද රෑ ගණිත උපක්‍රමයක්!
2. Briefly introduce TODAY'S ASSIGNED MATH TRICK in fresh, natural Sinhala (avoid repeating the exact same opening sentence every day).
3. Explain the step-by-step logic clearly with ONE worked example using plain Unicode (×, ÷, −, ², √ — NEVER use LaTeX $...$). Double-check every arithmetic step so there are zero calculation errors!
4. Give ONE fresh follow-up practice question matching this exact trick for followers to solve in the comments (e.g. ඔයාටත් පුළුවන්ද මේක විසඳන්න?).
5. Natural CTA: තවත් ගණිත quizzes සහ විභාග පුහුණුව සඳහා 👉 ${config.ctaUrl}
6. Clean line spacing, under 1 minute read.
7. On the very last line, output "SOLUTION: <the worked answer to the practice question>" for private metadata verification.${recentCaptionsNotice}${retryNotice}`;
    }

    throw new Error(`Unknown slot: ${slot}. Expected morning, midday, or evening.`);
  }

  /**
   * Generates and validates a slot-specific caption using the next rotating topic.
   * Automatically retries up to 3 times if validation catches a duplicate or formatting issue.
   */
  async generateCaptionForSlot(slot) {
    const topic = topics.selectNextTopic(slot, storage);
    console.log(`[AI Captions] Assigned rotating topic for ${slot}: [${topic.id}] ${topic.title}`);

    const maxAttempts = 3;
    let lastError = null;
    let retryFeedback = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const slotPrompt = this.buildSlotPrompt(slot, topic, retryFeedback);
      const { text: rawResponse, modelUsed } = await this.callGemini(slotPrompt);

      // Extract private solution if present
      let solution = null;
      let publicCaption = rawResponse;
      const solutionMatch = rawResponse.match(/\n*SOLUTION:\s*(.+)$/i);
      if (solutionMatch) {
        solution = solutionMatch[1].trim();
        publicCaption = rawResponse.replace(/\n*SOLUTION:\s*(.+)$/i, "").trim();
      }

      // Ensure the CTA link is present
      if (!publicCaption.includes("kadaima.com")) {
        publicCaption += `\n\nතවත් quizzes සහ පාඩම් සඳහා 👉 ${config.ctaUrl} 💙`;
      }

      try {
        const validation = validator.validate(publicCaption, slot, { topic });
        return {
          slot,
          topicId: topic.id,
          topicTitle: topic.title,
          topicIndex: topic.index,
          caption: publicCaption,
          solution,
          modelUsed,
          validation,
        };
      } catch (err) {
        lastError = err;
        retryFeedback = err.message;
        console.warn(
          `[AI Captions] Attempt ${attempt}/${maxAttempts} failed validation for ${slot} (${topic.id}): ${err.message}`,
        );
      }
    }

    throw new Error(
      `Failed to generate valid non-duplicate caption for ${slot} (${topic.id}) after ${maxAttempts} attempts: ${lastError?.message}`,
    );
  }
}

module.exports = new AiCaptionGenerator();
