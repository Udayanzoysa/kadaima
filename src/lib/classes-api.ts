import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import type {
  AttendanceStatus,
  ClassAttendanceSummaryResponse,
  ClassBatch,
  ClassBatchStatus,
  ClassBillingLedgerResponse,
  ClassEnrollmentRecord,
  ClassEnrollmentStatus,
  ClassFeeFrequency,
  ClassFeePlanItem,
  ClassFeePlansResponse,
  ClassInvitation,
  ClassLearningResponse,
  ClassLocationType,
  ClassManualSubmissionsListResponse,
  ClassOverdueAccessPolicy,
  ClassProrationPolicy,
  ClassQuizAssignmentItem,
  ClassQuizAssignmentStatus,
  ClassSchedule,
  ClassSessionItem,
  ClassSessionsListResponse,
  ClassSessionStatus,
  LessonItem,
  LessonResourceAccessPolicy,
  LessonResourceItem,
  LessonResourceType,
  LessonStatus,
  PaginatedClassBatches,
  PaginatedClassEnrollments,
  ResourceAccessUrlResponse,
  SessionAttendanceDetailResponse,
  SlipSubmissionStatus,
  StudentAttendanceResponse,
  StudentClassSummary,
  StudentTimetableResponse,
  StudentTuitionInvoicesResponse,
  TuitionAdjustmentType,
  TuitionCheckoutResponse,
  TuitionInvoiceItem,
  TuitionInvoiceStatus,
  TuitionPaymentChannel,
  TuitionPaymentStatus,
  TuitionPaymentStatusResponse,
  TuitionReceiptResponse,
} from "@/types/classes";
import type { LocalizedText, SupportedLocale } from "@/types/quiz";

function getAuthHeaders(): HeadersInit {
  const token = getClientCookie("session_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseApiResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err?.message) ? err.message.join(", ") : err?.message || fallbackMessage;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export interface ListClassesParams {
  page?: number;
  pageSize?: number;
  status?: ClassBatchStatus | "";
  courseId?: string;
  grade?: string;
  subject?: string;
  academicYear?: number | "";
  search?: string;
}

export interface UpsertClassBatchPayload {
  courseId: string;
  title: LocalizedText;
  description?: LocalizedText | null;
  grade?: string | null;
  subject?: string | null;
  academicYear: number;
  languages?: SupportedLocale[];
  capacity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: ClassBatchStatus;
}

export interface UpsertClassSchedulePayload {
  weekday: number;
  localStartTime: string;
  localEndTime: string;
  timezone?: string;
  locationType?: ClassLocationType;
  locationValue?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export async function fetchClassBatches(params: ListClassesParams = {}): Promise<PaginatedClassBatches> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.status) sp.set("status", params.status);
  if (params.courseId) sp.set("courseId", params.courseId);
  if (params.grade?.trim()) sp.set("grade", params.grade.trim());
  if (params.subject?.trim()) sp.set("subject", params.subject.trim());
  if (params.academicYear) sp.set("academicYear", String(params.academicYear));
  if (params.search?.trim()) sp.set("search", params.search.trim());

  const res = await fetch(`${APP_CONFIG.apiUrl}/classes?${sp.toString()}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<PaginatedClassBatches>(res, "Failed to load classes");
}

export async function fetchClassBatchById(classId: string): Promise<ClassBatch> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassBatch>(res, "Failed to load class details");
}

export async function createClassBatch(payload: UpsertClassBatchPayload): Promise<ClassBatch> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassBatch>(res, "Failed to create class");
}

export async function updateClassBatch(
  classId: string,
  payload: Partial<UpsertClassBatchPayload>,
): Promise<ClassBatch> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassBatch>(res, "Failed to update class");
}

export async function archiveClassBatch(classId: string): Promise<ClassBatch> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/archive`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassBatch>(res, "Failed to archive class");
}

export async function duplicateClassBatch(classId: string): Promise<ClassBatch> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassBatch>(res, "Failed to duplicate class");
}

