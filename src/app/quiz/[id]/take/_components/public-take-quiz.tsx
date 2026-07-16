"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronUp,
  Circle,
  Clock,
  Cloud,
  CloudOff,
  Globe,
  LayoutGrid,
  Lightbulb,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { QuestionAnswerInput, QuestionPrompt, type AnswerValue } from "@/components/quiz/question-answer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { useResilientTimer, type HeartbeatResponse } from "@/hooks/use-resilient-timer";
import { deleteClientCookie, getClientCookie } from "@/lib/cookie.client";
import {
  clearGuestProgress,
  clearPendingSync,
  getGuestProgress,
  getOrCreateGuestLead,
  getPendingSync,
  incrementGuestQuizCount,
  mergeAnswersFromServer,
  saveGuestProgress,
  setPendingSync,
} from "@/lib/guest-session";
import { LOCALES } from "@/lib/i18n";
import { safeJson } from "@/lib/safe-json";
import { cn } from "@/lib/utils";
import { type AttemptDetail, localize } from "@/types/quiz";

const PRIMARY = "#0c4a6e";
const SOFT = "#e8f1f8";
const PAGE_BG = "#f5f7fa";

export function PublicTakeQuiz() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const pageLoadTimeRef = useRef(Date.now());
  const answerTimestampsRef = useRef<Record<string, number>>({});
  const submittedRef = useRef(false);
  const startRequestedRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const authHeaders = useCallback(() => {
    const token = getClientCookie("session_token");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : null;
  }, []);

  const syncProgressToServer = useCallback(
    async (attemptId: string, nextAnswers: Record<string, AnswerValue>) => {
      if (isAuthedRef.current) return true;

      const lead = getOrCreateGuestLead();
      if (!lead) return false;

      const responses = Object.entries(nextAnswers).map(([questionId, ans]) => {
        const answeredAt = answerTimestampsRef.current[questionId] ?? Date.now();
        const timeSpent = Math.max(0, Math.round((answeredAt - pageLoadTimeRef.current) / 1000));
        return {
          questionId,
          choiceId: ans.choiceId,
          textResponse: ans.textResponse,
          timeSpent,
        };
      });

      const payload = {
        guestSessionId: lead.guestSessionId,
        responses,
      };

      if (!navigator.onLine) {
        setPendingSync({ attemptId, guestSessionId: lead.guestSessionId, responses });
        return false;
      }

      setSyncing(true);
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/attempts/${attemptId}/progress`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setPendingSync({ attemptId, guestSessionId: lead.guestSessionId, responses });
          return false;
        }
        clearPendingSync();
        return true;
      } catch {
        setPendingSync({ attemptId, guestSessionId: lead.guestSessionId, responses });
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [],
  );

  const flushPendingSync = useCallback(async () => {
    if (isAuthedRef.current) return;
    const pending = getPendingSync();
    if (!pending || !navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/attempts/${pending.attemptId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestSessionId: pending.guestSessionId,
          responses: pending.responses,
        }),
      });
      if (res.ok) clearPendingSync();
    } catch {
      // keep pending for next online event
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) void flushPendingSync();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [flushPendingSync]);

  const submitAttempt = useCallback(
    async (attemptId: string, questions: AttemptDetail["quiz"]["questions"], silent = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      if (!isAuthedRef.current) {
        await syncProgressToServer(attemptId, answersRef.current);
      }

      const responses = questions.map((q) => {
        const ans = answersRef.current[q.id];
        const answeredAt = answerTimestampsRef.current[q.id] ?? Date.now();
        const timeSpent = Math.max(0, Math.round((answeredAt - pageLoadTimeRef.current) / 1000));
        return {
          questionId: q.id,
          choiceId: ans?.choiceId,
          textResponse: ans?.textResponse,
          timeSpent,
        };
      });

      try {
        const headers = authHeaders();
        const res = isAuthedRef.current && headers
          ? await fetch(`${APP_CONFIG.apiUrl}/grading/attempts/${attemptId}/submit`, {
              method: "POST",
              headers,
              body: JSON.stringify({ responses }),
            })
          : await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/attempts/${attemptId}/submit`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ responses }),
            });

        if (!res.ok) {
          const err = await safeJson<{ message?: string }>(res);
          throw new Error(err?.message || "Failed to submit quiz.");
        }

        const result = await safeJson<{ resultToken?: string }>(res);
        clearGuestProgress();
        if (!isAuthedRef.current) incrementGuestQuizCount();
        sessionStorage.removeItem(`guest_attempt_${quizId}`);
        sessionStorage.removeItem(`auth_attempt_${quizId}`);

        if (!silent) toast.success(t("student.quizSubmitted"));
        if (result?.resultToken) {
          router.push(`/results/${result.resultToken}`);
        } else {
          router.push("/");
        }
      } catch (err) {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error(err instanceof Error ? err.message : "Failed to submit quiz.");
      }
    },
    [authHeaders, quizId, router, syncProgressToServer, t],
  );

  useEffect(() => {
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    (async () => {
      try {
        const token = getClientCookie("session_token");
        if (token) {
          const meRes = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            isAuthedRef.current = true;
            setIsAuthed(true);

            const startRes = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}/attempts`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
            if (!startRes.ok) {
              const err = await safeJson<{ message?: string }>(startRes);
              if (startRes.status === 401) {
                deleteClientCookie("session_token");
                throw new Error("Session expired. Please log in again.");
              }
              throw new Error(err?.message || `Unable to start this quiz (${startRes.status}).`);
            }

            const attemptDetail = await safeJson<AttemptDetail>(startRes);
            if (!attemptDetail) throw new Error("Empty response from server.");

            if (attemptDetail.status !== "In_Progress") {
              if (attemptDetail.resultToken) {
                router.replace(`/results/${attemptDetail.resultToken}`);
                return;
              }
              throw new Error("You have already completed this quiz.");
            }

            sessionStorage.setItem(`auth_attempt_${quizId}`, attemptDetail.id);
            const fromServer = mergeAnswersFromServer(attemptDetail.responses ?? [], {});
            setAnswers(fromServer);
            pageLoadTimeRef.current = Date.now();
            setAttempt(attemptDetail);
            return;
          }

          deleteClientCookie("session_token");
        }

        isAuthedRef.current = false;
        setIsAuthed(false);
        const lead = getOrCreateGuestLead();
        if (!lead?.studentName || !lead.school || !lead.mobileNumber) {
          router.replace(`/quiz/${quizId}`);
          return;
        }

        const startRes = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/${quizId}/guest-attempts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestSessionId: lead.guestSessionId,
            studentName: lead.studentName,
            school: lead.school,
            mobileNumber: lead.mobileNumber,
            email: lead.email,
          }),
        });

        if (!startRes.ok) {
          const err = await safeJson<{ message?: string }>(startRes);
          throw new Error(err?.message || `Unable to start this quiz (${startRes.status}).`);
        }

        const attemptDetail = await safeJson<AttemptDetail>(startRes);
        if (!attemptDetail) throw new Error("Empty response from server.");

        if (attemptDetail.status !== "In_Progress") {
          if (attemptDetail.resultToken) {
            router.replace(`/results/${attemptDetail.resultToken}`);
            return;
          }
          throw new Error("You have already completed this quiz.");
        }

        sessionStorage.setItem(`guest_attempt_${quizId}`, attemptDetail.id);

        const local = getGuestProgress(quizId)?.answers ?? {};
        const fromServer = mergeAnswersFromServer(attemptDetail.responses ?? [], local);
        setAnswers(fromServer);

        pageLoadTimeRef.current = Date.now();
        setAttempt(attemptDetail);
      } catch (err) {
        startRequestedRef.current = false;
        setErrorMessage(err instanceof Error ? err.message : "Unable to start this quiz.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, router]);

  const handleForcedSubmit = useCallback(
    (reason: "timeout" | "violations") => {
      if (!attempt || submittedRef.current) return;
      if (reason === "violations") {
        toast.warning(t("student.tabSwitchLocked"), {
          description: t("student.autoSubmitting"),
        });
      } else {
        toast.warning(t("student.timeUp"), {
          description: t("student.autoSubmitting"),
        });
      }
      void submitAttempt(attempt.id, attempt.quiz.questions, true);
    },
    [attempt, submitAttempt, t],
  );

  const sendHeartbeat = useCallback(
    async (
      status: "active" | "paused",
      secondsRemaining: number,
      violationCount: number,
    ): Promise<HeartbeatResponse | null> => {
      if (!attempt) return null;

      if (isAuthedRef.current) {
        const headers = authHeaders();
        if (!headers) return null;
        const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/attempts/${attempt.id}/heartbeat`, {
          method: "POST",
          headers,
          body: JSON.stringify({ status, secondsRemaining, violationCount }),
        });
        if (!res.ok) return null;
        return safeJson<HeartbeatResponse>(res);
      }

      const lead = getOrCreateGuestLead();
      if (!lead) return null;

      const res = await fetch(
        `${APP_CONFIG.apiUrl}/public/quizzes/attempts/${attempt.id}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            secondsRemaining,
            violationCount,
            guestSessionId: lead.guestSessionId,
          }),
        },
      );
      if (!res.ok) return null;
      return safeJson<HeartbeatResponse>(res);
    },
    [attempt, authHeaders],
  );

  const onViolation = useCallback(
    (count: number) => {
      if (count >= 3) return;
      toast.warning(
        t("student.tabSwitchWarning").replace("{count}", String(count)),
        { description: t("student.timerPaused") },
      );
    },
    [t],
  );

  const initialSeconds =
    attempt?.secondsRemaining ??
    (attempt?.expiresAt
      ? Math.max(0, Math.floor((+new Date(attempt.expiresAt) - Date.now()) / 1000))
      : 0);

  const { timeLeft, formatTime, isActive, violationCount } = useResilientTimer({
    attemptId: attempt?.id ?? null,
    initialSeconds,
    initialViolations: attempt?.violationCount ?? 0,
    enabled: Boolean(attempt) && !submitting,
    sendHeartbeat,
    onAutoSubmit: handleForcedSubmit,
    onViolation,
  });

  useEffect(() => {
    if (!attempt) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [attempt]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const handleAnswer = (questionId: string, next: AnswerValue) => {
    answerTimestampsRef.current[questionId] = Date.now();
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: next };
      if (!isAuthedRef.current) {
        const lead = getOrCreateGuestLead();
        if (lead && attempt) {
          saveGuestProgress({
            guestSessionId: lead.guestSessionId,
            currentQuizId: quizId,
            attemptId: attempt.id,
            answers: updated,
            lastUpdated: new Date().toISOString(),
          });

          if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
          syncTimerRef.current = setTimeout(() => {
            void syncProgressToServer(attempt.id, updated);
          }, 500);
        }
      }
      return updated;
    });
  };

  const questions = attempt?.quiz.questions ?? [];
  const answeredCount = useMemo(
    () =>
      questions.filter((q) => {
        const a = answers[q.id];
        if (!a) return false;
        if (q.type === "MCQ") return Boolean(a.choiceId);
        return Boolean(a.textResponse?.trim());
      }).length,
    [questions, answers],
  );
  const unansweredCount = questions.length - answeredCount;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isUrgent = timeLeft > 0 && timeLeft <= 60;
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const focusClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useExpandableMobileNav = questions.length >= 10;

  const scrollToQuestion = useCallback((questionId: string, options?: { closeMobileNav?: boolean }) => {
    const el = document.getElementById(`question-${questionId}`);
    if (!el) return;
    if (options?.closeMobileNav) setMobileNavOpen(false);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFocusedQuestionId(questionId);
    if (focusClearTimerRef.current) clearTimeout(focusClearTimerRef.current);
    focusClearTimerRef.current = setTimeout(() => setFocusedQuestionId(null), 1800);
    const focusable = el.querySelector<HTMLElement>(
      "input, textarea, button, [role='radio'], [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    return () => {
      if (focusClearTimerRef.current) clearTimeout(focusClearTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-slate-500" style={{ background: PAGE_BG }}>
        <Spinner className="size-8" />
        {t("student.startingQuiz")}
      </div>
    );
  }

  if (errorMessage || !attempt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center" style={{ background: PAGE_BG }}>
        <AlertTriangle className="size-10" style={{ color: PRIMARY }} />
        <p className="max-w-md text-sm text-slate-700">{errorMessage ?? t("student.unableToLoadQuiz")}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push("/")}>
            {t("public.backToQuizzes")}
          </Button>
          <Button style={{ background: PRIMARY }} className="text-white hover:opacity-90" onClick={() => window.location.reload()}>
            {t("student.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  const isQuestionAnswered = (q: (typeof questions)[number]) => {
    const a = answers[q.id];
    if (!a) return false;
    return q.type === "MCQ" ? Boolean(a.choiceId) : Boolean(a.textResponse?.trim());
  };

  const submitDialog = (trigger: ReactNode) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("student.submitConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("student.submitConfirmDescription")}
            {unansweredCount > 0 && (
              <span className="mt-2 flex items-center gap-1.5 text-amber-600">
                <Circle className="size-3.5 fill-current" />
                {t("student.submitConfirmUnanswered").replace("{count}", String(unansweredCount))}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("student.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => submitAttempt(attempt.id, questions)}>
            {t("student.confirmSubmit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const questionNavButtons = (opts: {
    cols: string;
    size?: string;
    onPick?: (id: string) => void;
  }) => (
    <div className={cn("grid gap-2", opts.cols)}>
      {questions.map((q, index) => {
        const answered = isQuestionAnswered(q);
        const isFocused = focusedQuestionId === q.id;
        return (
          <button
            key={q.id}
            type="button"
            title={answered ? `Q${index + 1} answered` : `Go to Q${index + 1}`}
            onClick={() => (opts.onPick ? opts.onPick(q.id) : scrollToQuestion(q.id))}
            className={cn(
              "flex items-center justify-center rounded-xl text-sm font-semibold transition",
              opts.size ?? "aspect-square",
              answered || isFocused
                ? "bg-[#0c4a6e] text-white shadow-sm"
                : "bg-[#e8f1f8] text-slate-600 hover:bg-[#d7e8f4]",
              isFocused && !answered && "ring-2 ring-[#0c4a6e]/40 ring-offset-1",
            )}
          >
            {answered && !isFocused ? <CheckCircle2 className="size-4" /> : index + 1}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900" style={{ background: PAGE_BG }}>
      {/* Desktop header */}
      <header className="sticky top-0 z-10 hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-sm lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              src="/brand/kadaima-logo.png"
              alt="Kadaima"
              width={140}
              height={36}
              className="h-7 w-auto shrink-0 object-contain"
              priority
            />
            <div className="min-w-0 border-l border-slate-200 pl-4">
              <h1 className="truncate text-base font-bold" style={{ color: PRIMARY }}>
                {localize(attempt.quiz.title, locale)}
              </h1>
              <p className="truncate text-xs text-slate-500">{localize(attempt.quiz.course.title, locale)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
              {online ? <Cloud className="size-3.5" style={{ color: PRIMARY }} /> : <CloudOff className="size-3.5" />}
              {isAuthed
                ? t("student.signedIn")
                : !online
                  ? t("student.savedLocally")
                  : syncing
                    ? t("student.syncing")
                    : t("student.synced")}
            </span>
            <div className="flex gap-1">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLocale(l.code)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                    locale === l.code ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                  style={locale === l.code ? { background: PRIMARY } : undefined}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-semibold tabular-nums",
                isUrgent ? "bg-red-100 text-red-700 animate-pulse" : "bg-[#e8f1f8] text-[#0c4a6e]",
              )}
            >
              <Clock className="size-3.5" />
              {isActive ? formatTime() : `${formatTime()} ⏸`}
            </span>
            {violationCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                {t("student.violations").replace("{count}", String(violationCount))}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white lg:hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => router.push(`/quiz/${quizId}`)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <Image
              src="/brand/kadaima-logo.png"
              alt="Kadaima"
              width={110}
              height={28}
              className="h-6 w-auto object-contain"
              priority
            />
            <p className="truncate text-[11px] text-slate-500">
              {t("student.answeredOf")
                .replace("{answered}", String(answeredCount))
                .replace("{total}", String(questions.length))}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600"
            onClick={() => {
              const idx = LOCALES.findIndex((l) => l.code === locale);
              setLocale(LOCALES[(idx + 1) % LOCALES.length].code);
            }}
            aria-label="Change language"
          >
            <Globe className="size-3.5" />
            <span className="max-w-[3.5rem] truncate">
              {(LOCALES.find((l) => l.code === locale) ?? LOCALES[0]).label}
            </span>
          </button>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums",
              isUrgent ? "bg-red-100 text-red-700" : "bg-[#e8f1f8] text-[#0c4a6e]",
            )}
          >
            <Clock className="size-3.5" />
            {isActive ? formatTime() : `${formatTime()} ⏸`}
          </span>
        </div>
        <div className="px-3 pb-2">
          <Progress value={progressPercent} className="h-1.5 [&>div]:bg-[#0c4a6e]" />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:py-8">
        <main
          className={cn(
            "flex min-w-0 flex-col gap-4 lg:pb-6",
            useExpandableMobileNav ? "pb-24" : "pb-28",
          )}
        >
          {/* Desktop progress card */}
          <div className="hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:block">
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex size-9 items-center justify-center rounded-xl"
                style={{ background: SOFT, color: PRIMARY }}
              >
                <LayoutGrid className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">{t("student.currentProgress")}</p>
                <p className="text-xs text-slate-500">
                  {t("student.answeredOfQuestions")
                    .replace("{answered}", String(answeredCount))
                    .replace("{total}", String(questions.length))}
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2 [&>div]:bg-[#0c4a6e]" />
          </div>

          {questions.map((question, index) => {
            const selected = answers[question.id];
            const isAnswered = isQuestionAnswered(question);
            const isFocused = focusedQuestionId === question.id;
            return (
              <section
                key={question.id}
                id={`question-${question.id}`}
                className={cn(
                  "scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition lg:scroll-mt-28",
                  "border-l-[3px] border-l-[#0c4a6e]",
                  isFocused && "ring-2 ring-[#0c4a6e]/25 ring-offset-2",
                  isAnswered && "bg-[#fafcfd]",
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#e8f1f8] px-2.5 py-1 text-xs font-bold text-[#0c4a6e]">
                      Q{index + 1}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {question.type.replace("_", " ")}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">
                    {Number(question.points).toFixed(1)} {t("student.pointsFull")}
                  </span>
                </div>
                <QuestionPrompt
                  question={question}
                  locale={locale}
                  className="mb-4 [&_p]:text-base [&_p]:font-semibold [&_p]:text-slate-900 md:[&_p]:text-lg"
                />
                <QuestionAnswerInput
                  question={question}
                  locale={locale}
                  value={selected ?? {}}
                  onChange={(next) => handleAnswer(question.id, next)}
                  disabled={submitting}
                  appearance="exam"
                />
              </section>
            );
          })}
        </main>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col gap-4">
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-1 shrink-0 flex items-center gap-2">
                <LayoutGrid className="size-4" style={{ color: PRIMARY }} />
                <p className="text-sm font-bold text-slate-900">{t("student.questionNavigator")}</p>
              </div>
              <p className="mb-4 shrink-0 text-xs text-slate-500">
                {unansweredCount > 0
                  ? t("student.questionsRemaining").replace("{count}", String(unansweredCount))
                  : t("student.allQuestionsAnswered")}
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {questionNavButtons({ cols: "grid-cols-5" })}
              </div>

              <div className="mt-4 shrink-0 border-t border-slate-100 pt-4">
                {submitDialog(
                  <Button
                    size="lg"
                    disabled={submitting}
                    className="w-full gap-2 font-bold text-white hover:opacity-90"
                    style={{ background: PRIMARY }}
                  >
                    {submitting ? (
                      <>
                        <Spinner className="size-4" />
                        {t("student.submitting")}
                      </>
                    ) : (
                      <>
                        {t("student.submitQuiz")}
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>,
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-3 rounded-2xl border border-[#cfe3f0] bg-[#eef6fb] p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-[#0c4a6e]" />
              <p className="text-xs leading-relaxed text-slate-600">
                <span className="font-bold text-slate-800">{t("student.quickTipTitle")} </span>
                {t("student.quickTipBody")}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile / tablet navigator */}
      <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
        {useExpandableMobileNav && mobileNavOpen && (
          <button
            type="button"
            aria-label="Close question navigator"
            className="absolute inset-x-0 bottom-full h-[100dvh] bg-black/30"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <div className="bg-white shadow-[0_-10px_40px_rgba(15,23,42,0.12)]">
          {useExpandableMobileNav ? (
            <>
              <div
                className={cn(
                  "overflow-hidden transition-[max-height] duration-300 ease-out",
                  mobileNavOpen ? "max-h-[70dvh]" : "max-h-0",
                )}
              >
                <div className="max-h-[70dvh] overflow-y-auto rounded-t-2xl px-4 pb-3 pt-2">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-base font-bold text-slate-900">{t("student.questionNavigator")}</p>
                    <button
                      type="button"
                      onClick={() => setMobileNavOpen(false)}
                      className="flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                      aria-label="Close"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                  {questionNavButtons({
                    cols: "grid-cols-5",
                    onPick: (id) => scrollToQuestion(id, { closeMobileNav: true }),
                  })}
                  <div className="mt-5 pb-1">
                    {submitDialog(
                      <Button
                        size="lg"
                        disabled={submitting}
                        className="w-full bg-slate-950 font-bold text-white hover:bg-slate-800"
                      >
                        {submitting ? <Spinner className="size-4" /> : t("student.submitQuiz")}
                      </Button>,
                    )}
                  </div>
                </div>
              </div>

              {!mobileNavOpen && (
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[#e8f1f8] px-3 py-2.5 text-left"
                    aria-expanded={false}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: PRIMARY }}
                    >
                      <ChevronUp className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {t("student.questionNavigator")}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {answeredCount}/{questions.length} {t("student.answered").toLowerCase()}
                        {unansweredCount > 0
                          ? ` · ${t("student.leftCount").replace("{count}", String(unansweredCount))}`
                          : ""}
                      </span>
                    </span>
                  </button>
                  {submitDialog(
                    <Button
                      size="lg"
                      disabled={submitting}
                      className="shrink-0 bg-slate-950 font-bold text-white hover:bg-slate-800"
                    >
                      {submitting ? <Spinner className="size-4" /> : t("student.submit")}
                    </Button>,
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 border-t border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                  {t("student.tapANumber")
                    .replace("{answered}", String(answeredCount))
                    .replace("{total}", String(questions.length))}
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {questions.map((q, index) => {
                    const answered = isQuestionAnswered(q);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => scrollToQuestion(q.id)}
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                          answered ? "bg-[#0c4a6e] text-white" : "bg-[#e8f1f8] text-slate-600",
                        )}
                      >
                        {answered ? <CheckCircle2 className="size-3.5" /> : index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              {submitDialog(
                <Button
                  size="lg"
                  disabled={submitting}
                  className="shrink-0 bg-slate-950 font-bold text-white hover:bg-slate-800"
                >
                  {submitting ? <Spinner className="size-4" /> : t("student.submit")}
                </Button>,
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
