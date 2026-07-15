export type SupportedLocale = "en" | "si" | "ta";

export type LocalizedText = Record<SupportedLocale, string>;

export const emptyLocalizedText = (): LocalizedText => ({ en: "", si: "", ta: "" });

export interface AnswerChoiceForm {
  id: string;
  choiceText: LocalizedText;
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
  questions: QuestionForm[];
  /** Existing bank question IDs attached (edit / attach flow). */
  attachedQuestionIds: string[];
}

export const initialQuizFormState = (): QuizFormState => ({
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
    isCorrect: boolean;
  }>;
  createdBy?: { id: string; email: string; name: string | null } | null;
  _count?: { quizLinks: number; responses: number };
  quizLinks?: Array<{
    quiz: { id: string; title: LocalizedText; status: string };
  }>;
}

export interface AttemptChoice {
  id: string;
  choiceText: LocalizedText;
  isCorrect?: boolean;
}

export interface AttemptQuestion {
  id: string;
  questionText: LocalizedText;
  type: QuestionType;
  points: number;
  sortOrder: number;
  imageUrl?: string | null;
  config?: QuestionConfig | null;
  choices: AttemptChoice[];
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
    title: LocalizedText;
    description: LocalizedText | null;
    durationMinutes: number;
    passingScorePercentage: number;
    course: Course;
    questions: AttemptQuestion[];
  };
}

export function localize(
  text: LocalizedText | string | null | undefined,
  locale: SupportedLocale,
): string {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[locale] || text.en || "";
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

