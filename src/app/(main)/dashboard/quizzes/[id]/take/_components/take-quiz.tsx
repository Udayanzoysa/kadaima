"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { AlertTriangle, CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { QuestionAnswerInput, QuestionPrompt, type AnswerValue } from "@/components/quiz/question-answer";
import { type Locale } from "@/lib/i18n";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { useResilientTimer, type HeartbeatResponse } from "@/hooks/use-resilient-timer";
import { getClientCookie } from "@/lib/cookie.client";
import { safeJson } from "@/lib/safe-json";
import { cn } from "@/lib/utils";
import {
  localize,
  normalizeQuizLanguages,
  type SupportedLocale,
  type AttemptDetail,
  type QuizAttempt,
} from "@/types/quiz";

export function TakeQuiz() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);

  const pageLoadTimeRef = useRef<number>(Date.now());
  const answerTimestampsRef = useRef<Record<string, number>>({});
  const submittedRef = useRef(false);
  const startRequestedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const authHeaders = useCallback(() => {
    const token = getClientCookie("session_token");
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : null;
  }, []);

  const submitAttempt = useCallback(
    async (attemptId: string, questions: AttemptDetail["quiz"]["questions"], silent = false) => {
      const headers = authHeaders();
      if (!headers) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

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
        const res = await fetch(`${APP_CONFIG.apiUrl}/grading/attempts/${attemptId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify({ responses }),
        });

        if (!res.ok) {
          const err = await safeJson<{ message?: string }>(res);
          throw new Error(err?.message || "Failed to submit quiz.");
        }

        if (!silent) toast.success(t("student.submitConfirmTitle"));
        router.push(`/admin/quizzes/${quizId}/result`);
      } catch (err) {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error(err instanceof Error ? err.message : "Failed to submit quiz.");
      }
    },
    [authHeaders, quizId, router, t],
  );

  useEffect(() => {
    const headers = authHeaders();
    if (!headers) return;

    // Guard against React dev-mode double-invoking this effect on mount,
    // which would otherwise fire two concurrent "start attempt" requests.
    // Note: intentionally NOT tied to a per-invocation "cancelled" flag —
    // the async work below must be allowed to finish and update state even
    // though dev-mode calls this effect's cleanup right after the first
    // (throwaway) invocation.
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    (async () => {
      try {
        const myAttemptRes = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}/my-attempt`, { headers });
        const existing = myAttemptRes.ok ? await safeJson<QuizAttempt>(myAttemptRes) : null;

        if (existing && existing.status !== "In_Progress") {
          router.replace(`/admin/quizzes/${quizId}/result`);
          return;
        }

        const startRes = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}/attempts`, {
          method: "POST",
          headers,
        });

        if (!startRes.ok) {
          const err = await safeJson<{ message?: string }>(startRes);
          throw new Error(err?.message || `Unable to start this quiz (${startRes.status}).`);
        }

        const attemptDetail = await safeJson<AttemptDetail>(startRes);
        if (!attemptDetail) {
          throw new Error("The server returned an empty response. Please try again.");
        }

        pageLoadTimeRef.current = Date.now();
        setAttempt(attemptDetail);
      } catch (err) {
        startRequestedRef.current = false;
        setErrorMessage(err instanceof Error ? err.message : "Unable to start this quiz.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, authHeaders, router]);

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
      const headers = authHeaders();
      if (!headers) return null;

      const res = await fetch(
        `${APP_CONFIG.apiUrl}/quizzes/attempts/${attempt.id}/heartbeat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ status, secondsRemaining, violationCount }),
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

  // Warn before leaving mid-quiz so students don't accidentally lose their attempt.
  useEffect(() => {
    if (!attempt) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [attempt]);

  const quizLanguagesKey = attempt
    ? normalizeQuizLanguages(attempt.quiz.languages, attempt.quiz.language).join(",")
    : "en";
  const quizLanguages = quizLanguagesKey.split(",") as SupportedLocale[];
  const [contentLocale, setContentLocale] = useState<SupportedLocale>("en");

  useEffect(() => {
    if (!attempt) return;
    const preferred = quizLanguages.includes(locale as SupportedLocale)
      ? (locale as SupportedLocale)
      : quizLanguages[0];
    setContentLocale(preferred);
  }, [attempt?.id, quizLanguagesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentLocaleChange = (next: Locale) => {
    if (!quizLanguages.includes(next)) return;
    setContentLocale(next);
    setLocale(next);
  };

  const handleAnswer = (questionId: string, next: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    answerTimestampsRef.current[questionId] = Date.now();
  };

  const questions = attempt?.quiz.questions ?? [];
  const quizSections = attempt?.quiz.sections ?? [];
  const hasInstructionSections = quizSections.some((s) => (s.questions?.length ?? 0) > 0);
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
      <div className="flex h-96 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <Spinner className="size-8" />
        {t("student.startingQuiz")}
      </div>
    );
  }

  if (errorMessage || !attempt) {
    return (
      <Card className="mx-auto max-w-md border-border">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <p className="text-sm">{errorMessage ?? "Unable to load this quiz."}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/quizzes")}>
              {t("student.backToQuizzes")}
            </Button>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky exam header */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-6 md:-mt-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold text-lg leading-tight md:text-xl">
              {localize(attempt.quiz.title, contentLocale)}
            </h1>
            <p className="text-muted-foreground text-xs">
              {localize(attempt.quiz.course.title, contentLocale)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {quizLanguages.length > 1 ? (
              <LanguageSwitcher
                value={contentLocale}
                onChange={handleContentLocaleChange}
                languages={quizLanguages}
              />
            ) : (
              <Badge variant="outline" className="text-xs uppercase">
                {contentLocale}
              </Badge>
            )}
            <Badge
              variant={isUrgent ? "destructive" : "secondary"}
              className={cn("gap-1.5 font-mono text-sm tabular-nums", isUrgent && "animate-pulse")}
            >
              <Clock className="size-3.5" />
              {isActive ? formatTime() : `${formatTime()} ⏸`}
            </Badge>
            {violationCount > 0 && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
                {violationCount}/3
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span className="whitespace-nowrap text-muted-foreground text-xs">
            {answeredCount}/{questions.length} {t("student.answered")}
          </span>
        </div>
      </div>

      {/* Questions — sectioned when instruction blocks exist */}
      <div className="flex flex-col gap-4">
        {(() => {
          const renderCard = (question: (typeof questions)[number], index: number) => {
            const selected = answers[question.id];
            const isAnswered =
              question.type === "MCQ"
                ? Boolean(selected?.choiceId)
                : Boolean(selected?.textResponse?.trim());
            return (
              <Card key={question.id} className={cn("border-border", isAnswered && "border-primary/40")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0">
                        {t("student.question")} {index + 1}
                      </Badge>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {question.type.replace("_", " ")}
                        </Badge>
                        <QuestionPrompt question={question} locale={contentLocale} />
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {question.points} {t("student.points")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <QuestionAnswerInput
                    question={question}
                    locale={contentLocale}
                    value={selected ?? {}}
                    onChange={(next) => handleAnswer(question.id, next)}
                    disabled={submitting}
                  />
                </CardContent>
              </Card>
            );
          };

          if (!hasInstructionSections) {
            return questions.map((question, index) => renderCard(question, index));
          }

          const indexById = new Map(questions.map((q, i) => [q.id, i]));
          const sectionedIds = new Set(
            quizSections.flatMap((s) => (s.questions ?? []).map((q) => q.id)),
          );
          const ungrouped = questions.filter((q) => !sectionedIds.has(q.id));

          return (
            <>
              {ungrouped.map((q) => renderCard(q, indexById.get(q.id) ?? 0))}
              {quizSections.map((section, sectionIndex) => {
                const sectionQuestions = section.questions ?? [];
                if (sectionQuestions.length === 0) return null;
                return (
                  <div
                    key={section.id}
                    className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3"
                  >
                    <div className="rounded-lg border bg-background px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                        Section {sectionIndex + 1}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed">
                        {localize(section.instruction, contentLocale)}
                      </p>
                    </div>
                    {sectionQuestions.map((q) => renderCard(q, indexById.get(q.id) ?? 0))}
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Answer overview + submit */}
      <Card className="border-border">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                  (() => {
                    const a = answers[q.id];
                    const answered =
                      q.type === "MCQ" ? Boolean(a?.choiceId) : Boolean(a?.textResponse?.trim());
                    return answered
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground";
                  })(),
                )}
                title={`${t("student.question")} ${index + 1}`}
              >
                {(() => {
                  const a = answers[q.id];
                  const answered =
                    q.type === "MCQ" ? Boolean(a?.choiceId) : Boolean(a?.textResponse?.trim());
                  return answered ? <CheckCircle2 className="size-3.5" /> : index + 1;
                })()}
              </div>
            ))}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner className="size-4" />
                    {t("timer.submitting")}
                  </>
                ) : (
                  t("student.submitQuiz")
                )}
              </Button>
            </AlertDialogTrigger>
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
        </CardContent>
      </Card>
    </div>
  );
}
