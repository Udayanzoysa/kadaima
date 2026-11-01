/**
 * Content validation and duplicate prevention for Kadaima Facebook Auto-Posting Bot.
 */

const storage = require("./storage");

class CaptionValidator {
  /**
   * Tokenizes text into normalized word tokens.
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0D80-\u0DFF]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
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
   * Validates a generated caption against all acceptance criteria.
   * Throws Error if validation fails.
   */
  validate(caption, slot) {
    if (!caption || typeof caption !== "string") {
      throw new Error("Caption is empty or not a string.");
    }

    const trimmed = caption.trim();

    // 1. Length check
    if (trimmed.length < 40) {
      throw new Error(`Caption is too short (${trimmed.length} chars). Expected at least 40 characters.`);
    }
    if (trimmed.length > 2000) {
      throw new Error(`Caption is too long (${trimmed.length} chars). Expected under 2000 characters for a 1-minute read.`);
    }

    // 2. Sinhala Unicode presence check
    const hasSinhala = /[\u0D80-\u0DFF]/.test(trimmed);
    if (!hasSinhala) {
      throw new Error("Caption does not contain valid Sinhala Unicode characters.");
    }

    // 3. CTA Link check
    if (!trimmed.includes("kadaima.com")) {
      throw new Error("Caption is missing the required CTA link to https://kadaima.com.");
    }

    // 4. Forbidden image prompt phrases
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

    // 5. Slot-specific validation
    if (slot === "midday") {
      // Check that numbered items exist (e.g. 1., 2., ... 10.)
      const numberedItems = (trimmed.match(/^\s*\d+[\.\)]\s*/gm) || []).length;
      if (numberedItems < 8) {
        console.warn(`[FB Validator] Warning: Midday post only has ${numberedItems} numbered items (expected 10).`);
      }
    }

    // 6. Duplicate prevention against the last 30 published captions
    const recentCaptions = storage.getLastPublishedCaptions(30);
    for (let i = 0; i < recentCaptions.length; i++) {
      const past = recentCaptions[i];
      const similarity = this.calculateSimilarity(trimmed, past);
      if (similarity > 0.70) {
        throw new Error(
          `Duplicate detected! Caption has high similarity (${(similarity * 100).toFixed(1)}%) with recent post #${i + 1}.`
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

