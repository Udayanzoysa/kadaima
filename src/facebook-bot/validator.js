/**
 * Content validation and duplicate prevention for Kadaima Facebook Auto-Posting Bot.
 */

const storage = require("./storage");

class CaptionValidator {
  /**
   * Strips repetitive boilerplate greetings, slot titles, and CTAs so similarity
   * compares the actual puzzle, trick, or vocabulary content.
   */
  stripBoilerplate(text) {
    return text
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/☀️\s*සුබ උදෑසනක්!?[^\n]*/g, " ")
      .replace(/📘\s*අද English වචන[^\n]*/gi, " ")
      .replace(/🌙\s*අද රෑ ගණිත උපක්‍රමයක්!?[^\n]*/g, " ")
      .replace(/ඔයාගේ උත්තරය comment කරන්න\.?/gi, " ")
      .replace(/ඔබේ පිළිතුර කමෙන්ට් කරන්න\.?/gi, " ")
      .replace(/අද වචනවලින් එකක් තෝරලා වාක්‍යයක් comment කරන්න!?/gi, " ")
      .replace(/ඔයාටත් පුළුවන්ද මේක විසඳන්න\??/gi, " ")
      .replace(/තවත්[^👉\n]*👉/gu, " ")
      .replace(/මේ වගේ[^👉\n]*👉/gu, " ")
      .replace(/kadaima/gi, " ")
      .trim();
  }

  /**
   * Tokenizes text into normalized word & number tokens.
   * Preserves numbers (even 1-2 digits) so math problems are accurately compared.
   */
  tokenize(text) {
    const core = this.stripBoilerplate(text);
    return core
      .toLowerCase()
      .replace(/[^\w\s\u0D80-\u0DFF]/g, " ")
      .split(/\s+/)
      .filter((w) => /^\d+$/.test(w) || (/^[a-z]+$/.test(w) && w.length >= 2) || w.length > 2);
  }

  /**
   * Calculates Jaccard similarity between two token sets (0.0 to 1.0).
   */
  calculateSimilarity(textA, textB) {
    const tokensA = new Set(this.tokenize(textA));
    const tokensB = new Set(this.tokenize(textB));

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }

    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Extracts English vocabulary words from numbered midday list items ("1. Word — ...").
   */
  extractMiddayEnglishWords(text) {
    const words = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*\d+[.)]\s*([A-Za-z][A-Za-z\s'-]{1,40}?)\s*(?:[—–\-:]|\u2014)/);
      if (match) {
        const word = match[1].trim().toLowerCase();
        if (word) words.push(word);
      }
    }
    return words;
  }

  /**
   * Extracts significant numbers (excluding step labels 1, 2, 3 and URLs) from math posts.
   */
  extractMathNumbers(text) {
    const cleaned = this.stripBoilerplate(text)
      .replace(/පියවර\s*\d+/g, " ")
      .replace(/^\s*\d+\s*පියවර/gm, " ")
      .replace(/^\s*\d+[.)]/gm, " ");
    const matches = cleaned.match(/\b\d+\b/g) || [];
    return [...new Set(matches)];
  }

  /**
   * Validates a generated caption against all acceptance criteria.
   * Throws Error if validation fails.
   */
  validate(caption, slot, options = {}) {
    if (!caption || typeof caption !== "string") {
      throw new Error("Caption is empty or not a string.");
    }

    const trimmed = caption.trim();

    // 1. Length & completeness check
    if (trimmed.length < 80) {
      throw new Error(`Caption is too short (${trimmed.length} chars). Expected at least 80 characters.`);
    }
    if (trimmed.length > 2000) {
      throw new Error(
        `Caption is too long (${trimmed.length} chars). Expected under 2000 characters for a 1-minute read.`,
      );
    }

    const nonEmptyLines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (nonEmptyLines.length < 3) {
      throw new Error("Caption appears incomplete or missing structured line breaks.");
    }

    // 2. Sinhala Unicode presence check
    const hasSinhala = /[\u0D80-\u0DFF]/.test(trimmed);
    if (!hasSinhala) {
      throw new Error("Caption does not contain valid Sinhala Unicode characters.");
    }

    // 3. Reject stray non-Sinhala Indic scripts (e.g. Telugu/Devanagari/Tamil hallucinations)
    if (/[\u0900-\u0D7F]/.test(trimmed)) {
      throw new Error("Caption contains unintended non-Sinhala Indic script characters.");
    }

    // 4. Reject raw LaTeX formatting (ugly on Facebook)
    if (/\$[^$\n]*[+\-×*/=\\^][^$\n]*\$/.test(trimmed) || /\\(?:times|div|frac|sqrt|cdot|pm)\b/i.test(trimmed)) {
      throw new Error("Caption contains raw LaTeX syntax ($...$ or \\times). Use plain Unicode symbols instead.");
    }

    // 5. CTA Link check
    if (!trimmed.includes("kadaima.com")) {
      throw new Error("Caption is missing the required CTA link to https://kadaima.com.");
    }

    // 6. Forbidden image prompt phrases
    const forbiddenPhrases = [
      /image prompt/i,
      /prompt for image/i,
      /photorealistic/i,
      /dall[- ]?e/i,
      /midjourney/i,
      /generate an image/i,
      /describe the image/i,
      /artwork:/i,
    ];

    for (const pattern of forbiddenPhrases) {
      if (pattern.test(trimmed)) {
        throw new Error(`Caption contains forbidden image-generation phrase: ${pattern}`);
      }
    }

    // 7. Topic-adherence checks (prevent fallback to repetitive BODMAS / ×11)
    const { topic } = options;
    if (topic) {
      if (Array.isArray(topic.forbiddenTerms)) {
        for (const term of topic.forbiddenTerms) {
          if (new RegExp(`\\b${term}\\b`, "i").test(trimmed)) {
            throw new Error(`Caption used forbidden fallback term '${term}' instead of assigned topic '${topic.id}'.`);
          }
        }
      }
      if (Array.isArray(topic.forbiddenPatterns)) {
        for (const pattern of topic.forbiddenPatterns) {
          if (pattern.test(trimmed)) {
            throw new Error(`Caption matched forbidden fallback pattern ${pattern} for topic '${topic.id}'.`);
          }
        }
      }
    }

    // 8. Slot-specific validation & duplicate checks
    const recentSlotCaptions = storage.getRecentCaptionsForSlot(slot, 15);

    if (slot === "midday") {
      const numberedItems = (trimmed.match(/^\s*\d+[.)]\s*/gm) || []).length;
      if (numberedItems < 8) {
        throw new Error(`Midday post only has ${numberedItems} numbered items (expected 10).`);
      }

      const newWords = this.extractMiddayEnglishWords(trimmed);
      if (newWords.length > 0) {
        for (let i = 0; i < recentSlotCaptions.length; i++) {
          const pastWords = new Set(this.extractMiddayEnglishWords(recentSlotCaptions[i]));
          const overlap = newWords.filter((w) => pastWords.has(w));
          if (overlap.length >= 3) {
            throw new Error(
              `Midday vocabulary repeats ${overlap.length} recent words (${overlap.slice(0, 5).join(", ")}) from recent post #${i + 1}.`,
            );
          }
        }
      }
    }

    if (slot === "morning" || slot === "evening") {
      const currentNums = this.extractMathNumbers(trimmed);
      if (currentNums.length >= 3) {
        for (let i = 0; i < recentSlotCaptions.length; i++) {
          const pastNums = new Set(this.extractMathNumbers(recentSlotCaptions[i]));
          const shared = currentNums.filter((n) => pastNums.has(n));
          // If nearly all numbers in the math problem/trick match a recent post, it's the same problem
          if (shared.length >= 3 && shared.length >= Math.ceil(currentNums.length * 0.8)) {
            throw new Error(
              `Math numbers (${shared.join(", ")}) repeat a recent ${slot} post (#${i + 1}). Generate a fresh problem.`,
            );
          }
        }
      }
    }

    // 9. Core-content similarity check against recent slot captions & global recent captions
    const combinedRecent = [...new Set([...recentSlotCaptions, ...storage.getAllRecentCaptions(30)])];
    for (let i = 0; i < combinedRecent.length; i++) {
      const similarity = this.calculateSimilarity(trimmed, combinedRecent[i]);
      if (similarity > 0.55) {
        throw new Error(
          `Duplicate detected! Core content similarity (${(similarity * 100).toFixed(1)}%) with recent post #${i + 1}.`,
        );
      }
    }

    return {
      isValid: true,
      charCount: trimmed.length,
      wordCount: trimmed.split(/\s+/).length,
    };
  }
}

module.exports = new CaptionValidator();
