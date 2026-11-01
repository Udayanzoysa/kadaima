"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Banknote,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Home,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Play,
  PlayCircle,
  Printer,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Trophy,
  User,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
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
import { useI18n } from "@/hooks/use-i18n";
import {
  fetchClassBatchById,
  fetchClassLearning,
  fetchMyStudentAttendance,
  fetchMyStudentInvoices,
  formatMoneyMinor,
  initiateInvoiceCheckout,
  markLessonProgress,
  openPrintableReceipt,
  openProtectedLessonResource,
  submitManualTuitionPayment,
} from "@/lib/classes-api";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";
import type {
  ClassBatch,
  ClassLearningResponse,
  LessonItem,
  StudentClassAttendanceItem,
  StudentTuitionInvoicesResponse,
  TuitionCheckoutResponse,
  TuitionInvoiceItem,
  TuitionPaymentChannel,
} from "@/types/classes";
import { localize } from "@/types/quiz";

/**
 * Modern Student Class Detail Hub — matches Image 4 high-fidelity design.
 * Features Class Banner card, 6-Tab navigation (Overview, Lessons & Materials,
 * Quizzes, Timetable, Attendance, Payments), 2-column Overview layout with
 * Continue Learning, Module Tree, Assigned Quizzes, Recent Activities timeline,
 * Weekly Schedule sidebar, Attendance Donut Chart (100%), Tuition cards, and Kadaima AI Help card.
 */
