export type SupportedLocale = "en" | "si" | "ta";

export type LocalizedText = Record<SupportedLocale, string>;

export const emptyLocalizedText = (): LocalizedText => ({ en: "", si: "", ta: "" });

/** Store content in exactly one locale slot (one quiz = one language). */
export function monoLocalizedText(value: string, language: SupportedLocale): LocalizedText {
  return {
    en: language === "en" ? value : "",
    si: language === "si" ? value : "",
    ta: language === "ta" ? value : "",
  };
}

export function plainTextFromLocalized(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function hasLocaleContent(
  text: LocalizedText | null | undefined,
  language: SupportedLocale,
  minLen = 1,
): boolean {
  if (!text) return false;
  return plainTextFromLocalized(text[language]).length >= minLen;
}

export function hasAllLocaleContent(
  text: LocalizedText | null | undefined,
  languages: SupportedLocale[],
  minLen = 1,
): boolean {
  if (!languages.length) return false;
  return languages.every((lang) => hasLocaleContent(text, lang, minLen));
}

export function filledLocales(
  text: LocalizedText | null | undefined,
  minLen = 1,
): SupportedLocale[] {
  return (["en", "si", "ta"] as const).filter((lang) =>
    hasLocaleContent(text, lang, minLen),
  );
}

export function normalizeQuizLanguages(
  languages?: Array<SupportedLocale | string> | null,
  fallback?: SupportedLocale | string | null,
): SupportedLocale[] {
  const raw: Array<SupportedLocale | string> =
    languages && languages.length > 0
      ? languages
      : fallback
        ? [fallback]
        : ["en"];
  const order: SupportedLocale[] = ["en", "si", "ta"];
  return order.filter((l) => raw.includes(l));
}

/** Prefer API `language`; otherwise infer from which title locale is filled. */
export function resolveQuizLanguage(
  title: LocalizedText | null | undefined,
  language?: SupportedLocale | string | null,
  languages?: Array<SupportedLocale | string> | null,
): SupportedLocale {
  const langs = normalizeQuizLanguages(languages, language);
  if (langs.length) return langs[0];
  if (language === "en" || language === "si" || language === "ta") return language;
  if (hasLocaleContent(title, "en")) return "en";
  if (hasLocaleContent(title, "si")) return "si";
  if (hasLocaleContent(title, "ta")) return "ta";
  return "en";
}

/** Keep only selected language slots filled. */
export function multiLocalizedText(
  text: LocalizedText,
  languages: SupportedLocale[],
): LocalizedText {
  const set = new Set(languages);
  return {
    en: set.has("en") ? text.en : "",
    si: set.has("si") ? text.si : "",
    ta: set.has("ta") ? text.ta : "",
  };
}

export interface AnswerChoiceForm {
  id: string;
  choiceText: LocalizedText;
  imageUrl?: string | null;
  isCorrect: boolean;
}

export interface QuestionForm {
  id: string;
  questionText: LocalizedText;
  type: QuestionType;
  points: number;
  sortOrder: number;
  imageUrl: string | null;
  config: QuestionConfig;
  choices: AnswerChoiceForm[];
}

export interface QuizFormState {
  /**
   * Languages this quiz uses. Title/description/questions must include each.
   * `language` mirrors the first entry (primary / take default).
   */
  languages: SupportedLocale[];
  /** Primary language (first of `languages`) — editing tab default. */
  language: SupportedLocale;
  title: LocalizedText;
  description: LocalizedText;
  coverImageUrl: string | null;
  courseId: string;
  moduleId: string;
  durationMinutes: number;
  passingScorePercentage: number;
  maxAttempts: number;
  status: "Draft" | "Published" | "Archived";
  shuffleQuestions: boolean;
  requiresUnlock: boolean;
  priceLkr: number | null;
  /** Hierarchical instruction blocks (preferred). */
  sections: QuizSectionForm[];
  /**
   * @deprecated Prefer `sections`. Kept for transitional callers;
   * builder maps these into sections on load/save.
   */
  questions: QuestionForm[];
  /** @deprecated Prefer `sections[].attached`. */
  attachedQuestionIds: string[];
}

export const initialQuizFormState = (): QuizFormState => ({
  languages: ["en"],
  language: "en",
  title: emptyLocalizedText(),
  description: emptyLocalizedText(),
  coverImageUrl: null,
  courseId: "",
  moduleId: "",
  durationMinutes: 30,
  passingScorePercentage: 70,
  maxAttempts: 1,
  status: "Draft",
  shuffleQuestions: false,
  requiresUnlock: false,
  priceLkr: null,
  sections: [],
  questions: [],
  attachedQuestionIds: [],
});

export interface Course {
  id: string;
  title: LocalizedText;
  description?: LocalizedText | null;
  status?: "Draft" | "Published" | "Archived";
  createdAt?: string;
  updatedAt?: string;
  _count?: { quizzes: number; modules: number };
}

export type CourseStatus = "Draft" | "Published" | "Archived";

export interface CourseModule {
  id: string;
  courseId: string;
  title: LocalizedText;
  description?: LocalizedText | null;
  status: CourseStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Student-facing quiz-taking types ----

export type AttemptStatus = "In_Progress" | "Submitted" | "Timed_Out";

export interface QuizSummary {
  id: string;
  language?: SupportedLocale;
  languages?: SupportedLocale[];
  title: LocalizedText;
  description: LocalizedText | null;
  coverImageUrl?: string | null;
  durationMinutes: number;
  passingScorePercentage: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  requiresUnlock?: boolean;
  priceLkr?: number | null;
  status: "Draft" | "Published" | "Archived";
  course: Course;
  module?: { id: string; title: LocalizedText } | null;
  createdBy?: { id: string; email: string; name: string | null };
  _count: { questions: number; attempts: number };
}

export type QuestionStatus = "Draft" | "Published" | "Archived";

export type QuestionType = "MCQ" | "SHORT_TEXT" | "NUMERIC" | "SEQUENCE" | "ESSAY";

export type ContentFormat = "plain" | "html";
export type MatchMode = "exact" | "case_insensitive" | "regex";

export interface QuestionConfig {
  contentFormat?: ContentFormat;
  acceptedAnswers?: string[];
  matchMode?: MatchMode;
  correctNumber?: number;
  tolerance?: number;
  min?: number;
  max?: number;
  correctOrder?: string[];
  minWords?: number;
  minSentences?: number;
}

export const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; description: string }
> = {
  MCQ: {
    label: "Multiple choice",
    description: "Single-select MCQ — text, image/spatial, or table/grid prompts",
  },
  SHORT_TEXT: {
    label: "Fill in the blank",
    description: "Short text / translation with case-insensitive or regex matching",
  },
  NUMERIC: {
    label: "Numeric answer",
    description: "Math short answer with optional tolerance",
  },
  SEQUENCE: {
    label: "Sequencing",
    description: "Drag-and-drop reorder (story steps, pictures, sentence unscramble)",
  },
  ESSAY: {
    label: "Free-text essay",
    description: "Open writing — flagged for manual grading",
  },
};

export interface BankQuestion {
  id: string;
  questionText: LocalizedText;
  type: QuestionType;
  points: number;
  status: QuestionStatus;
  imageUrl?: string | null;
  config?: QuestionConfig | null;
  choices: Array<{
    id: string;
    choiceText: LocalizedText;
    imageUrl?: string | null;
    isCorrect: boolean;
  }>;
  createdBy?: { id: string; email: string; name: string | null } | null;
  _count?: { quizLinks: number; responses: number };
  quizLinks?: Array<{
    quiz: { id: string; title: LocalizedText; status: string };
  }>;
}

/** Instruction block in the quiz builder — owns nested bank + inline questions. */
export interface QuizSectionForm {
  id: string;
  instruction: LocalizedText;
  /** Existing bank questions linked to this section. */
  attached: BankQuestion[];
  /** New inline questions created when the quiz is saved. */
  questions: QuestionForm[];
}

export function createEmptySection(index = 0): QuizSectionForm {
  return {
    id: `section-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    instruction: emptyLocalizedText(),
    attached: [],
    questions: [],
  };
}

export interface AttemptChoice {
  id: string;
  choiceText: LocalizedText;
  imageUrl?: string | null;
  isCorrect?: boolean;
}

export interface AttemptQuestion {
  id: string;
  questionText: LocalizedText;
  type: QuestionType;
  points: number;
  sortOrder: number;
  sectionId?: string | null;
  imageUrl?: string | null;
  config?: QuestionConfig | null;
  choices: AttemptChoice[];
}

/** Instruction / passage block returned with quiz detail & attempts. */
export interface AttemptQuizSection {
  id: string;
  instruction: LocalizedText;
  sortOrder: number;
  questions: AttemptQuestion[];
}

export interface AttemptResponse {
  id: string;
  attemptId: string;
  questionId: string;
  selectedChoiceId: string | null;
  textResponse: string | null;
  timeSpentSeconds: number;
  isCorrect: boolean;
  needsManualReview?: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string | null;
  guestLeadId?: string | null;
  resultToken?: string | null;
  startedAt: string;
  expiresAt: string;
  /** Authoritative remaining seconds (resilient timer). */
  secondsRemaining: number;
  violationCount?: number;
  lastHeartbeatAt?: string;
  submittedAt: string | null;
  status: AttemptStatus;
  finalScore: number;
  isPassed: boolean;
}

export interface AttemptDetail extends QuizAttempt {
  responses: AttemptResponse[];
  quiz: {
    id: string;
    language?: SupportedLocale;
    languages?: SupportedLocale[];
    title: LocalizedText;
    description: LocalizedText | null;
    durationMinutes: number;
    passingScorePercentage: number;
    course: Course;
    questions: AttemptQuestion[];
    /** Present when the quiz was built with instruction blocks. */
    sections?: AttemptQuizSection[];
  };
}

export function localize(
  text: LocalizedText | string | null | undefined,
  locale: SupportedLocale,
): string {
  if (!text) return "";
  if (typeof text === "string") return text;
  // Prefer requested locale, then any filled slot (mono-language quizzes).
  return text[locale] || text.en || text.si || text.ta || "";
}

/** Strip scripts/handlers from teacher HTML (tables / rich prompts). */
export function sanitizeQuestionHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

export function mediaUrl(path: string | null | undefined, apiBase: string): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${apiBase.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

