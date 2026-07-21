import {
  type LocalizedText,
  type QuestionConfig,
  type QuestionStatus,
  type QuestionType,
} from "@/types/quiz";

/** Payload shape matching POST /questions */
export type ImportQuestionPayload = {
  questionText: LocalizedText;
  type: QuestionType;
  points: number;
  status: QuestionStatus;
  imageUrl: null;
  config: QuestionConfig;
  choices: Array<{ choiceText: LocalizedText; isCorrect: boolean }>;
};

export type ParseIssue = { row: number; message: string };

export type ParseResult = {
  questions: ImportQuestionPayload[];
  issues: ParseIssue[];
};

const QUESTION_TYPES = new Set<QuestionType>([
  "MCQ",
  "SHORT_TEXT",
  "NUMERIC",
  "SEQUENCE",
  "ESSAY",
]);

const STATUSES = new Set<QuestionStatus>(["Draft", "Published", "Archived"]);

const OPTION_LETTERS = ["a", "b", "c", "d", "e"] as const;

/**
 * Full multilingual CSV headers.
 * - Provide question text in at least one locale (question_en / question_si / question_ta)
 * - option_X = English (same as option_X_en); option_X_si / option_X_ta optional
 * - accepted_answers = EN pipe list; accepted_answers_si / accepted_answers_ta for other locales
 */
export const CSV_HEADERS = [
  "question_en",
  "question_si",
  "question_ta",
  "type",
  "points",
  "status",
  "option_a",
  "option_a_si",
  "option_a_ta",
  "option_b",
  "option_b_si",
  "option_b_ta",
  "option_c",
  "option_c_si",
  "option_c_ta",
  "option_d",
  "option_d_si",
  "option_d_ta",
  "option_e",
  "option_e_si",
  "option_e_ta",
  "correct",
  "accepted_answers",
  "accepted_answers_si",
  "accepted_answers_ta",
  "tolerance",
  "match_mode",
] as const;

/** Sample CSV teachers can open in Excel (UTF-8). */
export const QUESTION_CSV_TEMPLATE = [
  CSV_HEADERS.join(","),
  [
    '"What is the capital of Sri Lanka?"',
    '"ශ්‍රී ලංකාවේ අගනුවර කුමක්ද?"',
    '"இலங்கையின் தலைநகரம் எது?"',
    "MCQ",
    "1",
    "Published",
    "Colombo",
    '"කොළඹ"',
    '"கொழும்பு"',
    "Kandy",
    '"මහනුවර"',
    '"கண்டி"',
    "Galle",
    '"ගාල්ල"',
    '"காலி"',
    "Jaffna",
    '"යාපනය"',
    '"யாழ்ப்பாணம்"',
    "",
    "",
    "",
    "A",
    "",
    "",
    "",
    "",
    "",
  ].join(","),
  [
    '"2 + 2 = ?"',
    '"2 + 2 = ?"',
    '"2 + 2 = ?"',
    "NUMERIC",
    "1",
    "Draft",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "4",
    "",
    "",
    "",
    "0",
    "",
  ].join(","),
  [
    "\"Translate 'apple'\"",
    '"\\"ඇපල්\\" යනු?"',
    "\"'apple' என்பதன் மொழிபெயர்ப்பு\"",
    "SHORT_TEXT",
    "1",
    "Draft",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "apple|Apple",
    '"ඇපල්|ඇපල්ල"',
    '"ஆப்பிள்"',
    "",
    "case_insensitive",
  ].join(","),
].join("\n");