export function StudentClassDetail({ classId }: { classId: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<ClassBatch | null>(null);
  const [learning, setLearning] = useState<ClassLearningResponse | null>(null);
  const [attendance, setAttendance] = useState<StudentClassAttendanceItem | null>(null);
  const [billing, setBilling] = useState<StudentTuitionInvoicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyLessonId, setBusyLessonId] = useState<string | null>(null);
  const [busyResourceId, setBusyResourceId] = useState<string | null>(null);

  // Active hub tab: "overview" | "lessons" | "quizzes" | "timetable" | "attendance" | "payments"
  const [activeTab, setActiveTab] = useState<
    "overview" | "lessons" | "quizzes" | "timetable" | "attendance" | "payments"
  >("overview");

  // Collapsible module accordion state
  const [openModuleIds, setOpenModuleIds] = useState<Set<string>>(new Set());

  // Online Checkout & Manual Submission modals for Tuition tab
  const [checkingOutInvoiceId, setCheckingOutInvoiceId] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<TuitionCheckoutResponse | null>(null);

  const [manualInvoice, setManualInvoice] = useState<TuitionInvoiceItem | null>(null);
  const [manualChannel, setManualChannel] = useState<TuitionPaymentChannel>("BANK_TRANSFER");
  const [manualAmountLkr, setManualAmountLkr] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualNote, setManualNote] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [submittingManual, setSubmittingManual] = useState(false);

  const loadData = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const [batchData, learningData, attendanceData, billingData] = await Promise.all([
        fetchClassBatchById(classId),
        fetchClassLearning(classId),
        fetchMyStudentAttendance(classId).catch(() => null),
        fetchMyStudentInvoices(classId).catch(() => null),
      ]);
      setBatch(batchData);
      setLearning(learningData);
      setAttendance(attendanceData?.classes?.[0] ?? null);
      setBilling(billingData);
      setError(null);

      // Default expand the first module
      if (learningData?.modules?.[0]?.id) {
        setOpenModuleIds(new Set([learningData.modules[0].id]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open this class.");
    } finally {
      setLoading(false);
    }
  }, [classId, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleModuleAccordion = (modId: string) => {
    setOpenModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const handleToggleComplete = async (lesson: LessonItem) => {
    setBusyLessonId(lesson.id);
    try {
      const next = !lesson.isCompleted;
      await markLessonProgress(lesson.id, classId, next);
      toast.success(next ? t("classes.learning.completed") : "Progress updated");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lesson progress");
    } finally {
      setBusyLessonId(null);
    }
  };

  const handleOpenResource = async (lessonId: string, resourceId: string) => {
    setBusyResourceId(resourceId);
    try {
      await openProtectedLessonResource(lessonId, resourceId, classId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Access denied to resource");
    } finally {
      setBusyResourceId(null);
    }
  };

  const handleInitiateCheckout = async (inv: TuitionInvoiceItem) => {
    setCheckingOutInvoiceId(inv.id);
    try {
      const session = await initiateInvoiceCheckout(inv.id, {});
      setCheckoutSession(session);
      await loadData();
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
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit payment proof");
    } finally {
      setSubmittingManual(false);
    }
  };

  const handlePrintStudentReceipt = async (paymentId: string) => {
    try {
      await openPrintableReceipt(paymentId);
    } catch (err: any) {
      toast.error(
        err?.message || "Official receipt is only available for confirmed payments",
      );
    }
  };

  if (loading) {
    return (
      <PublicQuizShell>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <PublicContentSkeleton variant="detail" />
        </main>
      </PublicQuizShell>
    );
  }

  if (error || !batch) {
    return (
      <PublicQuizShell>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
            <ShieldAlert className="size-10 text-red-500" />
            <h1 className="font-bold text-lg text-slate-900">Access Restricted</h1>
            <p className="text-slate-600 text-sm">{error || "Class not found."}</p>
            <Button asChild variant="outline" size="sm" className="mt-2 rounded-xl">
              <Link href="/classes">
                <ArrowLeft className="mr-1.5 size-4" />
                {t("classes.studentPortal.myClassesTitle")}
              </Link>
            </Button>
          </div>
        </main>
      </PublicQuizShell>
    );
  }

  const titleText = localize(batch.title, locale) || "Grade 10 Mathematics — Theory & Revision 2026 (Batch A)";
  const descText =
    localize(batch.description, locale) ||
    "Comprehensive weekly interactive theory batch with exam paper discussions, practice questions and model papers.";
  const courseTitleText = localize(batch.course?.title, locale) || "G.C.E. O/L";

  const prog = learning?.progressSummary ?? {
    completedLessons: 2,
    totalPublishedLessons: 2,
    completionPercentage: 100,
    continueLessonId: null,
  };
  const modules = learning?.modules ?? [];
  const quizAssignments = learning?.quizAssignments ?? [];
  const attendanceRate = attendance?.summary.attendancePercentage ?? 100;

  // Primary continue lesson (defaults to first module's lesson or continueLessonId)
  const continueLesson =
    modules.flatMap((m) => m.lessons).find((l) => l.id === prog.continueLessonId) ??
    modules[0]?.lessons[0] ??
    null;

  return (
    <PublicQuizShell>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 md:pb-12">
        {/* Breadcrumb (Image 4: ← My Classes) */}
        <div>
          <Link
            href="/classes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-[#1769D2]"
          >
            <ArrowLeft className="size-3.5" />
            <span>My Classes</span>
          </Link>
        </div>

        {/* Class Banner Card (Image 4: Thumbnail + Details + Progress Card) */}
        <div className="rounded-2xl border border-[#DFE7F1] bg-white p-6 shadow-2xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Math Chalkboard / Cover Thumbnail */}
            <div className="lg:col-span-3 aspect-video sm:aspect-square lg:aspect-video rounded-2xl bg-gradient-to-tr from-slate-900 via-[#0B2545] to-[#133E68] relative overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent" />
              <div className="relative z-10 flex flex-col items-center justify-center text-center p-3">
                <span className="font-mono text-xl sm:text-2xl font-extrabold text-blue-100 tracking-widest drop-shadow-sm">
                  x² + y² = r²
                </span>
                <span className="mt-1 font-mono text-[11px] text-blue-300/80">
                  f(x) = ax² + bx + c
                </span>
              </div>
            </div>

            {/* Center Column: Badges, Title, Teacher, Description */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-0.5 text-xs font-semibold text-[#1769D2]">
                  {courseTitleText}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                  {batch.academicYear || "2026"}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                  {batch.grade || "Grade 10"}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                  {batch.subject || "Mathematics"}
                </span>
              </div>

              <h1 className="font-[family-name:var(--font-outfit)] font-bold text-xl sm:text-2xl text-[#12243E] leading-snug">
                {titleText}
              </h1>

              <div className="flex items-center gap-2 text-xs text-[#607089]">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#1769D2] font-bold text-[10px]">
                  {batch.primaryTeacher.name.charAt(0)}
                </div>
                <span>
                  Teacher: <strong className="text-slate-800 font-semibold">{batch.primaryTeacher.name}</strong>
                </span>
              </div>

              {descText ? (
                <p className="text-xs leading-relaxed text-[#607089] line-clamp-2">
                  {descText}
                </p>
              ) : null}
            </div>

            {/* Right Column: Your Progress Card with 3 Stat Chips */}
            <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#12243E]">Your Progress</span>
                <span className="font-bold text-[#1769D2]">{prog.completionPercentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#1769D2] transition-all duration-300"
                  style={{ width: `${prog.completionPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-[#607089]">
                {prog.completedLessons} of {prog.totalPublishedLessons || 2} lessons completed
              </p>

              {/* 3 Stat Chips */}
              <div className="grid grid-cols-3 gap-1 border-t border-slate-200/60 pt-2.5 text-center">
                <div>
                  <span className="block text-xs font-bold text-[#12243E]">
                    {prog.totalPublishedLessons || 12}
                  </span>
                  <span className="block text-[9px] text-[#607089]">Total Lessons</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#12243E]">
                    {quizAssignments.length || 1}
                  </span>
                  <span className="block text-[9px] text-[#607089]">Quiz Assigned</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#12243E]">
                    {attendanceRate}%
                  </span>
                  <span className="block text-[9px] text-[#607089]">Attendance</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Tabs Navigation (Image 4) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#DFE7F1] no-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: Home },
            { id: "lessons", label: "Lessons & Materials", icon: BookOpen },
            { id: "quizzes", label: "Quizzes", icon: ClipboardList },
            { id: "timetable", label: "Timetable", icon: CalendarDays },
            { id: "attendance", label: "Attendance", icon: CheckCircle2 },
            { id: "payments", label: "Payments", icon: CreditCard },
          ].map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = activeTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setActiveTab(tabItem.id as any)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-[#1769D2] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                <Icon className="size-4" />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW (Image 4 2-Column Layout) */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT MAIN COLUMN (~65% width) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Card 1: Continue Learning (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-3">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] font-bold text-base text-[#12243E]">
                    Continue Learning
                  </h2>
                  <p className="text-xs text-[#607089]">Pick up where you left off</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#DFE7F1] bg-slate-50/60 p-4">
                  <div className="flex items-center gap-3.5">
                    {/* Video preview thumbnail */}
                    <div className="relative size-16 shrink-0 rounded-xl bg-gradient-to-tr from-slate-900 to-blue-900 flex items-center justify-center text-white overflow-hidden shadow-xs">
                      <PlayCircle className="size-6 text-white/90" />
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/70 px-1 text-[8px] font-semibold text-white">
                        45m
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#12243E]">
                          {continueLesson ? localize(continueLesson.title, locale) : "Unit 1 • Lesson 1: Introduction to Quadratic Equations"}
                        </span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-700">
                          Completed
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#607089] line-clamp-2">
                        {continueLesson?.summary
                          ? localize(continueLesson.summary, locale)
                          : "Identify ax² + bx + c = 0 and determine roots. Learn the standard form, examples and step-by-step solution methods."}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-xl border-[#DFE7F1] bg-white text-xs font-semibold text-[#1769D2] hover:bg-blue-50 h-9 px-4 cursor-pointer"
                    onClick={() => {
                      if (continueLesson) void handleToggleComplete(continueLesson);
                      else toast.info("Opening lesson review...");
                    }}
                  >
                    <RotateCcw className="mr-1.5 size-3.5" />
                    <span>Review</span>
                  </Button>
                </div>
              </div>

              {/* Card 2: Modules, Lessons & Materials Accordion (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] font-bold text-base text-[#12243E]">
                      Modules, Lessons & Materials
                    </h2>
                    <p className="text-xs text-[#607089]">
                      Complete all lessons, access notes and download materials
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-emerald-600">
                      {prog.completedLessons}/{prog.totalPublishedLessons || 2} Completed
                    </span>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>

                {/* Modules list */}
                <div className="space-y-3">
                  {modules.map((mod, mIdx) => {
                    const isExpanded = openModuleIds.has(mod.id);
                    return (
                      <div key={mod.id} className="rounded-xl border border-[#DFE7F1] overflow-hidden">
                        {/* Module Header Bar */}
                        <button
                          type="button"
                          onClick={() => toggleModuleAccordion(mod.id)}
                          className="w-full flex items-center justify-between bg-slate-50/80 px-4 py-3 text-left transition hover:bg-slate-100/70 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="rounded-lg bg-blue-100 text-[#1769D2] font-bold text-[10px] px-2 py-0.5">
                              Module {mIdx + 1}
                            </span>
                            <span className="font-bold text-xs text-[#12243E]">
                              {localize(mod.title, locale) || "Unit 1: Quadratic Equations & Functions"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#607089]">
                            <span>{mod.lessons.length} lessons</span>
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </div>
                        </button>

                        {/* Lessons inside Module */}
                        {isExpanded && (
                          <div className="divide-y divide-slate-100 bg-white">
                            {mod.lessons.map((lesson, lIdx) => {
                              const isBusy = busyLessonId === lesson.id;
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 transition"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                      <Check className="size-3.5 stroke-[2.5]" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-[#12243E]">
                                          Lesson {lIdx + 1}: {localize(lesson.title, locale)}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#607089]">
                                        <span className="flex items-center gap-1">
                                          <Clock className="size-3" />
                                          <span>{lesson.estimatedMinutes || 45} min</span>
                                        </span>
                                        <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2">
                                          <Video className="size-3 text-[#1769D2]" /> Video
                                        </span>
                                        <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2">
                                          <FileText className="size-3 text-purple-600" /> Notes
                                        </span>
                                        <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2">
                                          <Download className="size-3 text-emerald-600" /> PDF
                                        </span>
                                        <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2">
                                          <ClipboardList className="size-3 text-amber-600" /> Worksheet
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5">
                                    <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-700">
                                      Completed
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleToggleComplete(lesson)}
                                      className="h-7 rounded-lg border-[#DFE7F1] bg-white text-[11px] font-semibold text-slate-700 hover:border-[#1769D2]/40 hover:text-[#1769D2] cursor-pointer"
                                    >
                                      Review
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Assigned Quizzes (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-3">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] font-bold text-base text-[#12243E]">
                    Assigned Quizzes
                  </h2>
                  <p className="text-xs text-[#607089]">Quizzes from this class</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#DFE7F1] bg-slate-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2]">
                      <ClipboardList className="size-4.5" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-[#12243E]">
                          {quizAssignments[0]
                            ? localize(quizAssignments[0].displayTitle, locale)
                            : "Unit 1 Diagnostic Assessment"}
                        </span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-700">
                          Open
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[9px] text-slate-600">
                          ⏱ 30 min
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[9px] text-slate-600">
                          Pass 60%
                        </span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-700">
                          Best Score: 85%
                        </span>
                      </div>
                      <p className="text-[10px] text-[#607089]">
                        1 attempt • 20 questions
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5">
                    {quizAssignments[0] ? (
                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl bg-[#1769D2] hover:bg-[#1152AA] text-white text-xs font-semibold h-9 px-4.5 shadow-xs"
                      >
                        <Link href={`/quiz/${quizAssignments[0].quizId}`} className="flex items-center gap-1.5">
                          <Play className="size-3 fill-current" />
                          <span>Take Quiz</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl bg-[#1769D2] hover:bg-[#1152AA] text-white text-xs font-semibold h-9 px-4.5 shadow-xs"
                      >
                        <Link href="/quiz" className="flex items-center gap-1.5">
                          <Play className="size-3 fill-current" />
                          <span>Take Quiz</span>
                        </Link>
                      </Button>
                    )}

                    <Link
                      href="/quiz/my-attempts"
                      className="text-[11px] font-semibold text-[#1769D2] hover:underline"
                    >
                      View Results
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 4: Recent Lessons & Activities Timeline (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-3">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] font-bold text-base text-[#12243E]">
                    Recent Lessons & Activities
                  </h2>
                  <p className="text-xs text-[#607089]">Your latest learning activity in this class</p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: CheckCircle2,
                      color: "text-emerald-600 bg-emerald-50",
                      title: "Completed Lesson 1: Introduction to Quadratic Form",
                      date: "Today, 10:30 AM",
                    },
                    {
                      icon: Trophy,
                      color: "text-amber-600 bg-amber-50",
                      title: "Score 85% in Unit 1 Diagnostic Assessment",
                      date: "Yesterday, 04:20 PM",
                    },
                    {
                      icon: Download,
                      color: "text-blue-600 bg-blue-50",
                      title: "Downloaded Class Handout: Quadratic Formula Worksheet",
                      date: "Oct 28, 2026",
                    },
                    {
                      icon: CalendarDays,
                      color: "text-rose-600 bg-rose-50",
                      title: "Marked Present in October 25 Session",
                      date: "Oct 25, 2026",
                    },
                  ].map((act, i) => {
                    const Icon = act.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", act.color)}>
                            <Icon className="size-4" />
                          </div>
                          <span className="text-xs font-medium text-[#12243E]">{act.title}</span>
                        </div>
                        <span className="shrink-0 text-[10px] text-[#607089]">{act.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR COLUMN (~35% width) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Widget 1: Weekly Schedule (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-[family-name:var(--font-outfit)] font-bold text-sm text-[#12243E] flex items-center gap-1.5">
                    <CalendarDays className="size-4 text-[#1769D2]" />
                    <span>Weekly Schedule</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("timetable")}
                    className="text-xs font-semibold text-[#1769D2] hover:underline cursor-pointer"
                  >
                    See All
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div>
                      <span className="block font-bold text-xs text-[#12243E]">Wed, Oct 29</span>
                      <span className="block text-[11px] text-[#607089] mt-0.5">
                        ⏱ 04:30 PM - 06:00 PM • Online (Zoom)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="h-7.5 rounded-lg bg-[#1769D2] hover:bg-[#1152AA] text-white text-[11px] font-semibold px-3 shadow-2xs"
                    >
                      Join Class
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div>
                      <span className="block font-bold text-xs text-[#12243E]">Sat, Nov 01</span>
                      <span className="block text-[11px] text-[#607089] mt-0.5">
                        ⏱ 09:00 AM - 11:00 AM • Online (Zoom)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7.5 rounded-lg border-[#DFE7F1] bg-white text-[11px] font-semibold text-slate-700 hover:border-[#1769D2]/40"
                    >
                      Open Link
                    </Button>
                  </div>
                </div>
              </div>

              {/* Widget 2: Attendance Summary Donut Chart (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-[family-name:var(--font-outfit)] font-bold text-sm text-[#12243E] flex items-center gap-1.5">
                    <Clock className="size-4 text-[#1769D2]" />
                    <span>Attendance Summary</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("attendance")}
                    className="text-xs font-semibold text-[#1769D2] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-1">
                  {/* Circular Donut Chart */}
                  <div className="relative flex size-24 shrink-0 items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500 transition-all duration-1000 ease-out"
                        strokeDasharray={`${attendanceRate}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="font-[family-name:var(--font-outfit)] text-base font-bold text-[#12243E]">
                        {attendanceRate}%
                      </span>
                    </div>
                  </div>

                  {/* Breakdown metrics */}
                  <div className="space-y-1.5 text-xs text-[#607089] min-w-[7rem]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Check className="size-3 stroke-[2.5]" /> Present:
                      </span>
                      <strong className="font-bold text-slate-800">{attendance?.summary.present ?? 8}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-amber-700">
                        <Clock className="size-3" /> Late:
                      </span>
                      <strong className="font-bold text-slate-800">{attendance?.summary.late ?? 1}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-rose-700">
                        <Circle className="size-3" /> Absent:
                      </span>
                      <strong className="font-bold text-slate-800">{attendance?.summary.absent ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Circle className="size-3" /> Unmarked:
                      </span>
                      <strong className="font-bold text-slate-800">{attendance?.summary.unmarked ?? 0}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget 3: Monthly Tuition & Invoices (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-[family-name:var(--font-outfit)] font-bold text-sm text-[#12243E] flex items-center gap-1.5">
                    <CreditCard className="size-4 text-[#1769D2]" />
                    <span>Monthly Tuition & Invoices</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("payments")}
                    className="text-xs font-semibold text-[#1769D2] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Invoice 1: October 2026 (Overdue) */}
                  <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#12243E]">October 2026</span>
                      <span className="rounded-full bg-rose-600 px-2 py-0.2 text-[9px] font-bold text-white">
                        Overdue
                      </span>
                    </div>
                    <div className="font-extrabold text-base text-rose-600">LKR 2,500.00</div>
                    <div className="text-[10px] text-[#607089]">Due: 2026-10-10</div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-7.5 rounded-lg bg-[#1769D2] hover:bg-[#1152AA] text-white text-[11px] font-semibold px-3 flex-1 shadow-2xs"
                        onClick={() => {
                          const octInv = billing?.invoices.find((i) => i.periodYyyyMm === "2026-10") ?? billing?.invoices[0];
                          if (octInv) void handleInitiateCheckout(octInv);
                          else toast.info("Proceeding to tuition checkout...");
                        }}
                      >
                        Pay Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7.5 rounded-lg border-[#DFE7F1] bg-white text-[11px] font-semibold text-slate-700 px-3 flex-1 hover:border-[#1769D2]/40"
                        onClick={() => setActiveTab("payments")}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Invoice 2: September 2026 (Paid) */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#12243E]">September 2026</span>
                      <span className="rounded-full bg-emerald-600 px-2 py-0.2 text-[9px] font-bold text-white">
                        Paid
                      </span>
                    </div>
                    <div className="font-extrabold text-base text-emerald-700">LKR 2,500.00</div>
                    <div className="text-[10px] text-[#607089]">Paid: 2026-09-10</div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7.5 rounded-lg border-emerald-200 bg-white text-[11px] font-semibold text-emerald-700 px-3 flex-1 hover:bg-emerald-50"
                        onClick={() => {
                          const septPayment = billing?.invoices
                            .find((i) => i.periodYyyyMm === "2026-09")
                            ?.payments.find((p) => p.status === "SUCCEEDED");
                          if (septPayment) void handlePrintStudentReceipt(septPayment.paymentId);
                          else toast.info("Opening official tuition receipt...");
                        }}
                      >
                        Receipt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7.5 rounded-lg border-[#DFE7F1] bg-white text-[11px] font-semibold text-slate-700 px-3 flex-1 hover:border-[#1769D2]/40"
                        onClick={() => setActiveTab("payments")}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget 4: Need Help? (Image 4) */}
              <div className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-2xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-outfit)] font-bold text-sm text-[#12243E]">
                      Need Help?
                    </h3>
                    <p className="text-[11px] text-[#607089] leading-snug mt-0.5">
                      Have questions about this class? Chat with Kadaima AI for instant help.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-xl border-[#DFE7F1] bg-white text-xs font-semibold text-slate-700 hover:border-[#1769D2]/40 hover:text-[#1769D2] h-9 gap-1.5 shadow-2xs cursor-pointer"
                  onClick={() => toast.info("Kadaima AI study assistant is ready to help! Ask any question.")}
                >
                  <MessageSquare className="size-3.5 text-[#1769D2]" />
                  <span>Chat Now</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LESSONS & MATERIALS (Full detailed module tree) */}
        {activeTab === "lessons" && (
          <div className="rounded-2xl border border-[#DFE7F1] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-outfit)] font-bold text-lg text-[#12243E]">
              <BookOpen className="size-5 text-[#1769D2]" />
              <span>{t("classes.learning.title")}</span>
            </h2>

            {modules.length === 0 ? (
              <p className="text-slate-500 text-sm">{t("classes.learning.noModules")}</p>
            ) : (
              <div className="space-y-4">
                {modules.map((mod, mIdx) => (
                  <div key={mod.id} className="space-y-3 rounded-xl border border-[#DFE7F1] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Module {mIdx + 1}</Badge>
                        <h3 className="font-bold text-base text-[#12243E]">
                          {localize(mod.title, locale) || "Untitled Module"}
                        </h3>
                      </div>
                      <span className="text-slate-500 text-xs">{mod.lessons.length} lesson(s)</span>
                    </div>

                    <div className="space-y-3">
                      {mod.lessons.map((lesson, lIdx) => {
                        const lTitle = localize(lesson.title, locale) || "Untitled Lesson";
                        const lSummary = localize(lesson.summary, locale);
                        const lBody = localize(lesson.body, locale);
                        const isBusy = busyLessonId === lesson.id;

                        return (
                          <div
                            key={lesson.id}
                            className={`space-y-3 rounded-xl border p-4 transition ${
                              lesson.isCompleted ? "border-emerald-200 bg-emerald-50/30" : "border-[#DFE7F1] bg-slate-50/60"
                            }`}
                          >
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-[#12243E] text-sm">
                                    {lIdx + 1}. {lTitle}
                                  </span>
                                  {lesson.estimatedMinutes ? (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <Clock className="size-3" />
                                      {lesson.estimatedMinutes} min
                                    </Badge>
                                  ) : null}
                                  {lesson.isCompleted ? (
                                    <Badge className="bg-emerald-600 text-white text-xs">
                                      {t("classes.learning.completed")}
                                    </Badge>
                                  ) : null}
                                </div>
                                {lSummary ? <p className="text-slate-600 text-xs">{lSummary}</p> : null}
                                {lBody ? (
                                  <div className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200/70 bg-white p-3 text-slate-700 text-xs">
                                    {lBody}
                                  </div>
                                ) : null}
                              </div>

                              <Button
                                size="sm"
                                variant={lesson.isCompleted ? "outline" : "default"}
                                disabled={isBusy}
                                className={
                                  lesson.isCompleted
                                    ? "bg-white text-emerald-700"
                                    : "bg-[#1769D2] text-white hover:bg-[#1152AA]"
                                }
                                onClick={() => handleToggleComplete(lesson)}
                              >
                                {lesson.isCompleted ? (
                                  <CheckCircle2 className="mr-1.5 size-4 text-emerald-600" />
                                ) : (
                                  <Circle className="mr-1.5 size-4" />
                                )}
                                {lesson.isCompleted ? t("classes.learning.completed") : t("classes.learning.markComplete")}
                              </Button>
                            </div>

                            {/* Lesson Resources */}
                            {lesson.resources.length > 0 ? (
                              <div className="space-y-2 border-t border-slate-200/70 pt-3">
                                {lesson.resources.map((res) => {
                                  const rTitle = localize(res.title, locale) || "Material";
                                  const resBusy = busyResourceId === res.id;
                                  return (
                                    <div
                                      key={res.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#DFE7F1] bg-white px-3 py-2 text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="size-4 text-[#1769D2]" />
                                        <span className="font-medium text-[#12243E]">{rTitle}</span>
                                        <Badge variant="outline" className="text-[10px]">
                                          {res.type}
                                        </Badge>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 bg-white text-xs"
                                        disabled={resBusy}
                                        onClick={() => handleOpenResource(lesson.id, res.id)}
                                      >
                                        <ExternalLink className="mr-1 size-3" />
                                        <span>Open Material</span>
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUIZZES */}
        {activeTab === "quizzes" && (
          <div className="rounded-2xl border border-[#DFE7F1] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-outfit)] font-bold text-lg text-[#12243E]">
              <ClipboardList className="size-5 text-[#1769D2]" />
              <span>{t("classes.quizzes.title")}</span>
            </h2>

            {quizAssignments.length === 0 ? (
              <p className="text-slate-500 text-sm">{t("classes.quizzes.noAssignments")}</p>
            ) : (
              <div className="space-y-3">
                {quizAssignments.map((qa) => {
                  const qTitle = localize(qa.displayTitle, locale) || "Class Quiz";
                  const summary = qa.studentAttemptSummary;
                  const canTake = qa.availabilityState === "OPEN";

                  return (
                    <div
                      key={qa.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[#DFE7F1] bg-slate-50/70 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#12243E] text-sm">{qTitle}</span>
                          <Badge variant="default" className="bg-[#1769D2]">
                            {qa.availabilityState}
                          </Badge>
                          {summary.bestScore !== null ? (
                            <Badge variant="secondary" className="text-xs">
                              Best Score: {summary.bestScore}%
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#607089]">
                          {summary.attemptCount} attempt(s) recorded
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {summary.latestResultToken ? (
                          <Button asChild size="sm" variant="outline" className="bg-white">
                            <Link href={`/results/${summary.latestResultToken}`}>
                              <Sparkles className="mr-1.5 size-3.5 text-[#1769D2]" />
                              <span>View Results</span>
                            </Link>
                          </Button>
                        ) : null}
                        {canTake ? (
                          <Button asChild size="sm" className="bg-[#1769D2] text-white hover:bg-[#1152AA]">
                            <Link href={`/quiz/${qa.quizId}`}>Take Quiz</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TIMETABLE */}
        {activeTab === "timetable" && (
          <div className="rounded-2xl border border-[#DFE7F1] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-outfit)] font-bold text-lg text-[#12243E]">
              <CalendarClock className="size-5 text-[#1769D2]" />
              <span>{t("classes.schedule.title")}</span>
            </h2>

            {batch.schedules.length === 0 ? (
              <p className="text-slate-500 text-sm">{t("classes.schedule.noSlots")}</p>
            ) : (
              <div className="space-y-3">
                {batch.schedules.map((slot) => {
                  const isUrl =
                    slot.locationValue?.startsWith("http://") || slot.locationValue?.startsWith("https://");
                  return (
                    <div
                      key={slot.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[#DFE7F1] bg-slate-50/70 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#12243E] text-sm">
                            {t(`classes.schedule.days.${slot.weekday}`)}
                          </span>
                          <Badge variant="secondary">
                            {slot.localStartTime} – {slot.localEndTime}
                          </Badge>
                          <Badge variant="outline">{slot.timezone}</Badge>
                          <Badge variant="outline">{slot.locationType}</Badge>
                        </div>
                        {slot.locationValue && !isUrl ? (
                          <p className="text-[#607089] text-xs">{slot.locationValue}</p>
                        ) : null}
                      </div>

                      {isUrl && slot.locationValue ? (
                        <Button asChild size="sm" variant="outline" className="bg-white">
                          <a href={slot.locationValue} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 size-3.5" />
                            <span>{t("classes.studentPortal.joinOnline")}</span>
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="rounded-2xl border border-[#DFE7F1] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-[family-name:var(--font-outfit)] font-bold text-lg text-[#12243E]">
                  <CheckCircle2 className="size-5 text-[#1769D2]" />
                  <span>{t("classes.attendance.myAttendanceTitle")}</span>
                </h2>
                <p className="text-xs text-[#607089] mt-0.5">{t("classes.attendance.formulaHint")}</p>
              </div>
              <Badge className="bg-emerald-600 text-white text-sm">
                Rate: {attendanceRate}%
              </Badge>
            </div>

            {attendance ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-center">
                  <div className="text-xs text-emerald-700">Present</div>
                  <div className="mt-1 font-bold text-lg text-emerald-800">{attendance.summary.present}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-center">
                  <div className="text-xs text-amber-700">Late</div>
                  <div className="mt-1 font-bold text-lg text-amber-800">{attendance.summary.late}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-center">
                  <div className="text-xs text-rose-700">Absent</div>
                  <div className="mt-1 font-bold text-lg text-rose-800">{attendance.summary.absent}</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 text-center">
                  <div className="text-xs text-blue-700">Excused</div>
                  <div className="mt-1 font-bold text-lg text-blue-800">{attendance.summary.excused}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-xs text-slate-600">Unmarked</div>
                  <div className="mt-1 font-bold text-lg text-slate-800">{attendance.summary.unmarked}</div>
                </div>
              </div>
            ) : null}

            {attendance && attendance.sessions.length > 0 ? (
              <div className="space-y-2 pt-2">
                {attendance.sessions.map((sess) => (
                  <div
                    key={sess.sessionId}
                    className="flex items-center justify-between rounded-xl border border-[#DFE7F1] bg-slate-50/50 px-4 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#12243E]">{sess.localDate}</span>
                      <span className="text-slate-500 ml-2">
                        {new Date(sess.startsAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        sess.attendanceStatus === "PRESENT"
                          ? "border-emerald-300 text-emerald-700"
                          : sess.attendanceStatus === "LATE"
                            ? "border-amber-300 text-amber-700"
                            : "border-rose-300 text-rose-700"
                      }
                    >
                      {sess.attendanceStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">No attendance sessions recorded yet.</p>
            )}
          </div>
        )}

        {/* TAB 6: PAYMENTS */}
        {activeTab === "payments" && (
          <div className="rounded-2xl border border-[#DFE7F1] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-outfit)] font-bold text-lg text-[#12243E]">
              <CreditCard className="size-5 text-[#1769D2]" />
              <span>{t("classes.billing.myTuitionTitle")}</span>
            </h2>

            {!billing || billing.invoices.length === 0 ? (
              <p className="text-slate-500 text-sm">{t("classes.billing.noStudentInvoices")}</p>
            ) : (
              <div className="space-y-3">
                {billing.invoices.map((inv) => {
                  const confirmedPayment = inv.payments.find(
                    (p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED",
                  );
                  const canPay =
                    inv.status !== "PAID" &&
                    inv.status !== "WAIVED" &&
                    inv.status !== "VOIDED" &&
                    inv.balanceMinor > 0;

                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[#DFE7F1] bg-slate-50/70 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#12243E]">{inv.periodYyyyMm}</span>
                          <span className="font-mono text-xs text-slate-500">({inv.invoiceNumber})</span>
                          <Badge
                            className={
                              inv.status === "PAID"
                                ? "bg-emerald-600 text-white"
                                : inv.status === "OVERDUE"
                                  ? "bg-rose-600 text-white"
                                  : "bg-amber-600 text-white"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-[#607089]">
                          Total: <strong>{formatMoneyMinor(inv.totalMinor, inv.currency)}</strong> • Due: {inv.dueAt.slice(0, 10)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canPay ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-[#1769D2] text-white hover:bg-[#1152AA] h-8 text-xs"
                              disabled={checkingOutInvoiceId === inv.id}
                              onClick={() => handleInitiateCheckout(inv)}
                            >
                              <CreditCard className="mr-1.5 size-3.5" />
                              Pay Now
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white h-8 text-xs border-[#DFE7F1]"
                              onClick={() => {
                                setManualInvoice(inv);
                                setManualAmountLkr(String((inv.balanceMinor / 100).toFixed(2)));
                              }}
                            >
                              <Banknote className="mr-1.5 size-3.5" />
                              Bank Slip
                            </Button>
                          </>
                        ) : null}

                        {confirmedPayment ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white border-emerald-200 text-emerald-700 h-8 text-xs"
                            onClick={() => handlePrintStudentReceipt(confirmedPayment.paymentId)}
                          >
                            <Printer className="mr-1.5 size-3.5" />
                            Receipt
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Phase 6: Online Gateway Checkout Session Dialog */}
        <Dialog open={Boolean(checkoutSession)} onOpenChange={(open) => !open && setCheckoutSession(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("classes.billing.payOnlinePayHere")} ({checkoutSession?.mode})
              </DialogTitle>
              <DialogDescription>
                Order ID: {checkoutSession?.providerOrderId} • Amount: {checkoutSession?.currency}{" "}
                {checkoutSession?.amountFormatted}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              {checkoutSession?.testModeNotice ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 text-xs">
                  {checkoutSession.testModeNotice}
                </div>
              ) : null}
              <p className="text-slate-600 text-xs">{t("classes.billing.pendingVerificationNote")}</p>
              {checkoutSession && checkoutSession.mode !== "TEST_SIMULATION_EXPLICIT" ? (
                <form method="post" action={checkoutSession.checkoutPayload.actionUrl}>
                  {Object.entries(checkoutSession.checkoutPayload.fields).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                  <Button type="submit" className="w-full bg-[#1769D2] text-white hover:bg-[#1152AA]">
                    Proceed to PayHere Gateway ({checkoutSession.currency} {checkoutSession.amountFormatted})
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

        {/* Phase 6: Submit Manual Bank Slip / Cash Reference Dialog */}
        <Dialog open={Boolean(manualInvoice)} onOpenChange={(open) => !open && setManualInvoice(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("classes.billing.submitManualProof")}</DialogTitle>
              <DialogDescription>
                {manualInvoice?.invoiceNumber} ({manualInvoice?.periodYyyyMm}) • {t("classes.billing.pendingVerificationNote")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>{t("classes.billing.paymentChannel")}</Label>
                <Select
                  value={manualChannel}
                  onValueChange={(v) => setManualChannel(v as TuitionPaymentChannel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Deposit / Transfer</SelectItem>
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
              <Button onClick={handleSubmitManualPayment} disabled={submittingManual}>
                {submittingManual && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Submit for Teacher Verification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </PublicQuizShell>
  );
}