export async function fetchClassSchedules(classId: string): Promise<ClassSchedule[]> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/schedules`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassSchedule[]>(res, "Failed to load schedules");
}

export async function createClassSchedule(
  classId: string,
  payload: UpsertClassSchedulePayload,
): Promise<ClassSchedule> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/schedules`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassSchedule>(res, "Failed to add schedule slot");
}

export async function updateClassSchedule(
  classId: string,
  scheduleId: string,
  payload: Partial<UpsertClassSchedulePayload>,
): Promise<ClassSchedule> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/schedules/${scheduleId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassSchedule>(res, "Failed to update schedule slot");
}

export async function deleteClassSchedule(classId: string, scheduleId: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(res, "Failed to delete schedule slot");
}

export async function fetchMyStudentClasses(): Promise<StudentClassSummary[]> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/students/me/classes`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<StudentClassSummary[]>(res, "Failed to load your classes");
}

export async function fetchMyStudentTimetable(from?: string, to?: string): Promise<StudentTimetableResponse> {
  const sp = new URLSearchParams();
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  const res = await fetch(`${APP_CONFIG.apiUrl}/students/me/timetable?${sp.toString()}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<StudentTimetableResponse>(res, "Failed to load your timetable");
}

// ============================================================================
// PHASE 2 — Invitations, Join by Code, Roster & Enrollment Management
// ============================================================================

export interface CreateClassInvitationPayload {
  label?: string;
  requiresApproval?: boolean;
  expiresInHours?: number;
  expiresAt?: string;
  maxUses?: number | null;
}

export interface ListClassEnrollmentsParams {
  status?: ClassEnrollmentStatus | "";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateClassEnrollmentPayload {
  studentId?: string;
  email?: string;
  status?: "ACTIVE" | "INVITED";
  studentCode?: string;
  note?: string;
}

export interface UpdateClassEnrollmentPayload {
  status?: ClassEnrollmentStatus;
  studentCode?: string | null;
  note?: string | null;
}

export async function createClassInvitation(
  classId: string,
  payload: CreateClassInvitationPayload = {},
): Promise<ClassInvitation> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/invitations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassInvitation>(res, "Failed to generate invitation code");
}

export async function fetchClassInvitations(classId: string): Promise<ClassInvitation[]> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/invitations`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassInvitation[]>(res, "Failed to load class invitations");
}

export async function revokeClassInvitation(
  classId: string,
  invitationId: string,
): Promise<{ id: string; classId: string; codeHint: string; revokedAt: string }> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/invitations/${invitationId}/revoke`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return parseApiResponse(res, "Failed to revoke invitation");
}

export async function joinClassByCode(
  code: string,
): Promise<ClassEnrollmentRecord & { classTitle?: LocalizedText }> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/join`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ code }),
  });
  return parseApiResponse(res, "Failed to join class with invitation code");
}

export async function fetchClassEnrollments(
  classId: string,
  params: ListClassEnrollmentsParams = {},
): Promise<PaginatedClassEnrollments> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.search?.trim()) sp.set("search", params.search.trim());
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));

  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/enrollments?${sp.toString()}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<PaginatedClassEnrollments>(res, "Failed to load student roster");
}

export async function addStudentToClass(
  classId: string,
  payload: CreateClassEnrollmentPayload,
): Promise<ClassEnrollmentRecord> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/enrollments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassEnrollmentRecord>(res, "Failed to add student to class");
}

export async function updateClassEnrollment(
  classId: string,
  enrollmentId: string,
  payload: UpdateClassEnrollmentPayload,
): Promise<ClassEnrollmentRecord> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/enrollments/${enrollmentId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassEnrollmentRecord>(res, "Failed to update student enrollment");
}

export async function respondToMyClassEnrollment(
  classId: string,
  action: "ACCEPT" | "DECLINE" | "LEAVE",
): Promise<{ id: string; status: ClassEnrollmentStatus }> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/students/me/classes/${classId}/respond`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ action }),
  });
  return parseApiResponse(res, "Failed to update your class enrollment");
}

