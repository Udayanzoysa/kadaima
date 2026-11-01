import type { LocalizedText, SupportedLocale } from "./quiz";

export type ClassBatchStatus = "Draft" | "Published" | "Archived";
export type ClassTeacherScope = "OWNER" | "INSTRUCTOR" | "ASSISTANT";
export type ClassLocationType = "ONLINE" | "PHYSICAL" | "HYBRID";
export type ClassEnrollmentStatus = "INVITED" | "PENDING" | "ACTIVE" | "SUSPENDED" | "LEFT" | "REJECTED";

export interface ClassTeacherSummary {
  id: string;
  name: string;
  email: string;
}

export interface ClassCoTeacher {
  id: string;
  teacherId: string;
  permissionScope: ClassTeacherScope;
  teacher: ClassTeacherSummary;
}

export interface ClassSchedule {
  id: string;
  classId: string;
  weekday: number;
  localStartTime: string;
  localEndTime: string;
  timezone: string;
  locationType: ClassLocationType;
  locationValue: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassBatch {
  id: string;
  courseId: string;
  course: {
    id: string;
    title: LocalizedText;
    status: string;
  };
  workspaceId: string | null;
  primaryTeacherId: string;
  primaryTeacher: ClassTeacherSummary;
  coTeachers: ClassCoTeacher[];
  title: LocalizedText;
  description?: LocalizedText | null;
  grade: string | null;
  subject: string | null;
  academicYear: number;
  languages: SupportedLocale[];
  capacity: number | null;
  startDate: string | null;
  endDate: string | null;
  status: ClassBatchStatus;
  schedules: ClassSchedule[];
  activeEnrollmentCount: number;
  scheduleCount: number;
  createdAt: string;
  updatedAt: string;
  myEnrollment?: {
    id: string;
    status: ClassEnrollmentStatus;
    joinedAt: string;
  };
}

export interface PaginatedClassBatches {
  items: ClassBatch[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TimetableOccurrence {
  occurrenceKey: string;
  scheduleId: string;
  classId: string;
  classTitle: LocalizedText;
  courseId: string;
  courseTitle: LocalizedText;
  grade: string | null;
  subject: string | null;
  academicYear: number;
  teacher: ClassTeacherSummary;
  weekday: number;
  localDate: string;
  localStartTime: string;
  localEndTime: string;
  timezone: string;
  startsAtUtc: string;
  endsAtUtc: string;
  locationType: ClassLocationType;
  locationValue: string | null;
}

export interface StudentClassSummary extends ClassBatch {
  enrollment: {
    id: string;
    status: ClassEnrollmentStatus;
    studentCode?: string;
    joinedAt: string;
  };
  nextSession: TimetableOccurrence | null;
}

export interface StudentTimetableResponse {
  from: string;
  to: string;
  occurrences: TimetableOccurrence[];
}

export interface ClassInvitation {
  id: string;
  classId: string;
  /** Returned ONLY once when creating the invitation */
  code?: string;
  codeHint: string;
  label: string | null;
  requiresApproval: boolean;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  revokedAt: string | null;
  createdAt: string;
  createdBy?: ClassTeacherSummary;
}

export interface ClassEnrollmentRecord {
  id: string;
  classId: string;
  studentId: string;
  status: ClassEnrollmentStatus;
  studentCode: string;
  note: string | null;
  joinedAt: string;
  endedAt: string | null;
  approvedAt: string | null;
  approvedBy: ClassTeacherSummary | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    status: string;
  } | null;
}

export interface PaginatedClassEnrollments {
  items: ClassEnrollmentRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  capacity: number | null;
  summary: Record<ClassEnrollmentStatus, number>;
}

// ============================================================================
// PHASE 3 — Lessons, Protected Resources, Completion Progress & Quiz Reuse
// ============================================================================

export type LessonStatus = "Draft" | "Published" | "Scheduled" | "Archived";
export type LessonResourceType =
  | "PDF"
  | "DOCUMENT"
  | "IMAGE"
  | "VIDEO_EMBED"
  | "EXTERNAL_LINK"
  | "TEACHER_NOTE";
export type LessonResourceAccessPolicy = "VIEW_ONLY" | "DOWNLOADABLE";
export type ClassQuizAssignmentStatus = "Draft" | "Published" | "Archived";

export interface LessonResourceItem {
  id: string;
  lessonId: string;
  title: LocalizedText;
  type: LessonResourceType;
  fileName: string | null;
  externalUrl: string | null;
  noteText: LocalizedText | null;
  mimeType: string | null;
  sizeBytes: number | null;
  accessPolicy: LessonResourceAccessPolicy;
  sortOrder: number;
  scanStatus: "CLEAN" | "PENDING" | "QUARANTINED";
  hasPrivateFile: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassQuizAssignmentItem {
  id: string;
  classId: string;
  lessonId: string | null;
  quizId: string;
  displayTitle: LocalizedText;
  availableFrom: string | null;
  dueAt: string | null;
  status: ClassQuizAssignmentStatus;
  availabilityState: "UPCOMING" | "OPEN" | "PAST_DUE";
  classTitle?: LocalizedText;
  quiz: {
    id: string;
    title: LocalizedText;
    description: LocalizedText | null;
    language: SupportedLocale;
    languages: SupportedLocale[];
    durationMinutes: number;
    passingScorePercentage: number;
    maxAttempts: number;
    requiresUnlock: boolean;
    priceLkr: number | null;
    status: string;
  } | null;
  studentAttemptSummary: {
    attemptCount: number;
    bestScore: number | null;
    isPassed: boolean;
    latestAttemptId: string | null;
    latestResultToken: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LessonItem {
  id: string;
  moduleId: string;
  title: LocalizedText;
  summary: LocalizedText | null;
  body: LocalizedText | null;
  sortOrder: number;
  status: LessonStatus;
  publishAt: string | null;
  estimatedMinutes: number | null;
  resources: LessonResourceItem[];
  isCompleted?: boolean;
  completedAt?: string | null;
  quizAssignments?: ClassQuizAssignmentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassLearningModule {
  id: string;
  courseId: string;
  title: LocalizedText;
  description: LocalizedText | null;
  status: string;
  sortOrder: number;
  lessons: LessonItem[];
}

export interface ClassLearningResponse {
  classId: string;
  courseId: string;
  courseTitle: LocalizedText;
  progressSummary: {
    completedLessons: number;
    totalPublishedLessons: number;
    completionPercentage: number;
    continueLessonId: string | null;
  };
  modules: ClassLearningModule[];
  quizAssignments: ClassQuizAssignmentItem[];
}

export interface ResourceAccessUrlResponse {
  resourceId: string;
  type: LessonResourceType;
  accessPolicy: LessonResourceAccessPolicy;
  fileName: string | null;
  mimeType: string | null;
  externalUrl: string | null;
  noteText: LocalizedText | null;
  token: string;
  streamPath: string | null;
  expiresAt: string;
}

// ============================================================================
// PHASE 4 — Class Sessions, Attendance Records & Correction Audit Trail
// ============================================================================

export type ClassSessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED"
  | "UNMARKED";

export interface ComputedAttendanceMetrics {
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
  attended: number;
  eligible: number;
  totalSessions: number;
  attendancePercentage: number | null;
  formulaNote: string;
}

export interface ClassSessionItem {
  id: string;
  classId: string;
  scheduleId: string | null;
  schedule: {
    id: string;
    weekday: number;
    localStartTime: string;
    localEndTime: string;
    locationType: ClassLocationType;
    locationValue: string | null;
  } | null;
  startsAtUtc: string;
  endsAtUtc: string;
  localDate: string;
  timezone: string;
  status: ClassSessionStatus;
  title: LocalizedText | null;
  cancellationReason: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  counts: ComputedAttendanceMetrics;
}

export interface ClassSessionsListResponse {
  classId: string;
  from: string;
  to: string;
  activeStudentCount: number;
  sessions: ClassSessionItem[];
  mode?: "GENERATED";
  generatedCount?: number;
}

export interface SessionAttendanceRosterItem {
  studentId: string;
  name: string;
  email: string;
  studentCode: string | null;
  enrollmentStatus: ClassEnrollmentStatus | "HISTORICAL";
  recordId: string | null;
  status: AttendanceStatus;
  note: string | null;
  markedAt: string | null;
  markedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AttendanceAuditChangeItem {
  id: string;
  attendanceRecordId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  previousStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  reason: string | null;
  changedAt: string;
}

export interface SessionAttendanceDetailResponse {
  session: {
    id: string;
    classId: string;
    classBatch: {
      id: string;
      title: LocalizedText;
      grade: string | null;
      subject: string | null;
    };
    schedule: {
      id: string;
      weekday: number;
      localStartTime: string;
      localEndTime: string;
      locationType: ClassLocationType;
      locationValue: string | null;
    } | null;
    startsAtUtc: string;
    endsAtUtc: string;
    localDate: string;
    timezone: string;
    status: ClassSessionStatus;
    title: LocalizedText | null;
    cancellationReason: string | null;
    isLocked: boolean;
  };
  summary: ComputedAttendanceMetrics;
  roster: SessionAttendanceRosterItem[];
  auditLog: AttendanceAuditChangeItem[];
}

export interface ClassAttendanceStudentSummaryRow extends ComputedAttendanceMetrics {
  studentId: string;
  name: string;
  email: string;
  studentCode: string | null;
  enrollmentStatus: ClassEnrollmentStatus;
  sessionStatuses: Record<string, AttendanceStatus>;
}

export interface ClassAttendanceSummaryResponse {
  classId: string;
  classTitle: LocalizedText;
  month: string | null;
  formulaNote: string;
  totals: {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    studentCount: number;
    averageAttendancePercentage: number | null;
  };
  sessions: {
    id: string;
    localDate: string;
    startsAtUtc: string;
    endsAtUtc: string;
    status: ClassSessionStatus;
    title: LocalizedText | null;
  }[];
  students: ClassAttendanceStudentSummaryRow[];
}

export interface StudentSessionAttendanceHistoryItem {
  sessionId: string;
  localDate: string;
  startsAtUtc: string;
  endsAtUtc: string;
  timezone: string;
  sessionStatus: ClassSessionStatus;
  title: LocalizedText | null;
  cancellationReason: string | null;
  attendanceStatus: AttendanceStatus;
  note: string | null;
  markedAt: string | null;
}

export interface StudentClassAttendanceItem {
  classId: string;
  classTitle: LocalizedText;
  courseTitle: LocalizedText;
  grade: string | null;
  subject: string | null;
  teacherName: string;
  summary: ComputedAttendanceMetrics;
  sessions: StudentSessionAttendanceHistoryItem[];
}

export interface StudentAttendanceResponse {
  studentId: string;
  formulaNote: string;
  overall: ComputedAttendanceMetrics;
  classes: StudentClassAttendanceItem[];
}

// ============================================================================
// PHASE 5 — Tuition Fee Plans, Student Invoices, Adjustments & Billing Ledger
// ============================================================================

export type ClassFeeFrequency = "MONTHLY" | "ONE_TIME";
export type ClassProrationPolicy = "FULL_MONTH" | "PRORATE_BY_DAYS";
export type ClassOverdueAccessPolicy =
  | "ALLOW_WITH_WARNING"
  | "BLOCK_AFTER_GRACE";

export type TuitionInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOIDED"
  | "WAIVED";

export type TuitionAdjustmentType =
  | "DISCOUNT"
  | "WAIVER"
  | "SURCHARGE"
  | "VOID";

export type TuitionPaymentChannel =
  | "ONLINE_GATEWAY"
  | "BANK_TRANSFER"
  | "CASH"
  | "SCHOLARSHIP";

export type TuitionPaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGEBACK";

export interface ClassFeePlanItem {
  id: string;
  classId: string;
  name: LocalizedText | null;
  version: number;
  amountMinor: number;
  currency: string;
  frequency: ClassFeeFrequency;
  dueDay: number;
  graceDays: number;
  prorationPolicy: ClassProrationPolicy;
  overdueAccessPolicy: ClassOverdueAccessPolicy;
  activeFrom: string;
  activeTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassFeePlansResponse {
  classId: string;
  activePlan: ClassFeePlanItem | null;
  history: ClassFeePlanItem[];
}

export interface TuitionInvoiceAdjustmentItem {
  id: string;
  type: TuitionAdjustmentType;
  amountMinor: number;
  reason: string;
  actorName: string | null;
  createdAt: string;
}

export interface TuitionInvoicePaymentAllocationItem {
  allocationId: string;
  paymentId: string;
  allocatedMinor: number;
  grossAmountMinor?: number;
  refundedMinor?: number;
  channel: TuitionPaymentChannel | null;
  gateway?: string | null;
  providerOrderId?: string | null;
  isTestMode?: boolean;
  status: TuitionPaymentStatus | null;
  externalReference: string | null;
  receiptNumber?: string | null;
  receiptId?: string | null;
  confirmedAt: string | null;
  refundedAt?: string | null;
  refundReason?: string | null;
  createdAt: string;
}

export type SlipSubmissionStatus = "Pending" | "Approved" | "Rejected";

export interface TuitionManualSubmissionItem {
  id: string;
  paymentId: string | null;
  invoiceId?: string;
  invoiceNumber?: string | null;
  periodYyyyMm?: string | null;
  invoiceStatus?: TuitionInvoiceStatus | null;
  invoiceBalanceMinor?: number | null;
  studentId?: string;
  studentName?: string;
  studentEmail?: string | null;
  channel: TuitionPaymentChannel;
  amountMinor: number;
  currency?: string;
  referenceNumber: string;
  paidDate: string | null;
  note: string | null;
  hasProofFile?: boolean;
  proofOriginalName?: string | null;
  status: SlipSubmissionStatus;
  reviewReason: string | null;
  reviewedByName?: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface TuitionInvoiceItem {
  id: string;
  classId: string;
  classTitle: LocalizedText | null;
  grade: string | null;
  subject: string | null;
  enrollmentId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  studentCode: string | null;
  feePlanId: string;
  periodYyyyMm: string;
  invoiceNumber: string;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  surchargeMinor: number;
  totalMinor: number;
  paidMinor: number;
  pendingMinor: number;
  balanceMinor: number;
  dueAt: string;
  effectiveDueAt: string;
  graceDays: number;
  status: TuitionInvoiceStatus;
  isOverdue: boolean;
  planSnapshot: Record<string, unknown>;
  notes: string | null;
  issuedAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  adjustments: TuitionInvoiceAdjustmentItem[];
  payments: TuitionInvoicePaymentAllocationItem[];
  manualSubmissions?: TuitionManualSubmissionItem[];
  auditEvents?: {
    id: string;
    action: string;
    previousValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    reason: string | null;
    actorName: string | null;
    createdAt: string;
  }[];
}

export interface ClassBillingLedgerResponse {
  classId: string;
  classTitle: LocalizedText;
  period: string | null;
  currency: string;
  activeFeePlan: ClassFeePlanItem | null;
  createdCount?: number;
  skippedExistingCount?: number;
  summary: {
    totalInvoices: number;
    invoicedTotalMinor: number;
    discountTotalMinor: number;
    paidTotalMinor: number;
    outstandingTotalMinor: number;
    paidCount: number;
    partiallyPaidCount: number;
    unpaidCount: number;
    overdueCount: number;
    waivedCount: number;
    voidedCount: number;
  };
  invoices: TuitionInvoiceItem[];
}

export interface StudentTuitionInvoicesResponse {
  studentId: string;
  currency: string;
  summary: {
    invoiceCount: number;
    totalDueMinor: number;
    totalPaidMinor: number;
    overdueCount: number;
  };
  invoices: TuitionInvoiceItem[];
}

// ============================================================================
// PHASE 6 — Online Gateway Checkout, Manual Submissions, Refunds & Receipts
// ============================================================================

export interface TuitionCheckoutResponse {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  providerOrderId: string;
  gateway: string;
  mode: "LIVE" | "SANDBOX" | "TEST_SIMULATION_EXPLICIT";
  isTestMode: boolean;
  status: TuitionPaymentStatus;
  currency: string;
  amountMinor: number;
  amountFormatted: string;
  testModeNotice: string | null;
  checkoutPayload: {
    actionUrl: string;
    fields: Record<string, string>;
  };
}

export interface TuitionPaymentStatusResponse {
  paymentId: string;
  classId: string;
  payerId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: TuitionInvoiceStatus | null;
  invoiceBalanceMinor: number | null;
  channel: TuitionPaymentChannel;
  gateway: string | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  externalReference: string | null;
  currency: string;
  amountMinor: number;
  allocatedMinor: number;
  refundedMinor: number;
  status: TuitionPaymentStatus;
  isTestMode: boolean;
  confirmedAt: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  manualSubmission: {
    id: string;
    status: SlipSubmissionStatus;
    referenceNumber: string;
    reviewReason: string | null;
  } | null;
  receipt: {
    id: string;
    receiptNumber: string;
    status: string;
    paidAmountMinor: number;
    balanceAfterMinor: number;
    issuedAt: string;
  } | null;
}

export interface ClassManualSubmissionsListResponse {
  classId: string;
  total: number;
  items: TuitionManualSubmissionItem[];
}

export interface TuitionReceiptResponse {
  id: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  classId: string;
  studentId: string;
  currency: string;
  paidAmountMinor: number;
  balanceAfterMinor: number;
  status: string;
  isTestMode: boolean;
  issuedAt: string;
  snapshot: Record<string, unknown>;
  printableHtml: string;
}

// ============================================================================
// PHASE 7 — Integrated Teacher, Admin & Student Dashboard Summaries
// ============================================================================

export interface ClassroomDashboardTodaySession {
  sessionId: string | null;
  classId: string;
  classTitle: LocalizedText;
  localDate: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  rosterCount: number;
  markedCount: number;
  unmarkedCount: number;
  attendancePending: boolean;
}

export interface ClassroomDashboardPendingManualVerification {
  id: string;
  classId: string;
  classTitle: LocalizedText;
  invoiceId: string;
  invoiceNumber: string;
  periodYyyyMm: string;
  channel: TuitionPaymentChannel;
  amountMinor: number;
  currency: string;
  referenceNumber: string;
  paidDate: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ClassroomDashboardAdminGovernance {
  selectedTeacherUserId: string | null;
  teachers: {
    id: string;
    name: string;
    email: string;
    classesCount: number;
    activeClassesCount: number;
    enrolledStudentsCount: number;
  }[];
  failedGatewayEventsCount: number;
  failedGatewayEvents: {
    id: string;
    provider: string;
    externalEventId: string;
    paymentId: string | null;
    status: string;
    errorMessage: string | null;
    receivedAt: string;
    processedAt: string | null;
  }[];
  billingReconciliation: {
    classId: string;
    classTitle: LocalizedText;
    teacherName: string;
    invoiceCount: number;
    paidCount: number;
    overdueCount: number;
    totalBilledMinor: number;
    totalPaidMinor: number;
    totalBalanceMinor: number;
  }[];
  recentAuditEvents: {
    id: string;
    action: string;
    subject: string;
    targetId: string | null;
    description: string | null;
    actorEmail: string;
    actorName: string;
    createdAt: string;
  }[];
}

export interface ClassroomDashboardSummaryResponse {
  isSuperAdmin: boolean;
  scopedTeacherId: string | null;
  periodYyyyMm: string;
  todayLocalDate: string;
  kpis: {
    activeClassesCount: number;
    totalClassesCount: number;
    enrolledStudentsCount: number;
    pendingEnrollmentRequestsCount: number;
    todaysSessionsCount: number;
    attendancePendingCount: number;
    paymentsReceivedThisMonthMinor: number;
    totalBilledThisMonthMinor: number;
    totalDiscountThisMonthMinor: number;
    outstandingInvoicesCount: number;
    outstandingBalanceMinor: number;
    overdueInvoicesCount: number;
    pendingManualVerificationsCount: number;
    currency: string;
  };
  todaysSessions: ClassroomDashboardTodaySession[];
  pendingManualVerifications: ClassroomDashboardPendingManualVerification[];
  classesOverview: (ClassBatch & { nextSession?: TimetableOccurrence | null })[];
  adminGovernance: ClassroomDashboardAdminGovernance | null;
}

export interface StudentDashboardClassItem extends StudentClassSummary {
  learningSummary: {
    completedLessons: number;
    totalPublishedLessons: number;
    completionPercentage: number;
    nextLesson: {
      id: string;
      title: LocalizedText;
    } | null;
  };
  attendanceSummary: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    unmarked: number;
    attended: number;
    eligible: number;
    attendancePercentage: number | null;
    countingPolicy: string;
  };
  quizSummary: {
    totalAssigned: number;
    openCount: number;
    nextQuiz: {
      id: string;
      quizId: string;
      displayTitle: LocalizedText;
      dueAt: string | null;
      availabilityState: string;
    } | null;
    latestAttempt: {
      quizId: string;
      quizTitle: LocalizedText;
      finalScore: number;
      isPassed: boolean;
      resultToken: string | null;
      submittedAt: string | null;
    } | null;
  };
  tuitionSummary: {
    currentPeriodYyyyMm: string;
    currentInvoice: {
      id: string;
      invoiceNumber: string;
      periodYyyyMm: string;
      status: TuitionInvoiceStatus;
      totalMinor: number;
      paidMinor: number;
      balanceMinor: number;
      dueAt: string;
      currency: string;
    } | null;
    totalDueMinor: number;
    currency: string;
  };
}

export interface StudentDashboardInvoiceItem {
  id: string;
  classId: string;
  classTitle: LocalizedText;
  invoiceNumber: string;
  periodYyyyMm: string;
  status: TuitionInvoiceStatus;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  surchargeMinor: number;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  pendingMinor: number;
  dueAt: string;
  paidAt: string | null;
  confirmedPaymentId: string | null;
  receiptNumber: string | null;
}

export interface StudentDashboardSummaryResponse {
  currentPeriodYyyyMm: string;
  kpis: {
    activeClassesCount: number;
    invitedClassesCount: number;
    overallCompletionPercentage: number;
    overallAttendancePercentage: number | null;
    openQuizzesCount: number;
    totalTuitionDueMinor: number;
    totalTuitionPaidMinor: number;
    overdueInvoicesCount: number;
    currency: string;
  };
  classes: StudentDashboardClassItem[];
  upcomingSessions: TimetableOccurrence[];
  invoices: StudentDashboardInvoiceItem[];
}





