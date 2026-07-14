"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { AlertTriangle, CheckCircle2, Circle, Clock, Cloud, CloudOff } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { useResilientTimer, type HeartbeatResponse } from "@/hooks/use-resilient-timer";
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

  const pageLoadTimeRef = useRef(Date.now());
  const answerTimestampsRef = useRef<Record<string, number>>({});
  const submittedRef = useRef(false);
  const startRequestedRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const syncProgressToServer = useCallback(
    async (attemptId: string, nextAnswers: Record<string, AnswerValue>) => {
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

      // Flush latest answers to server before final grade.
      await syncProgressToServer(attemptId, answersRef.current);

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
        const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/attempts/${attemptId}/submit`, {
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
        incrementGuestQuizCount();
        sessionStorage.removeItem(`guest_attempt_${quizId}`);

        if (!silent) toast.success("Quiz submitted!");
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
    [quizId, router, syncProgressToServer],
  );

  useEffect(() => {
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    (async () => {
      try {
        const lead = getOrCreateGuestLead();

        if (!lead) {
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
    [attempt],
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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#070b14] text-white/70">
        <Spinner className="size-8" />
        Starting quiz...
      </div>
    );
  }

  if (errorMessage || !attempt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#070b14] px-4 text-center text-white">
        <AlertTriangle className="size-10 text-[#5da7ff]" />
        <p className="max-w-md text-sm">{errorMessage ?? "Unable to load this quiz."}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push("/")}>
            Back to quizzes
          </Button>
          <Button className="bg-[#5da7ff] text-[#070b14] hover:bg-[#7bb8ff]" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-[#0b3d2e]">
      <div className="sticky top-0 z-10 border-b border-[#0b3d2e]/10 bg-[#f4f7f5]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div>
            <h1 className="font-[family-name:var(--font-outfit)] text-lg font-extrabold leading-tight md:text-xl">
              {localize(attempt.quiz.title, locale)}
            </h1>
            <p className="text-xs text-[#0b3d2e]/60">{attempt.quiz.course.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-[#0b3d2e]/20 text-xs">
              {online ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
              {!online ? "Saved locally" : syncing ? "Syncing…" : "Synced"}
            </Badge>
            <div className="flex gap-1">
              {LOCALES.map((l) => (
                <Button
                  key={l.code}
                  size="sm"
                  variant={locale === l.code ? "default" : "outline"}
                  className={locale === l.code ? "bg-[#0b3d2e]" : ""}
                  onClick={() => setLocale(l.code)}
                >
                  {l.label}
                </Button>
              ))}
            </div>
            <Badge
              variant={isUrgent ? "destructive" : "secondary"}
              className={cn("gap-1.5 font-mono text-sm tabular-nums", isUrgent && "animate-pulse")}
            >
              <Clock className="size-3.5" />
              {isActive ? formatTime() : `${formatTime()} ⏸`}
            </Badge>
            {violationCount > 0 && (
              <Badge variant="outline" className="border-amber-400 text-xs text-amber-800">
                {violationCount}/3
              </Badge>
            )}
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-3 md:px-6">
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span className="whitespace-nowrap text-xs text-[#0b3d2e]/60">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
      </div>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
        {questions.map((question, index) => {
          const selected = answers[question.id];
          const isAnswered =
            question.type === "MCQ"
              ? Boolean(selected?.choiceId)
              : Boolean(selected?.textResponse?.trim());
          return (
            <section
              key={question.id}
              className={cn(
                "rounded-2xl border bg-white p-5 shadow-sm",
                isAnswered ? "border-[#0b3d2e]/30" : "border-[#0b3d2e]/10",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0 border-[#0b3d2e]/20">
                    Q{index + 1}
                  </Badge>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {question.type.replace("_", " ")}
                    </Badge>
                    <QuestionPrompt question={question} locale={locale} />
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {question.points} pts
                </Badge>
              </div>
              <QuestionAnswerInput
                question={question}
                locale={locale}
                value={selected ?? {}}
                onChange={(next) => handleAnswer(question.id, next)}
                disabled={submitting}
              />
            </section>
          );
        })}

        <section className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#0b3d2e]/10 bg-white p-4 shadow-lg">
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, index) => {
              const a = answers[q.id];
              const answered =
                q.type === "MCQ" ? Boolean(a?.choiceId) : Boolean(a?.textResponse?.trim());
              return (
                <div
                  key={q.id}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                    answered
                      ? "border-[#0b3d2e] bg-[#0b3d2e] text-white"
                      : "border-[#0b3d2e]/20 text-[#0b3d2e]/50",
                  )}
                >
                  {answered ? <CheckCircle2 className="size-3.5" /> : index + 1}
                </div>
              );
            })}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" disabled={submitting} className="bg-[#0b3d2e] font-bold hover:bg-[#145a44]">
                {submitting ? (
                  <>
                    <Spinner className="size-4" />
                    Submitting...
                  </>
                ) : (
                  "Submit quiz"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
                <AlertDialogDescription>
                  Once submitted, you cannot change your answers.
                  {unansweredCount > 0 && (
                    <span className="mt-2 flex items-center gap-1.5 text-amber-600">
                      <Circle className="size-3.5 fill-current" />
                      You have {unansweredCount} unanswered question(s).
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => submitAttempt(attempt.id, questions)}>
                  Yes, submit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </div>
  );
}