// ============================================================================
// PHASE 3 — Lessons, Protected Resources, Completion Progress & Quiz Reuse
// ============================================================================

export async function fetchClassLearning(classId: string): Promise<ClassLearningResponse> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/learning`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassLearningResponse>(res, "Failed to load class learning content");
}

export interface UpsertLessonPayload {
  title: LocalizedText;
  summary?: LocalizedText | null;
  body?: LocalizedText | null;
  sortOrder?: number;
  status?: LessonStatus;
  publishAt?: string | null;
  estimatedMinutes?: number | null;
}

export async function createModuleLesson(
  moduleId: string,
  payload: UpsertLessonPayload,
): Promise<LessonItem> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/modules/${moduleId}/lessons`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<LessonItem>(res, "Failed to create lesson");
}

export async function updateModuleLesson(
  lessonId: string,
  payload: Partial<UpsertLessonPayload>,
): Promise<LessonItem> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/lessons/${lessonId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<LessonItem>(res, "Failed to update lesson");
}

export async function deleteModuleLesson(lessonId: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/lessons/${lessonId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(res, "Failed to delete lesson");
}

export interface AddLessonResourceInput {
  title: LocalizedText;
  type: LessonResourceType;
  accessPolicy?: LessonResourceAccessPolicy;
  sortOrder?: number;
  externalUrl?: string;
  noteText?: LocalizedText;
  file?: File | null;
}

export async function addLessonResource(
  lessonId: string,
  input: AddLessonResourceInput,
): Promise<LessonResourceItem> {
  const token = getClientCookie("session_token");

  if (input.file) {
    const formData = new FormData();
    formData.append("title", JSON.stringify(input.title));
    formData.append("type", input.type);
    if (input.accessPolicy) formData.append("accessPolicy", input.accessPolicy);
    if (input.sortOrder !== undefined) formData.append("sortOrder", String(input.sortOrder));
    formData.append("file", input.file);

    const res = await fetch(`${APP_CONFIG.apiUrl}/lessons/${lessonId}/resources`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    return parseApiResponse<LessonResourceItem>(res, "Failed to upload lesson resource");
  }

  const res = await fetch(`${APP_CONFIG.apiUrl}/lessons/${lessonId}/resources`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: input.title,
      type: input.type,
      accessPolicy: input.accessPolicy ?? "DOWNLOADABLE",
      sortOrder: input.sortOrder ?? 0,
      externalUrl: input.externalUrl,
      noteText: input.noteText,
    }),
  });
  return parseApiResponse<LessonResourceItem>(res, "Failed to add lesson resource");
}

export async function deleteLessonResource(
  lessonId: string,
  resourceId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/lessons/${lessonId}/resources/${resourceId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(res, "Failed to delete lesson resource");
}

export async function requestResourceAccessUrl(
  lessonId: string,
  resourceId: string,
  classId?: string,
): Promise<ResourceAccessUrlResponse> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/lessons/${lessonId}/resources/${resourceId}/access-url`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ classId }),
    },
  );
  return parseApiResponse<ResourceAccessUrlResponse>(
    res,
    "Unable to authorize access to this resource",
  );
}

/**
 * Fetches a private lesson file using the short-lived user-bound signed token
 * and opens or downloads it via an object URL.
 */
export async function openProtectedLessonResource(
  lessonId: string,
  resourceId: string,
  classId?: string,
): Promise<ResourceAccessUrlResponse> {
  const access = await requestResourceAccessUrl(lessonId, resourceId, classId);

  if (access.streamPath) {
    const token = getClientCookie("session_token");
    const streamRes = await fetch(`${APP_CONFIG.apiUrl}${access.streamPath}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!streamRes.ok) {
      const err = await streamRes.json().catch(() => ({}));
      throw new Error(err?.message || "Access denied to private resource file");
    }
    const blob = await streamRes.blob();
    const blobUrl = URL.createObjectURL(blob);

    if (access.accessPolicy === "DOWNLOADABLE" && access.fileName) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = access.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } else if (access.externalUrl) {
    window.open(access.externalUrl, "_blank", "noopener,noreferrer");
  }

  return access;
}

