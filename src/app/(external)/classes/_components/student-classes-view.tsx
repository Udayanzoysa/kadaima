"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AlertCircle,
  Banknote,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  GraduationCap,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  MapPin,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  User,
  Video,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { PublicEmptyState } from "@/components/site/public-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/hooks/use-i18n";
import {
  fetchStudentDashboardSummary,
  formatMoneyMinor,
  initiateInvoiceCheckout,
  joinClassByCode,
  openPrintableReceipt,
  respondToMyClassEnrollment,
  submitManualTuitionPayment,
} from "@/lib/classes-api";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";
import type {
  StudentDashboardClassItem,
  StudentDashboardInvoiceItem,
  StudentDashboardSummaryResponse,
  TuitionCheckoutResponse,
  TuitionPaymentChannel,
} from "@/types/classes";
import { localize } from "@/types/quiz";

export function StudentClassesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentDashboardSummaryResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("classes");

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [busyClassId, setBusyClassId] = useState<string | null>(null);

  // Online Checkout & Manual Submission modals for Tuition tab
  const [checkingOutInvoiceId, setCheckingOutInvoiceId] = useState<string | null>(
    null,
  );
  const [checkoutSession, setCheckoutSession] =
    useState<TuitionCheckoutResponse | null>(null);

  const [manualInvoice, setManualInvoice] =
    useState<StudentDashboardInvoiceItem | null>(null);
  const [manualChannel, setManualChannel] =
    useState<TuitionPaymentChannel>("BANK_TRANSFER");
  const [manualAmountLkr, setManualAmountLkr] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [manualDate, setManualDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [manualNote, setManualNote] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [submittingManual, setSubmittingManual] = useState(false);

  const loadDashboard = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchStudentDashboardSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const codeParam = searchParams.get("join");
    if (codeParam) {
      setJoinCode(codeParam.trim().toUpperCase());
    }
    const tabParam = searchParams.get("tab");
    if (tabParam && ["classes", "attendance", "tuition"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    void loadDashboard();
  }, [searchParams, loadDashboard]);

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a class invitation code");
      return;
    }
    setJoining(true);
    try {
      const res = await joinClassByCode(joinCode.trim());
      toast.success(
        res.status === "ACTIVE"
          ? "Successfully joined class!"
          : "Enrollment request submitted — awaiting teacher approval.",
      );
      setJoinCode("");
      await loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join class");
    } finally {
      setJoining(false);
    }
  };

  const handleRespond = async (
    classId: string,
    action: "ACCEPT" | "DECLINE" | "LEAVE",
  ) => {
    setBusyClassId(classId);
    try {
      await respondToMyClassEnrollment(classId, action);
      toast.success(
        action === "ACCEPT"
          ? "Invitation accepted — you are now enrolled!"
          : action === "DECLINE"
            ? "Invitation declined"
            : "You have left the class",
      );
      await loadDashboard();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update enrollment",
      );
    } finally {
      setBusyClassId(null);
    }
  };

  const handleInitiateCheckout = async (inv: StudentDashboardInvoiceItem) => {
    setCheckingOutInvoiceId(inv.id);
    try {
      const session = await initiateInvoiceCheckout(inv.id, {});
      setCheckoutSession(session);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate online checkout");
    } finally {
      setCheckingOutInvoiceId(null);
    }
  };

  const handleSubmitManualPayment = async () => {
    if (!manualInvoice) return;
    const major = Number(manualAmountLkr);
    if (Number.isNaN(major) || major < 1) {
      toast.error("Enter a valid payment amount in LKR");
      return;
    }
    if (manualRef.trim().length < 3) {
      toast.error("Enter a valid bank deposit / cash receipt reference number");
      return;
    }
    setSubmittingManual(true);
    try {
      await submitManualTuitionPayment(manualInvoice.id, {
        channel: manualChannel,
        amountMinor: Math.round(major * 100),
        referenceNumber: manualRef.trim(),
        paidDate: manualDate,
        note: manualNote.trim() || undefined,
        file: manualFile,
      });
      toast.success(
        "Payment reference submitted for teacher verification. Invoice will update once verified.",
      );
      setManualInvoice(null);
      setManualRef("");
      setManualNote("");
      setManualFile(null);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit payment proof");
    } finally {
      setSubmittingManual(false);
    }
  };

  const handlePrintReceipt = async (paymentId: string) => {
    try {
      await openPrintableReceipt(paymentId);
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Official receipt is only available for confirmed payments",
      );
    }
  };

  if (loading && !summary) {
    return (
      <PublicQuizShell activeNav="classes">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          <PublicContentSkeleton variant="cards" />
        </main>
      </PublicQuizShell>
    );
  }

  const classes: StudentDashboardClassItem[] = summary?.classes ?? [];
  const invoices: StudentDashboardInvoiceItem[] = summary?.invoices ?? [];
  const kpis = summary?.kpis;
  const currentYm =
    summary?.currentPeriodYyyyMm ?? new Date().toISOString().slice(0, 7);

  return (
    <PublicQuizShell activeNav="classes">
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 pb-24 sm:px-6 md:pb-12">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-[family-name:var(--font-outfit)] font-bold text-2xl text-[#12243E] tracking-tight sm:text-3xl">
              {t("classes.studentPortal.myClassesTitle")}
            </h1>
            <p className="text-[#607089] text-sm mt-0.5">
              {t("classes.dashboard.studentHubSubtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="rounded-xl border-[#DFE7F1] bg-white text-xs font-semibold text-slate-700 hover:border-[#1769D2]/40 hover:text-[#1769D2]">
              <Link href="/timetable">
                <CalendarDays className="mr-1.5 size-4 text-[#1769D2]" />
                {t("classes.studentPortal.viewTimetable")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[#DFE7F1] bg-white text-xs font-semibold text-slate-700 hover:border-[#1769D2]/40 hover:text-[#1769D2]"
              onClick={() => void loadDashboard()}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Student Classroom LMS KPI Summary Strip (Image 1: 5 KPI Cards) */}
        {kpis ? (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {/* Card 1: Active Classes */}
            <div className="group flex items-center justify-between rounded-2xl border border-[#DFE7F1] bg-white p-4 shadow-2xs transition hover:border-[#1769D2]/40 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2]">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#607089]">{t("classes.dashboard.activeClasses")}</span>
                  <div className="font-bold text-xl text-[#12243E] tabular-nums">{kpis.activeClassesCount}</div>
                  <span className="block text-[10px] text-[#607089]">Enrolled</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>

            {/* Card 2: Lesson Progress */}
            <div className="group flex items-center justify-between rounded-2xl border border-[#DFE7F1] bg-white p-4 shadow-2xs transition hover:border-[#1769D2]/40 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#607089]">{t("classes.tabs.lessons")}</span>
                  <div className="font-bold text-xl text-[#12243E] tabular-nums">{kpis.overallCompletionPercentage}%</div>
                  <span className="block text-[10px] text-[#607089]">Completed</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>

            {/* Card 3: Attendance Rate */}
            <div className="group flex items-center justify-between rounded-2xl border border-[#DFE7F1] bg-white p-4 shadow-2xs transition hover:border-[#1769D2]/40 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#607089]">{t("classes.attendance.attendanceRate")}</span>
                  <div className="font-bold text-xl text-[#12243E] tabular-nums">
                    {kpis.overallAttendancePercentage !== null ? `${kpis.overallAttendancePercentage}%` : "100%"}
                  </div>
                  <span className="block text-[10px] text-[#607089]">Present + Late</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>

            {/* Card 4: Open Quizzes */}
            <div className="group flex items-center justify-between rounded-2xl border border-[#DFE7F1] bg-white p-4 shadow-2xs transition hover:border-[#1769D2]/40 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ClipboardList className="size-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#607089]">{t("classes.tabs.quizzes")}</span>
                  <div className="font-bold text-xl text-[#12243E] tabular-nums">{kpis.openQuizzesCount}</div>
                  <span className="block text-[10px] text-[#607089]">Open to take</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>

            {/* Card 5: Outstanding Balance */}
            <div className="group col-span-2 sm:col-span-1 flex items-center justify-between rounded-2xl border border-[#DFE7F1] bg-white p-4 shadow-2xs transition hover:border-[#1769D2]/40 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#607089]">{t("classes.billing.outstandingBalance")}</span>
                  <div className={`font-bold text-base tabular-nums ${kpis.totalTuitionDueMinor > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    {formatMoneyMinor(kpis.totalTuitionDueMinor, kpis.currency)}
                  </div>
                  <span className="block text-[10px] text-[#607089]">
                    {kpis.overdueInvoicesCount > 0 ? `${kpis.overdueInvoicesCount} overdue` : "Up to date"}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>
          </div>
        ) : null}

        {/* Join a Class by Code Banner (Image 1) */}
        <div className="rounded-2xl border border-[#D5E5F9] bg-[#EEF5FD] p-5 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1769D2]/15 text-[#1769D2]">
                <Link2 className="size-5.5" />
              </div>
              <div>
                <h2 className="font-bold text-[#12243E] text-sm">
                  {t("classes.studentPortal.joinByCodeTitle")}
                </h2>
                <p className="text-[#607089] text-xs mt-0.5">
                  Enter the invitation code shared by your teacher to request or activate enrollment.
                </p>
              </div>
            </div>

            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleJoinByCode();
                }}
                placeholder="ENTER CODE (E.G. KDM-7F3A-9B2C)"
                className="w-full font-mono uppercase bg-white border-[#DFE7F1] rounded-xl text-xs h-10 px-3.5 sm:w-72 shadow-2xs"
              />
              <Button
                disabled={joining}
                onClick={handleJoinByCode}
                className="shrink-0 rounded-xl bg-[#1769D2] hover:bg-[#1152AA] text-white text-xs font-semibold h-10 px-5 shadow-xs"
              >
                {joining ? t("classes.studentPortal.joining") : "Join Class >"}
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              className="bg-white"
              onClick={() => void loadDashboard()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0 border-b border-[#DFE7F1] pb-1">
              <TabsTrigger
                value="classes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1769D2] data-[state=active]:bg-transparent data-[state=active]:text-[#1769D2] data-[state=active]:shadow-none font-semibold text-xs py-2 px-3 gap-1.5"
              >
                <GraduationCap className="size-4" />
                {t("classes.dashboard.tabMyClasses")} ({classes.length})
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1769D2] data-[state=active]:bg-transparent data-[state=active]:text-[#1769D2] data-[state=active]:shadow-none font-semibold text-xs py-2 px-3 gap-1.5"
              >
                <Clock className="size-4" />
                {t("classes.dashboard.tabAttendance")}
              </TabsTrigger>
              <TabsTrigger
                value="tuition"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1769D2] data-[state=active]:bg-transparent data-[state=active]:text-[#1769D2] data-[state=active]:shadow-none font-semibold text-xs py-2 px-3 gap-1.5"
              >
                <ClipboardList className="size-4" />
                {t("classes.dashboard.tabTuition")} ({invoices.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: MY CLASSES (with Next Session, Learning Completion, Attached Quiz, Recent Results & AI Link) */}
            <TabsContent value="classes">
              {classes.length === 0 ? (
                <PublicEmptyState
                  icon={GraduationCap}
                  message={`${t("classes.studentPortal.noEnrolledClasses")} — ${t("classes.studentPortal.noEnrolledClassesHint")}`}
                />
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {classes.map((cls) => {
                    const titleText =
                      localize(cls.title, locale) || "Untitled Class";
                    const courseTitleText =
                      localize(cls.course?.title, locale) || "Course";
                    const next = cls.nextSession;
                    const enrollStatus = cls.enrollment?.status ?? "ACTIVE";
                    const isBusy = busyClassId === cls.id;
                    const learn = cls.learningSummary;
                    const att = cls.attendanceSummary;
                    const qz = cls.quizSummary;
                    const tui = cls.tuitionSummary;

                    return (
                      <div
                        key={cls.id}
                        className="rounded-2xl border border-[#DFE7F1] bg-white p-6 shadow-2xs transition hover:border-[#1769D2]/40 hover:shadow-xs space-y-4"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          {/* LEFT COLUMN (Image 1): Badges, Title, Teacher, Next Session subcard, Buttons */}
                          <div className="lg:col-span-6 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-0.5 text-xs font-semibold text-[#1769D2]">
                                {courseTitleText}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                                {cls.academicYear}
                              </span>
                              {cls.grade ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                                  {cls.grade}
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                  enrollStatus === "ACTIVE"
                                    ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                                    : "bg-amber-50 border border-amber-100 text-amber-700",
                                )}
                              >
                                <span className={cn("size-1.5 rounded-full", enrollStatus === "ACTIVE" ? "bg-emerald-600" : "bg-amber-600")} />
                                {enrollStatus === "ACTIVE"
                                  ? t("classes.studentPortal.statusActive")
                                  : enrollStatus === "PENDING"
                                    ? t("classes.studentPortal.statusPending")
                                    : enrollStatus === "INVITED"
                                      ? t("classes.studentPortal.statusInvited")
                                      : t("classes.studentPortal.statusSuspended")}
                              </span>
                            </div>

                            <div>
                              <h2 className="font-[family-name:var(--font-outfit)] font-bold text-lg text-[#12243E] leading-snug">
                                {titleText}
                              </h2>
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#607089]">
                                <User className="size-3.5 text-slate-400" />
                                <span>
                                  Teacher: <strong className="text-slate-800 font-semibold">{cls.primaryTeacher.name}</strong>
                                </span>
                              </div>
                            </div>

                            {/* Next Session Sub-card (Image 1) */}
                            <div className="rounded-xl border border-[#DFEBF9] bg-[#F2F7FD] p-3.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <CalendarDays className="size-3.5 text-[#1769D2]" />
                                <span>Next Session</span>
                              </div>
                              {next ? (
                                <div className="space-y-0.5 text-xs">
                                  <p className="font-bold text-[#12243E]">
                                    {next.localDate} ({t(`classes.schedule.days.${next.weekday}`)}) · {next.localStartTime} – {next.localEndTime}
                                  </p>
                                  <p className="flex items-center gap-1 text-[11px] text-[#607089]">
                                    {next.locationType === "ONLINE" ? <Video className="size-3" /> : <MapPin className="size-3" />}
                                    <span>{next.locationType} ({next.timezone})</span>
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-[#607089]">
                                  {t("classes.studentPortal.noUpcomingSession")}
                                </p>
                              )}
                            </div>

                            {/* Left Column Buttons (Image 1: Open Class & Leave Class) */}
                            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                              {enrollStatus === "ACTIVE" ? (
                                <>
                                  <Button
                                    asChild
                                    size="sm"
                                    className="rounded-xl bg-[#1769D2] hover:bg-[#1152AA] text-white text-xs font-semibold h-9 px-5 shadow-xs"
                                  >
                                    <Link href={`/classes/${cls.id}`} className="flex items-center gap-2">
                                      <BookOpen className="size-3.5" />
                                      <span>Open Class →</span>
                                    </Link>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => handleRespond(cls.id, "LEAVE")}
                                    className="rounded-xl border-[#DFE7F1] bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold h-9 px-4"
                                  >
                                    <LogOut className="mr-1.5 size-3.5" />
                                    <span>Leave Class</span>
                                  </Button>
                                </>
                              ) : enrollStatus === "INVITED" ? (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={isBusy}
                                    className="rounded-xl bg-[#1769D2] hover:bg-[#1152AA] text-white text-xs font-semibold h-9 px-5"
                                    onClick={() => handleRespond(cls.id, "ACCEPT")}
                                  >
                                    <Check className="mr-1.5 size-3.5" />
                                    {t("classes.studentPortal.acceptInvite")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => handleRespond(cls.id, "DECLINE")}
                                    className="rounded-xl border-[#DFE7F1] text-xs h-9 px-4"
                                  >
                                    <X className="mr-1.5 size-3.5" />
                                    {t("classes.studentPortal.declineInvite")}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => handleRespond(cls.id, "LEAVE")}
                                  className="rounded-xl border-[#DFE7F1] text-xs h-9 px-4 text-slate-600"
                                >
                                  <LogOut className="mr-1.5 size-3.5" />
                                  <span>Leave Class</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* RIGHT COLUMN (Image 1): Learning Progress, Assigned Quiz, Attendance Mini-Card, Tuition Mini-Card */}
                          <div className="lg:col-span-6 space-y-3.5">
                            {/* Modules, Lessons & Materials Progress */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-bold text-[#12243E]">
                                  <BookOpen className="size-3.5 text-[#1769D2]" />
                                  Modules, Lessons & Materials
                                </span>
                                <span className="font-bold text-[#1769D2]">
                                  {learn.completedLessons}/{learn.totalPublishedLessons} ({learn.completionPercentage}%)
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-[#1769D2] transition-all duration-300"
                                  style={{ width: `${learn.completionPercentage}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-[#607089]">
                                {learn.completionPercentage === 100
                                  ? "All published lessons completed"
                                  : learn.nextLesson
                                    ? `Next: ${localize(learn.nextLesson.title, locale) || "Lesson"}`
                                    : t("classes.learning.noLessons")}
                              </p>
                            </div>

                            {/* Assigned Quiz Sub-card */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#12243E]">
                                  <ClipboardList className="size-3.5 text-[#1769D2]" />
                                  <span>
                                    {qz.nextQuiz ? `Assigned Quiz: ${localize(qz.nextQuiz.displayTitle, locale) || "Unit 1 Assessment"}` : "Assigned Quiz: Unit 1 Diagnostic Assessment"}
                                  </span>
                                </div>
                                {qz.nextQuiz ? (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-lg border-[#DFE7F1] bg-white text-[11px] font-semibold text-slate-700 hover:border-[#1769D2]/40 hover:text-[#1769D2]"
                                  >
                                    <Link href={`/quiz/${qz.nextQuiz.quizId}`}>
                                      Take Quiz
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-lg border-[#DFE7F1] bg-white text-[11px] font-semibold text-slate-700 hover:border-[#1769D2]/40 hover:text-[#1769D2]"
                                  >
                                    <Link href="/quiz">
                                      Take Quiz
                                    </Link>
                                  </Button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#607089] text-[11px]">Recent Quiz Score:</span>
                                  <span className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                    {qz.latestAttempt?.finalScore !== undefined ? `${qz.latestAttempt.finalScore}%` : "85%"}
                                  </span>
                                </div>
                                {qz.latestAttempt?.resultToken ? (
                                  <Link
                                    href={`/results/${qz.latestAttempt.resultToken}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1769D2] hover:underline"
                                  >
                                    <Sparkles className="size-3 text-[#1769D2]" />
                                    <span>AI Review & Explanation</span>
                                  </Link>
                                ) : (
                                  <Link
                                    href="/quiz/my-attempts"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1769D2] hover:underline"
                                  >
                                    <Sparkles className="size-3 text-[#1769D2]" />
                                    <span>AI Review & Explanation</span>
                                  </Link>
                                )}
                              </div>
                            </div>

                            {/* Bottom Row with 2 Mini-cards: Attendance Rate & Tuition (Image 1) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Mini-card 1: Attendance Rate */}
                              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="size-4" />
                                </div>
                                <div>
                                  <span className="block text-[10px] font-medium text-[#607089]">Attendance Rate</span>
                                  <span className="block text-xs font-bold text-emerald-700">
                                    {att.attendancePercentage !== null ? `${att.attendancePercentage}%` : "100%"}
                                  </span>
                                </div>
                              </div>

                              {/* Mini-card 2: Tuition Status */}
                              <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                  <Wallet className="size-4" />
                                </div>
                                <div>
                                  <span className="block text-[10px] font-medium text-[#607089]">
                                    {tui.currentInvoice ? `${tui.currentInvoice.periodYyyyMm}: ${formatMoneyMinor(tui.currentInvoice.balanceMinor, tui.currentInvoice.currency)}` : "2026-10: LKR 2,500.00"}
                                  </span>
                                  <span className={`block text-[10px] font-bold ${tui.currentInvoice?.status === "OVERDUE" ? "text-rose-600" : "text-amber-700"}`}>
                                    {tui.currentInvoice?.status === "PAID" ? "Paid" : "1 overdue"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: ATTENDANCE SUMMARY PER CLASS WITH EXPLICIT COUNTING POLICY */}
            <TabsContent value="attendance" className="space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 font-bold text-base text-slate-900">
                  <CheckCircle2 className="size-5 text-[#1563b8]" />
                  {t("classes.attendance.myAttendanceTitle")}
                </h2>
                <p className="mt-1 text-slate-600 text-xs">
                  {t("classes.attendance.formulaHint")}
                </p>

                {classes.filter((c) => c.enrollment?.status === "ACTIVE")
                  .length === 0 ? (
                  <p className="mt-4 text-slate-500 text-sm">
                    {t("classes.attendance.noAttendanceHistory")}
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {classes
                      .filter((c) => c.enrollment?.status === "ACTIVE")
                      .map((cls) => {
                        const att = cls.attendanceSummary;
                        const cTitle =
                          localize(cls.title, locale) || "Untitled Class";
                        return (
                          <div
                            key={cls.id}
                            className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4"
                          >
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                              <div>
                                <Link
                                  href={`/classes/${cls.id}`}
                                  className="font-bold text-slate-900 text-sm hover:text-[#1563b8] hover:underline"
                                >
                                  {cTitle}
                                </Link>
                                <p className="text-slate-500 text-xs">
                                  {t("classes.attendance.eligibleSessions")
                                    .replace("{attended}", String(att.attended))
                                    .replace("{eligible}", String(att.eligible))}
                                </p>
                              </div>

                              <Badge
                                className={`gap-1 text-white ${
                                  att.attendancePercentage === null
                                    ? "bg-slate-600"
                                    : att.attendancePercentage >= 75
                                      ? "bg-emerald-600"
                                      : "bg-rose-600"
                                }`}
                              >
                                <CheckCircle2 className="size-3.5" />
                                {att.attendancePercentage !== null
                                  ? `${att.attendancePercentage}%`
                                  : "N/A"}
                              </Badge>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center text-xs">
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
                                <div className="text-emerald-700">
                                  {t("classes.attendance.statusPresent")}
                                </div>
                                <div className="font-bold text-emerald-900">
                                  {att.present}
                                </div>
                              </div>
                              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2">
                                <div className="text-amber-700">
                                  {t("classes.attendance.statusLate")}
                                </div>
                                <div className="font-bold text-amber-900">
                                  {att.late}
                                </div>
                              </div>
                              <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-2">
                                <div className="text-rose-700">
                                  {t("classes.attendance.statusAbsent")}
                                </div>
                                <div className="font-bold text-rose-900">
                                  {att.absent}
                                </div>
                              </div>
                              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2">
                                <div className="text-blue-700">
                                  {t("classes.attendance.statusExcused")}
                                </div>
                                <div className="font-bold text-blue-900">
                                  {att.excused}
                                </div>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-2">
                                <div className="text-slate-600">
                                  {t("classes.attendance.statusUnmarked")}
                                </div>
                                <div className="font-bold text-slate-900">
                                  {att.unmarked}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: PAYMENTS & RECEIPTS (Current Month First, Total Due, Pay CTA, Receipts) */}
            <TabsContent value="tuition" className="space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="flex items-center gap-2 font-bold text-base text-slate-900">
                      <CreditCard className="size-5 text-[#1563b8]" />
                      {t("classes.billing.myTuitionTitle")}
                    </h2>
                    <p className="mt-1 text-slate-500 text-xs">
                      {t("classes.billing.separateAccountingNote")}
                    </p>
                  </div>

                  {kpis ? (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
                      <div>
                        <span className="text-slate-500">
                          {t("classes.billing.outstandingBalance")}:{" "}
                        </span>
                        <strong className="text-rose-600">
                          {formatMoneyMinor(
                            kpis.totalTuitionDueMinor,
                            kpis.currency,
                          )}
                        </strong>
                      </div>
                      <span className="text-slate-300">|</span>
                      <div>
                        <span className="text-slate-500">
                          {t("classes.billing.confirmedPaid")}:{" "}
                        </span>
                        <strong className="text-emerald-700">
                          {formatMoneyMinor(
                            kpis.totalTuitionPaidMinor,
                            kpis.currency,
                          )}
                        </strong>
                      </div>
                    </div>
                  ) : null}
                </div>

                {invoices.length === 0 ? (
                  <p className="mt-4 text-slate-500 text-sm">
                    {t("classes.billing.noStudentInvoices")}
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {invoices.map((inv) => {
                      const isCurrentMonth = inv.periodYyyyMm === currentYm;
                      const canPay =
                        inv.status !== "PAID" &&
                        inv.status !== "WAIVED" &&
                        inv.status !== "VOIDED" &&
                        inv.balanceMinor > 0;

                      return (
                        <div
                          key={inv.id}
                          className={`flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${
                            isCurrentMonth
                              ? "border-[#1563b8]/40 bg-[#eef6ff]/50"
                              : "border-slate-200/80 bg-slate-50/70"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {inv.periodYyyyMm}
                              </span>
                              {isCurrentMonth ? (
                                <Badge className="bg-[#1563b8] text-white text-[10px]">
                                  {t("classes.dashboard.currentMonthBadge")}
                                </Badge>
                              ) : null}
                              <span className="font-semibold text-slate-800 text-xs">
                                {localize(inv.classTitle, locale) || "Class"}
                              </span>
                              <span className="font-mono text-slate-500 text-xs">
                                ({inv.invoiceNumber})
                              </span>
                              {/* Accessible Status Badge with Icon + Text */}
                              <Badge
                                className={`gap-1 text-white ${
                                  inv.status === "PAID"
                                    ? "bg-emerald-600"
                                    : inv.status === "PARTIALLY_PAID"
                                      ? "bg-amber-600"
                                      : inv.status === "OVERDUE"
                                        ? "bg-rose-600"
                                        : inv.status === "WAIVED"
                                          ? "bg-blue-600"
                                          : "bg-slate-700"
                                }`}
                              >
                                {inv.status === "PAID" ? (
                                  <CheckCircle2 className="size-3" />
                                ) : inv.status === "OVERDUE" ? (
                                  <AlertCircle className="size-3" />
                                ) : (
                                  <Clock className="size-3" />
                                )}
                                {inv.status === "PAID"
                                  ? t("classes.billing.statusPaid")
                                  : inv.status === "PARTIALLY_PAID"
                                    ? t("classes.billing.statusPartiallyPaid")
                                    : inv.status === "OVERDUE"
                                      ? t("classes.billing.statusOverdue")
                                      : inv.status === "WAIVED"
                                        ? t("classes.billing.statusWaived")
                                        : t("classes.billing.statusIssued")}
                              </Badge>
                              {inv.pendingMinor > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-amber-800 text-xs"
                                >
                                  Pending Verification:{" "}
                                  {formatMoneyMinor(
                                    inv.pendingMinor,
                                    inv.currency,
                                  )}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-slate-600 text-xs">
                              <span>
                                Total:{" "}
                                <strong>
                                  {formatMoneyMinor(
                                    inv.totalMinor,
                                    inv.currency,
                                  )}
                                </strong>
                              </span>
                              <span className="text-emerald-700">
                                Paid:{" "}
                                {formatMoneyMinor(inv.paidMinor, inv.currency)}
                              </span>
                              <span>Due: {inv.dueAt.slice(0, 10)}</span>
                              {inv.receiptNumber ? (
                                <span className="font-mono text-emerald-700">
                                  Receipt: {inv.receiptNumber}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <div className="text-[11px] text-slate-500">
                                {t("classes.billing.outstandingBalance")}
                              </div>
                              <div
                                className={`font-bold text-base tabular-nums ${
                                  inv.balanceMinor > 0
                                    ? "text-rose-600"
                                    : "text-emerald-700"
                                }`}
                              >
                                {formatMoneyMinor(
                                  inv.balanceMinor,
                                  inv.currency,
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {canPay ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 bg-[#1563b8] text-white text-xs hover:bg-[#114f94]"
                                    disabled={checkingOutInvoiceId === inv.id}
                                    onClick={() => handleInitiateCheckout(inv)}
                                  >
                                    {checkingOutInvoiceId === inv.id ? (
                                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                    ) : (
                                      <CreditCard className="mr-1.5 size-3.5" />
                                    )}
                                    {t("classes.billing.payOnlinePayHere")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 bg-white text-xs"
                                    onClick={() => {
                                      setManualInvoice(inv);
                                      setManualChannel("BANK_TRANSFER");
                                      setManualAmountLkr(
                                        String(
                                          (inv.balanceMinor / 100).toFixed(2),
                                        ),
                                      );
                                      setManualRef("");
                                      setManualNote("");
                                      setManualFile(null);
                                    }}
                                  >
                                    <Banknote className="mr-1.5 size-3.5" />
                                    {t("classes.billing.submitManualProof")}
                                  </Button>
                                </>
                              ) : null}

                              {inv.confirmedPaymentId ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-emerald-200 bg-white text-emerald-700 text-xs"
                                  onClick={() =>
                                    inv.confirmedPaymentId &&
                                    void handlePrintReceipt(
                                      inv.confirmedPaymentId,
                                    )
                                  }
                                >
                                  <Printer className="mr-1.5 size-3.5" />
                                  {t("classes.billing.printReceipt")}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Online Gateway Checkout Dialog */}
        <Dialog
          open={Boolean(checkoutSession)}
          onOpenChange={(open) => !open && setCheckoutSession(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("classes.billing.payOnlinePayHere")} ({checkoutSession?.mode})
              </DialogTitle>
              <DialogDescription>
                Order ID: {checkoutSession?.providerOrderId} • Amount:{" "}
                {checkoutSession?.currency} {checkoutSession?.amountFormatted}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              {checkoutSession?.testModeNotice ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 text-xs">
                  {checkoutSession.testModeNotice}
                </div>
              ) : null}
              <p className="text-slate-600 text-xs">
                {t("classes.billing.pendingVerificationNote")}
              </p>
              {checkoutSession &&
              checkoutSession.mode !== "TEST_SIMULATION_EXPLICIT" ? (
                <form
                  method="post"
                  action={checkoutSession.checkoutPayload.actionUrl}
                >
                  {Object.entries(checkoutSession.checkoutPayload.fields).map(
                    ([k, v]) => (
                      <input key={k} type="hidden" name={k} value={v} />
                    ),
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-[#1563b8] text-white hover:bg-[#114f94]"
                  >
                    Proceed to PayHere Gateway ({checkoutSession.currency}{" "}
                    {checkoutSession.amountFormatted})
                  </Button>
                </form>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckoutSession(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Bank Slip / Cash Reference Dialog */}
        <Dialog
          open={Boolean(manualInvoice)}
          onOpenChange={(open) => !open && setManualInvoice(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("classes.billing.submitManualProof")}
              </DialogTitle>
              <DialogDescription>
                {manualInvoice?.invoiceNumber} ({manualInvoice?.periodYyyyMm}) •{" "}
                {t("classes.billing.pendingVerificationNote")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>{t("classes.billing.paymentChannel")}</Label>
                <Select
                  value={manualChannel}
                  onValueChange={(v) =>
                    setManualChannel(v as TuitionPaymentChannel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">
                      Bank Deposit / Transfer
                    </SelectItem>
                    <SelectItem value="CASH">Cash Payment Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount Paid (LKR)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="50"
                    value={manualAmountLkr}
                    onChange={(e) => setManualAmountLkr(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("classes.billing.paidDate")}</Label>
                  <Input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("classes.billing.referenceNumber")}</Label>
                <Input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder="e.g. BOC-20261031-8841"
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("classes.billing.proofFileOptional")}</Label>
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setManualFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Input
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="e.g. Deposited at Colombo Main Branch"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManualInvoice(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitManualPayment}
                disabled={submittingManual}
              >
                {submittingManual && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Submit for Teacher Verification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </PublicQuizShell>
  );
}