export function downloadQuestionCsvTemplate() {
  const blob = new Blob(["\uFEFF" + QUESTION_CSV_TEMPLATE], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kadaima-questions-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function loc(en: string, si = "", ta = ""): LocalizedText {
  return { en: en.trim(), si: (si || "").trim(), ta: (ta || "").trim() };
}

function choiceLoc(en: string, si = "", ta = "", isCorrect: boolean) {
  return { choiceText: loc(en, si, ta), isCorrect };
}

/** Minimal RFC4180-ish CSV parse (quoted fields, commas, newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      if (ch === "\r") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    if (ch === "\r") {
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }

  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseType(raw: string): QuestionType | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (t === "MULTIPLE_CHOICE" || t === "MULTIPLECHOICE") return "MCQ";
  if (t === "FILL_IN_THE_BLANK" || t === "FILL_BLANK" || t === "SHORT") return "SHORT_TEXT";
  if (QUESTION_TYPES.has(t as QuestionType)) return t as QuestionType;
  return null;
}

function letterIndex(letter: string): number {
  const c = letter.trim().toUpperCase();
  if (c.length === 1 && c >= "A" && c <= "E") return c.charCodeAt(0) - 65;
  const n = Number(c);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n - 1;
  return -1;
}

function readOption(
  get: (key: string) => string,
  letter: (typeof OPTION_LETTERS)[number],
): LocalizedText | null {
  const en =
    get(`option_${letter}_en`) || get(`option_${letter}`) || get(letter);
  const si = get(`option_${letter}_si`);
  const ta = get(`option_${letter}_ta`);
  if (!en.trim() && !si.trim() && !ta.trim()) return null;
  return loc(en, si, ta);
}

function buildFromRow(
  get: (key: string) => string,
  rowNum: number,
): { question?: ImportQuestionPayload; issue?: ParseIssue } {
  const en = get("question_en") || get("question") || get("questiontext");
  const si = get("question_si");
  const ta = get("question_ta");
  if (!en.trim() && !si.trim() && !ta.trim()) {
    return {
      issue: {
        row: rowNum,
        message: "Missing question text (need question_en, question_si, or question_ta)",
      },
    };
  }

  const type = parseType(get("type") || "MCQ") ?? "MCQ";
  const pointsRaw = Number(get("points") || "1");
  const points = Number.isFinite(pointsRaw) && pointsRaw >= 1 ? Math.floor(pointsRaw) : 1;
  const statusRaw = (get("status") || "Draft").trim();
  const status: QuestionStatus = STATUSES.has(statusRaw as QuestionStatus)
    ? (statusRaw as QuestionStatus)
    : "Draft";

  const options = OPTION_LETTERS.map((letter) => readOption(get, letter)).filter(
    (o): o is LocalizedText => Boolean(o),
  );

  const correct = get("correct") || get("answer") || get("correct_answer");
  const config: QuestionConfig = { contentFormat: "plain" };
  let choices: ImportQuestionPayload["choices"] = [];

  if (type === "MCQ") {
    if (options.length < 2) {
      return {
        issue: {
          row: rowNum,
          message: "MCQ needs at least two options (option_a / option_a_si / option_a_ta…)",
        },
      };
    }
    const idx = letterIndex(correct);
    if (idx < 0 || idx >= options.length) {
      return {
        issue: {
          row: rowNum,
          message: "MCQ correct must be A–E matching an option (e.g. A)",
        },
      };
    }
    choices = options.map((text, i) => ({
      choiceText: text,
      isCorrect: i === idx,
    }));
  } else if (type === "SEQUENCE") {
    if (options.length < 2) {
      return { issue: { row: rowNum, message: "SEQUENCE needs at least two items in option_a…" } };
    }
    choices = options.map((text) => ({ choiceText: text, isCorrect: false }));
  } else if (type === "SHORT_TEXT") {
    const acceptedEn = (get("accepted_answers") || correct)
      .split(/[|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const acceptedSi = get("accepted_answers_si")
      .split(/[|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const acceptedTa = get("accepted_answers_ta")
      .split(/[|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const accepted = [...acceptedEn, ...acceptedSi, ...acceptedTa];
    if (!accepted.length) {
      return {
        issue: {
          row: rowNum,
          message:
            "SHORT_TEXT needs accepted_answers (and optionally accepted_answers_si / _ta), use | between answers",
        },
      };
    }
    config.acceptedAnswers = accepted;
    const mode = (get("match_mode") || "case_insensitive").trim().toLowerCase();
    config.matchMode =
      mode === "exact" || mode === "regex" ? mode : "case_insensitive";
  } else if (type === "NUMERIC") {
    const num = Number(correct);
    if (!Number.isFinite(num)) {
      return { issue: { row: rowNum, message: "NUMERIC correct must be a number" } };
    }
    config.correctNumber = num;
    const tol = Number(get("tolerance") || "0");
    config.tolerance = Number.isFinite(tol) ? tol : 0;
  }

  return {
    question: {
      questionText: loc(en, si, ta),
      type,
      points,
      status,
      imageUrl: null,
      config,
      choices,
    },
  };
}

export function parseQuestionsCsv(text: string): ParseResult {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) {
    return {
      questions: [],
      issues: [{ row: 0, message: "CSV needs a header row and at least one data row" }],
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const questions: ImportQuestionPayload[] = [];
  const issues: ParseIssue[] = [];

  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    const get = (key: string) => {
      const i = headers.indexOf(normalizeHeader(key));
      return i >= 0 ? (cells[i] ?? "").trim() : "";
    };
    const { question, issue } = buildFromRow(get, r + 1);
    if (issue) issues.push(issue);
    if (question) questions.push(question);
  }

  return { questions, issues };
}

type LangKey = "en" | "si" | "ta";

function parseLangPrefix(line: string): { lang: LangKey; text: string } | null {
  const m = line.match(/^(EN|SI|TA)\s*:\s*(.+)$/i);
  if (!m) return null;
  return { lang: m[1].toLowerCase() as LangKey, text: m[2].trim() };
}

/**
 * Multilingual Aiken (extends Moodle):
 *
 * SI-only (Sinhala paper):
 * SI: වයිරු
 * A-SI: කකුල
 * B-SI: මුහුණ
 * C-SI: බඩ
 * ANSWER: C
 *
 * Multilingual:
 * EN: What is the capital of Sri Lanka?
 * SI: ශ්‍රී ලංකාවේ අගනුවර කුමක්ද?
 * TA: இலங்கையின் தலைநகரம் எது?
 * A. Colombo
 * A-SI: කොළඹ
 * A-TA: கொழும்பு
 * B. Kandy
 * B-SI: මහනුවර
 * ANSWER: A
 *
 * Plain (EN-only) Moodle Aiken still works:
 * Question…
 * A. Option
 * ANSWER: A
 */
export function parseAiken(text: string): ParseResult {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const questions: ImportQuestionPayload[] = [];
  const issues: ParseIssue[] = [];

  blocks.forEach((block, bi) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) {
      issues.push({ row: bi + 1, message: "Aiken block needs question, options, and ANSWER" });
      return;
    }

    const answerLineIdx = lines.findIndex((l) => /^ANSWER\s*:/i.test(l));
    if (answerLineIdx < 0) {
      issues.push({ row: bi + 1, message: "Missing ANSWER: line (e.g. ANSWER: A)" });
      return;
    }

    const answerLetter = lines[answerLineIdx].replace(/^ANSWER\s*:/i, "").trim();
    const bodyLines = lines.slice(0, answerLineIdx);

    const prompt: LocalizedText = { en: "", si: "", ta: "" };
    const unprefixedPrompt: string[] = [];
    const options = new Map<string, LocalizedText>();

    for (const line of bodyLines) {
      // A-SI: / A-TA: / A-EN:
      const optLang = line.match(/^([A-E])-(EN|SI|TA)\s*:\s*(.+)$/i);
      if (optLang) {
        const letter = optLang[1].toUpperCase();
        const lang = optLang[2].toLowerCase() as LangKey;
        const cur = options.get(letter) ?? { en: "", si: "", ta: "" };
        cur[lang] = optLang[3].trim();
        options.set(letter, cur);
        continue;
      }

      // A. English option (primary)
      const opt = line.match(/^([A-E])[.)]\s*(.+)$/i);
      if (opt) {
        const letter = opt[1].toUpperCase();
        const cur = options.get(letter) ?? { en: "", si: "", ta: "" };
        cur.en = opt[2].trim();
        options.set(letter, cur);
        continue;
      }

      const langLine = parseLangPrefix(line);
      if (langLine) {
        prompt[langLine.lang] = langLine.text;
        continue;
      }

      unprefixedPrompt.push(line);
    }

    if (!prompt.en && !prompt.si && !prompt.ta && unprefixedPrompt.length) {
      prompt.en = unprefixedPrompt.join(" ").trim();
    }

    if (!prompt.en.trim() && !prompt.si.trim() && !prompt.ta.trim()) {
      issues.push({
        row: bi + 1,
        message: "Missing question text (use SI: …, EN: …, TA: …, or plain text)",
      });
      return;
    }

    const orderedLetters = [...options.keys()].sort();
    if (orderedLetters.length < 2) {
      issues.push({
        row: bi + 1,
        message: "Need at least two options (A-SI: … B-SI: … or A. … B. …)",
      });
      return;
    }

    const answerKey = answerLetter.trim().toUpperCase();
    const correctIdx = orderedLetters.indexOf(answerKey);
    if (correctIdx < 0) {
      issues.push({
        row: bi + 1,
        message: `ANSWER letter "${answerLetter}" does not match options`,
      });
      return;
    }

    questions.push({
      questionText: loc(prompt.en, prompt.si, prompt.ta),
      type: "MCQ",
      points: 1,
      status: "Draft",
      imageUrl: null,
      config: { contentFormat: "plain" },
      choices: orderedLetters.map((letter, i) => {
        const t = options.get(letter)!;
        return choiceLoc(t.en, t.si, t.ta, i === correctIdx);
      }),
    });
  });

  return { questions, issues };
}

export const AIKEN_EXAMPLE = `SI: වයිරු
A-SI: කකුල
B-SI: මුහුණ
C-SI: බඩ
ANSWER: C

EN: What is the capital of Sri Lanka?
SI: ශ්‍රී ලංකාවේ අගනුවර කුමක්ද?
A. Colombo
A-SI: කොළඹ
B. Kandy
B-SI: මහනුවර
ANSWER: A
`;