export async function markLessonProgress(
  lessonId: string,
  classId: string,
  completed: boolean,
): Promise<{ lessonId: string; classId: string; completed: boolean; completedAt: string | null }> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/lessons/${lessonId}/progress`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ classId, completed }),
  });
  return parseApiResponse(res, "Failed to update lesson completion progress");
}

export interface CreateClassQuizAssignmentPayload {
  quizId: string;
  lessonId?: string | null;
  displayTitle?: LocalizedText | null;
  availableFrom?: string | null;
  dueAt?: string | null;
  status?: ClassQuizAssignmentStatus;
}

export async function createClassQuizAssignment(
  classId: string,
  payload: CreateClassQuizAssignmentPayload,
): Promise<ClassQuizAssignmentItem> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/quiz-assignments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassQuizAssignmentItem>(res, "Failed to assign quiz to class");
}

export async function updateClassQuizAssignment(
  classId: string,
  assignmentId: string,
  payload: Partial<CreateClassQuizAssignmentPayload>,
): Promise<ClassQuizAssignmentItem> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/quiz-assignments/${assignmentId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse<ClassQuizAssignmentItem>(res, "Failed to update quiz assignment");
}

export async function deleteClassQuizAssignment(
  classId: string,
  assignmentId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/quiz-assignments/${assignmentId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse<{ deleted: boolean }>(res, "Failed to remove quiz assignment");
}

export async function fetchMyStudentClassQuizzes(): Promise<ClassQuizAssignmentItem[]> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/students/me/class-quizzes`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassQuizAssignmentItem[]>(res, "Failed to load class quizzes");
}

// ============================================================================
// PHASE 4 — Class Sessions, Attendance Marking & Student Attendance History
// ============================================================================

export interface ListClassSessionsParams {
  from?: string;
  to?: string;
  status?: ClassSessionStatus | "";
  autoGenerate?: boolean;
}

export async function fetchClassSessions(
  classId: string,
  params: ListClassSessionsParams = {},
): Promise<ClassSessionsListResponse> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.status) qs.set("status", params.status);
  if (params.autoGenerate !== undefined) qs.set("autoGenerate", String(params.autoGenerate));
  const queryStr = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/sessions${queryStr}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassSessionsListResponse>(res, "Failed to load class sessions");
}

export async function generateClassSessionsFromSchedule(
  classId: string,
  from: string,
  to: string,
): Promise<ClassSessionsListResponse> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/sessions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      generateFromSchedule: true,
      from,
      to,
    }),
  });
  return parseApiResponse<ClassSessionsListResponse>(
    res,
    "Failed to generate sessions from recurring schedule",
  );
}

export interface CreateManualClassSessionPayload {
  startsAtUtc: string;
  endsAtUtc: string;
  localDate?: string;
  timezone?: string;
  title?: LocalizedText | null;
}

export async function createManualClassSession(
  classId: string,
  payload: CreateManualClassSessionPayload,
): Promise<ClassSessionItem> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/sessions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassSessionItem>(res, "Failed to create class session");
}

export interface UpdateClassSessionPayload {
  status?: ClassSessionStatus;
  title?: LocalizedText | null;
  cancellationReason?: string | null;
  startsAtUtc?: string;
  endsAtUtc?: string;
  isLocked?: boolean;
}

export async function updateClassSession(
  classId: string,
  sessionId: string,
  payload: UpdateClassSessionPayload,
): Promise<ClassSessionItem> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/sessions/${sessionId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse<ClassSessionItem>(res, "Failed to update class session");
}

