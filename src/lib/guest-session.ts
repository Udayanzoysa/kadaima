const GUEST_SESSION_KEY = "techwing_guest_session";
const GUEST_PROGRESS_KEY = "techwing_guest_progress";
const GUEST_QUIZ_COUNT_KEY = "thini_quiz_count";
const GUEST_PENDING_SYNC_KEY = "techwing_guest_pending_sync";

export interface GuestLeadLocal {
  guestSessionId: string;
  studentName: string;
  school: string;
  mobileNumber: string;
  email?: string;
}

export interface GuestAnswerValue {
  choiceId?: string;
  textResponse?: string;
}

export interface GuestProgressLocal {
  guestSessionId: string;
  currentQuizId: string;
  attemptId?: string;
  /** Legacy string = choiceId; object = multi-type answers */
  answers: Record<string, string | GuestAnswerValue>;
  lastUpdated: string;
}

export interface PendingSyncPayload {
  attemptId: string;
  guestSessionId: string;
  responses: Array<{
    questionId: string;
    choiceId?: string;
    textResponse?: string;
    timeSpent: number;
  }>;
}

export function normalizeGuestAnswer(
  value: string | GuestAnswerValue | undefined,
): GuestAnswerValue {
  if (!value) return {};
  if (typeof value === "string") return { choiceId: value };
  return value;
}

/** Prefer server draft answers; fall back to local cache. */
export function mergeAnswersFromServer(
  serverResponses: Array<{
    questionId: string;
    selectedChoiceId: string | null;
    textResponse?: string | null;
  }>,
  localAnswers: Record<string, string | GuestAnswerValue>,
): Record<string, GuestAnswerValue> {
  const merged: Record<string, GuestAnswerValue> = {};
  for (const [key, val] of Object.entries(localAnswers)) {
    merged[key] = normalizeGuestAnswer(val);
  }
  for (const row of serverResponses) {
    if (row.selectedChoiceId || row.textResponse) {
      merged[row.questionId] = {
        choiceId: row.selectedChoiceId ?? undefined,
        textResponse: row.textResponse ?? undefined,
      };
    }
  }
  return merged;
}

function createGuestSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest_${crypto.randomUUID()}`;
  }
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateGuestLead(): GuestLeadLocal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    return raw ? (JSON.parse(raw) as GuestLeadLocal) : null;
  } catch {
    return null;
  }
}

/** Ensures a guestSessionId exists for unlock/payment before lead capture. */
export function ensureGuestSessionId(): string {
  const existing = getOrCreateGuestLead();
  if (existing?.guestSessionId) return existing.guestSessionId;
  const guestSessionId = createGuestSessionId();
  const stub: GuestLeadLocal = {
    guestSessionId,
    studentName: "",
    school: "",
    mobileNumber: "",
  };
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(stub));
  return guestSessionId;
}

export function saveGuestLead(
  data: Omit<GuestLeadLocal, "guestSessionId"> & { guestSessionId?: string },
): GuestLeadLocal {
  const existing = getOrCreateGuestLead();
  const lead: GuestLeadLocal = {
    guestSessionId: data.guestSessionId || existing?.guestSessionId || createGuestSessionId(),
    studentName: data.studentName,
    school: data.school,
    mobileNumber: data.mobileNumber,
    email: data.email,
  };
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(lead));
  return lead;
}

export function saveGuestProgress(progress: GuestProgressLocal) {
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
}

export function getGuestProgress(quizId: string): GuestProgressLocal | null {
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestProgressLocal;
    return parsed.currentQuizId === quizId ? parsed : null;
  } catch {
    return null;
  }
}

export function clearGuestLead() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_SESSION_KEY);
}

export function clearGuestProgress() {
  localStorage.removeItem(GUEST_PROGRESS_KEY);
  localStorage.removeItem(GUEST_PENDING_SYNC_KEY);
}

export function setPendingSync(payload: PendingSyncPayload) {
  localStorage.setItem(GUEST_PENDING_SYNC_KEY, JSON.stringify(payload));
}

export function getPendingSync(): PendingSyncPayload | null {
  try {
    const raw = localStorage.getItem(GUEST_PENDING_SYNC_KEY);
    return raw ? (JSON.parse(raw) as PendingSyncPayload) : null;
  } catch {
    return null;
  }
}

export function clearPendingSync() {
  localStorage.removeItem(GUEST_PENDING_SYNC_KEY);
}

export function incrementGuestQuizCount(): number {
  const current = Number(localStorage.getItem(GUEST_QUIZ_COUNT_KEY) || "0");
  const next = current + 1;
  localStorage.setItem(GUEST_QUIZ_COUNT_KEY, String(next));
  return next;
}

export function getGuestQuizCount(): number {
  return Number(localStorage.getItem(GUEST_QUIZ_COUNT_KEY) || "0");
}
