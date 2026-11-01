/**
 * AI Sinhala Caption Generator for Kadaima Facebook Auto-Posting Bot.
 * Generates TEXT-ONLY captions in natural Sinhala Unicode using Google Gemini.
 * NEVER generates image prompts or artwork.
 */

const path = require("path");
const config = require("./config");
const storage = require("./storage");

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
image descriptions, HTML, Markdown code fences or graphics.
Use correct natural Sinhala Unicode, with English terms only when teaching them.
Under 1 minute to read; be friendly, useful, not clickbait.
Educational content must be accurate and age-appropriate.
Do not invent exam results, teacher testimonials or platform offers.
Never ask for passwords, personal data or telephone numbers in comments.
Include a gentle relevant CTA to https://kadaima.com, with varied phrasing.
Avoid repeating the previous 30 captions and never plagiarize.
Return plain-text caption only; no text intended for an image.`;

class AiCaptionGenerator {
  constructor() {
    this.apiKey = config.ai.apiKey;
    this.models = [
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest",
    ];
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
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          });

          // Timeout promise (15 seconds)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), 15000)
          );

          const resultPromise = model.generateContent(userPrompt);
          const result = await Promise.race([resultPromise, timeoutPromise]);
          const text = result?.response?.text();
          if (text && text.trim()) {
            return this.cleanCaptionText(text.trim());
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
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return this.cleanCaptionText(text.trim());
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
   * Generates a slot-specific caption adhering to KADAIMA_FACEBOOK_CAPTIONS_3_FIXED_IMAGES_ROTATION.md.
   */
  async generateCaptionForSlot(slot) {
    const recentCaptions = storage.getLastPublishedCaptions(30);
    const recentCaptionsNotice =
      recentCaptions.length > 0
        ? `\n\nRecent previous captions to avoid repeating:\n` +
          recentCaptions.map((c, i) => `${i + 1}. ${c.slice(0, 80).replace(/\n/g, " ")}...`).join("\n")
        : "";

    let slotPrompt = "";
    let solution = null;

    if (slot === "morning") {
      slotPrompt = `SLOT: Morning (07:00 Asia/Colombo)
Task: Write a fresh, friendly Sinhala good-morning post for school students and learners with a short, school-friendly puzzle or question.
Requirements:
1. Warm Sinhala greeting: ☀️ සුබ උදෑසනක්!
2. A short, fun school-level question or puzzle (e.g. arithmetic order of operations, riddle, general science, or logic question).
3. Encourage students to comment their answer: ඔයාගේ උත්තරය comment කරන්න.
4. Natural, gentle CTA to explore more quizzes: මේ වගේ quizzes කරමින් ඉගෙන ගන්න 👉 ${config.ctaUrl} 💙
5. Clear line breaks between paragraphs, 1-3 emojis maximum, under 1 minute read.
6. OUTPUT FORMAT: Put the public caption first. On the very last line, output "SOLUTION: <the correct answer>" so we can verify and save it privately.${recentCaptionsNotice}`;
    } else if (slot === "midday") {
      slotPrompt = `SLOT: Midday (12:30 Asia/Colombo)
Task: Write a valuable, educational Sinhala post teaching exactly 10 useful English words with accurate Sinhala meanings.
Requirements:
1. Title: 📘 අද English වචන 10ක් ඉගෙන ගමු!
2. Exactly 10 numbered bullet items:
   1. Word — සිංහල තේරුම
   2. ... up to 10.
   Use practical, commonly tested English vocabulary for O/L, A/L or everyday use. Ensure every translation is 100% accurate.
3. Invite interaction: අද වචනවලින් එකක් තෝරලා වාක්‍යයක් comment කරන්න!
4. Natural CTA: තවත් quizzes සහ ඉගෙනුම් ද්‍රව්‍ය සඳහා 👉 ${config.ctaUrl}
5. Clean line spacing, friendly tone.${recentCaptionsNotice}`;
    } else if (slot === "evening") {
      slotPrompt = `SLOT: Evening (19:00 Asia/Colombo)
Task: Write a clever, educational Sinhala mathematics post sharing a short mental-maths trick or shortcut with clear worked steps.
Requirements:
1. Title: 🌙 අද රෑ ගණිත උපක්‍රමයක්!
2. A fast mental calculation shortcut (e.g. multiplying by 25, squaring numbers ending in 5, multiplying by 11, percentage shortcut).
3. Clearly explain the step-by-step logic in simple Sinhala.
4. Give a follow-up practice question for followers to solve in the comments: ඔයාටත් පුළුවන්ද මේක විසඳන්න?
5. Natural CTA: තවත් ගණිත quizzes සහ විභාග පුහුණුව සඳහා 👉 ${config.ctaUrl}
6. Clean line spacing, under 1 minute read.
7. On the very last line, output "SOLUTION: <the worked answer to the practice question>" for private metadata verification.${recentCaptionsNotice}`;
    } else {
      throw new Error(`Unknown slot: ${slot}. Expected morning, midday, or evening.`);
    }

    const rawResponse = await this.callGemini(slotPrompt);

    // Extract private solution if present
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

    return {
      slot,
      caption: publicCaption,
      solution,
      modelUsed: this.models[0],
    };
  }
}

module.exports = new AiCaptionGenerator();