export async function fetchSessionAttendance(
  sessionId: string,
): Promise<SessionAttendanceDetailResponse> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/sessions/${sessionId}/attendance`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<SessionAttendanceDetailResponse>(
    res,
    "Failed to load session attendance roster",
  );
}

export interface SaveSessionAttendancePayload {
  records: {
    studentId: string;
    status: AttendanceStatus;
    note?: string | null;
  }[];
  reason?: string | null;
  markSessionCompleted?: boolean;
}

export async function saveSessionAttendance(
  sessionId: string,
  payload: SaveSessionAttendancePayload,
): Promise<SessionAttendanceDetailResponse> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/sessions/${sessionId}/attendance`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<SessionAttendanceDetailResponse>(
    res,
    "Failed to save session attendance",
  );
}

export async function fetchClassAttendanceSummary(
  classId: string,
  month?: string,
): Promise<ClassAttendanceSummaryResponse> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/attendance${qs}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassAttendanceSummaryResponse>(
    res,
    "Failed to load class attendance summary",
  );
}

export async function downloadClassAttendanceCsv(
  classId: string,
  month?: string,
): Promise<void> {
  const token = getClientCookie("session_token");
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/attendance/export${qs}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to export attendance CSV");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] || `attendance-${classId.slice(0, 8)}-${month ?? "all"}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function fetchMyStudentAttendance(
  classId?: string,
): Promise<StudentAttendanceResponse> {
  const qs = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  const res = await fetch(`${APP_CONFIG.apiUrl}/students/me/attendance${qs}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<StudentAttendanceResponse>(
    res,
    "Failed to load your attendance history",
  );
}

// ============================================================================
// PHASE 5 — Tuition Fee Plans, Student Invoices, Adjustments & Billing Ledger
// ============================================================================

export function formatMoneyMinor(
  amountMinor: number,
  currency = "LKR",
): string {
  const safe = Math.trunc(amountMinor || 0);
  const major = safe / 100;
  try {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

export async function fetchClassFeePlans(
  classId: string,
): Promise<ClassFeePlansResponse> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/fee-plans`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<ClassFeePlansResponse>(
    res,
    "Failed to load class fee plans",
  );
}

export interface CreateClassFeePlanPayload {
  name?: LocalizedText | null;
  amountMinor: number;
  currency?: string;
  frequency?: ClassFeeFrequency;
  dueDay?: number;
  graceDays?: number;
  prorationPolicy?: ClassProrationPolicy;
  overdueAccessPolicy?: ClassOverdueAccessPolicy;
  activeFrom?: string;
  activeTo?: string | null;
}

export async function createClassFeePlan(
  classId: string,
  payload: CreateClassFeePlanPayload,
): Promise<ClassFeePlanItem> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/classes/${classId}/fee-plans`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ClassFeePlanItem>(
    res,
    "Failed to save class fee plan",
  );
}

export async function generateClassInvoices(
  classId: string,
  periodYyyyMm: string,
  notes?: string,
): Promise<ClassBillingLedgerResponse> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/invoices/generate`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ periodYyyyMm, notes }),
    },
  );
  return parseApiResponse<ClassBillingLedgerResponse>(
    res,
    "Failed to generate monthly tuition invoices",
  );
}

export interface ListClassInvoicesParams {
  period?: string;
  status?: TuitionInvoiceStatus | "";
  search?: string;
}

export async function fetchClassBillingLedger(
  classId: string,
  params: ListClassInvoicesParams = {},
): Promise<ClassBillingLedgerResponse> {
  const qs = new URLSearchParams();
  if (params.period) qs.set("period", params.period);
  if (params.status) qs.set("status", params.status);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  const queryStr = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/invoices${queryStr}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse<ClassBillingLedgerResponse>(
    res,
    "Failed to load class billing ledger",
  );
}

export async function downloadClassBillingCsv(
  classId: string,
  params: ListClassInvoicesParams = {},
): Promise<void> {
  const token = getClientCookie("session_token");
  const qs = new URLSearchParams();
  if (params.period) qs.set("period", params.period);
  if (params.status) qs.set("status", params.status);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  const queryStr = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/invoices/export${queryStr}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to export billing CSV");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName =
    match?.[1] ||
    `tuition-ledger-${classId.slice(0, 8)}-${params.period ?? "all"}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function fetchInvoiceById(
  invoiceId: string,
): Promise<TuitionInvoiceItem> {
  const res = await fetch(`${APP_CONFIG.apiUrl}/invoices/${invoiceId}`, {
    headers: getAuthHeaders(),
  });
  return parseApiResponse<TuitionInvoiceItem>(
    res,
    "Failed to load invoice details",
  );
}

export interface CreateInvoiceAdjustmentPayload {
  type: TuitionAdjustmentType;
  amountMinor?: number;
  reason: string;
}

export async function createInvoiceAdjustment(
  invoiceId: string,
  payload: CreateInvoiceAdjustmentPayload,
): Promise<TuitionInvoiceItem> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/invoices/${invoiceId}/adjustments`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse<TuitionInvoiceItem>(
    res,
    "Failed to apply invoice adjustment",
  );
}

export interface RecordInvoicePaymentPayload {
  amountMinor: number;
  channel?: TuitionPaymentChannel;
  status?: TuitionPaymentStatus;
  externalReference?: string;
  notes?: string;
}

export async function recordInvoicePayment(
  invoiceId: string,
  payload: RecordInvoicePaymentPayload,
): Promise<TuitionInvoiceItem> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/invoices/${invoiceId}/payments`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse<TuitionInvoiceItem>(
    res,
    "Failed to record invoice payment",
  );
}

export async function fetchMyStudentInvoices(
  classId?: string,
  period?: string,
): Promise<StudentTuitionInvoicesResponse> {
  const qs = new URLSearchParams();
  if (classId) qs.set("classId", classId);
  if (period) qs.set("period", period);
  const queryStr = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetch(
    `${APP_CONFIG.apiUrl}/students/me/invoices${queryStr}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse<StudentTuitionInvoicesResponse>(
    res,
    "Failed to load your tuition invoices",
  );
}

// ============================================================================
// PHASE 6 — Online Gateway Checkout, Manual Submissions, Refunds & Receipts
// ============================================================================

export interface InitiateInvoiceCheckoutPayload {
  amountMinor?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export async function initiateInvoiceCheckout(
  invoiceId: string,
  payload: InitiateInvoiceCheckoutPayload = {},
): Promise<TuitionCheckoutResponse> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/invoices/${invoiceId}/checkout`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse<TuitionCheckoutResponse>(
    res,
    "Failed to initiate online checkout",
  );
}

export async function fetchPaymentStatus(
  paymentId: string,
): Promise<TuitionPaymentStatusResponse> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/payments/${paymentId}/status`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse<TuitionPaymentStatusResponse>(
    res,
    "Failed to load payment status",
  );
}

export interface SubmitManualTuitionPaymentInput {
  channel?: TuitionPaymentChannel;
  amountMinor: number;
  referenceNumber: string;
  paidDate: string;
  note?: string;
  file?: File | null;
}

export async function submitManualTuitionPayment(
  invoiceId: string,
  input: SubmitManualTuitionPaymentInput,
): Promise<{
  submissionId: string;
  paymentId: string;
  invoiceId: string;
  status: SlipSubmissionStatus;
  paymentStatus: TuitionPaymentStatus;
  amountMinor: number;
  referenceNumber: string;
  invoice: TuitionInvoiceItem;
}> {
  const token = getClientCookie("session_token");

  if (input.file) {
    const formData = new FormData();
    formData.append("channel", input.channel ?? "BANK_TRANSFER");
    formData.append("amountMinor", String(input.amountMinor));
    formData.append("referenceNumber", input.referenceNumber.trim());
    formData.append("paidDate", input.paidDate);
    if (input.note?.trim()) formData.append("note", input.note.trim());
    formData.append("file", input.file);

    const res = await fetch(
      `${APP_CONFIG.apiUrl}/invoices/${invoiceId}/manual-payment-submissions`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      },
    );
    return parseApiResponse(res, "Failed to submit manual payment proof");
  }

  const res = await fetch(
    `${APP_CONFIG.apiUrl}/invoices/${invoiceId}/manual-payment-submissions`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        channel: input.channel ?? "BANK_TRANSFER",
        amountMinor: input.amountMinor,
        referenceNumber: input.referenceNumber.trim(),
        paidDate: input.paidDate,
        note: input.note?.trim() || undefined,
      }),
    },
  );
  return parseApiResponse(res, "Failed to submit manual payment reference");
}

export async function fetchClassManualSubmissions(
  classId: string,
  status?: SlipSubmissionStatus | "",
): Promise<ClassManualSubmissionsListResponse> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/${classId}/manual-payment-submissions${qs}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse<ClassManualSubmissionsListResponse>(
    res,
    "Failed to load manual payment submissions",
  );
}

export async function approveManualSubmission(
  submissionId: string,
  note?: string,
): Promise<{
  submissionId: string;
  paymentId: string;
  status: SlipSubmissionStatus;
  paymentStatus: TuitionPaymentStatus;
  receiptNumber: string;
  invoice: TuitionInvoiceItem;
}> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/manual-payments/${submissionId}/approve`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ note }),
    },
  );
  return parseApiResponse(res, "Failed to approve manual payment submission");
}

export async function rejectManualSubmission(
  submissionId: string,
  reason: string,
): Promise<{
  submissionId: string;
  paymentId: string | null;
  status: SlipSubmissionStatus;
  paymentStatus: TuitionPaymentStatus;
  reviewReason: string;
  invoice: TuitionInvoiceItem;
}> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/manual-payments/${submissionId}/reject`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    },
  );
  return parseApiResponse(res, "Failed to reject manual payment submission");
}

export async function refundTuitionPayment(
  paymentId: string,
  payload: { amountMinor?: number; reason: string; isChargeback?: boolean },
): Promise<{
  paymentId: string;
  status: TuitionPaymentStatus;
  refundedMinor: number;
  invoice: TuitionInvoiceItem;
}> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/payments/${paymentId}/refund`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse(res, "Failed to process tuition refund/chargeback");
}

export async function fetchTuitionReceipt(
  paymentId: string,
): Promise<TuitionReceiptResponse> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/payments/${paymentId}/receipt`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse<TuitionReceiptResponse>(
    res,
    "Failed to load official tuition receipt",
  );
}

export async function openPrintableReceipt(paymentId: string): Promise<void> {
  const receipt = await fetchTuitionReceipt(paymentId);
  const blob = new Blob([receipt.printableHtml], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ============================================================================
// PHASE 7 — Integrated Teacher, Admin & Student Dashboard Summaries
// ============================================================================

export async function fetchClassroomDashboardSummary(params?: {
  teacherUserId?: string;
  period?: string;
}): Promise<import("@/types/classes").ClassroomDashboardSummaryResponse> {
  const qs = new URLSearchParams();
  if (params?.teacherUserId?.trim()) {
    qs.set("teacherUserId", params.teacherUserId.trim());
  }
  if (params?.period?.trim()) {
    qs.set("period", params.period.trim());
  }
  const queryStr = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/classes/dashboard-summary${queryStr}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse(
    res,
    "Failed to load Classroom LMS dashboard summary",
  );
}

export async function fetchStudentDashboardSummary(): Promise<
  import("@/types/classes").StudentDashboardSummaryResponse
> {
  const res = await fetch(
    `${APP_CONFIG.apiUrl}/students/me/dashboard-summary`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseApiResponse(
    res,
    "Failed to load your student Classroom LMS summary",
  );
}





