"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Award, CheckCircle2, ChevronLeft, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { AiQuizReviewPanel } from "@/components/quiz/ai-quiz-review";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { LOCALES } from "@/lib/i18n";
import { safeJson } from "@/lib/safe-json";
import { cn } from "@/lib/utils";
import { localize, type AttemptDetail, type QuizAttempt } from "@/types/quiz";

export function QuizResult() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    let cancelled = false;

    (async () => {
      try {
        const myAttemptRes = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}/my-attempt`, { headers });
        const latest = myAttemptRes.ok ? await safeJson<QuizAttempt>(myAttemptRes) : null;

        if (!latest) {
          router.replace("/admin/quizzes");
          return;
        }

        if (latest.status === "In_Progress") {
          router.replace(`/admin/quizzes/${quizId}/take`);
          return;
        }

        const detailRes = await fetch(`${APP_CONFIG.apiUrl}/quizzes/attempts/${latest.id}`, { headers });
        if (!detailRes.ok) throw new Error("Failed to load result.");
        const detail = await safeJson<AttemptDetail>(detailRes);
        if (!detail) throw new Error("The server returned an empty response. Please try again.");
        if (!cancelled) setAttempt(detail);
      } catch (err) {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Failed to load result.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quizId, router]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <Spinner className="size-8" />
        {t("student.loadingQuiz")}
      </div>
    );
  }

  if (errorMessage || !attempt) {
    return (
      <Card className="mx-auto max-w-md border-border">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <XCircle className="size-10 text-destructive" />
          <p className="text-sm">{errorMessage ?? "Result not found."}</p>
          <Button variant="outline" onClick={() => router.push("/admin/quizzes")}>
            {t("student.backToQuizzes")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isTimedOut = attempt.status === "Timed_Out";
  const isPassed = attempt.isPassed;
  const incorrectCount = attempt.quiz.questions.filter((question) => {
    const response = attempt.responses.find((r) => r.questionId === question.id);
    return !(response?.isCorrect || response?.needsManualReview);
  }).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/quizzes")}>
          <ChevronLeft className="size-4" />
          {t("student.backToQuizzes")}
        </Button>
        <div className="flex flex-wrap gap-1.5">
          {LOCALES.map((l) => (
            <Button
              key={l.code}
              type="button"
              size="sm"
              variant={locale === l.code ? "default" : "outline"}
              onClick={() => setLocale(l.code)}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </div>

      <Card
        className={cn(
          "border-2 text-center",
          isPassed ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5",
        )}
      >
        <CardContent className="flex flex-col items-center gap-3 py-10">
          {isPassed ? (
            <Award className="size-14 text-emerald-500" />
          ) : (
            <XCircle className="size-14 text-destructive" />
          )}
          <div>
            <h1 className="font-semibold text-xl md:text-2xl">{localize(attempt.quiz.title, locale)}</h1>
            <p className="text-muted-foreground text-sm">{localize(attempt.quiz.course.title, locale)}</p>
          </div>

          <div className="mt-2 flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-sm">{t("student.yourScore")}</span>
            <span className={cn("font-bold text-5xl", isPassed ? "text-emerald-600" : "text-destructive")}>
              {attempt.finalScore}%
            </span>
            <Progress value={attempt.finalScore} className="mt-2 h-2 w-48" />
          </div>

          <p className="mt-2 font-medium text-sm">
            {isTimedOut
              ? t("student.timedOutMessage")
              : isPassed
                ? t("student.congratulations")
                : t("student.betterLuck")}
          </p>

          <div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
            <Badge variant="outline" className="gap-1">
              <Clock className="size-3.5" />
              {t("student.passingScore")}: {attempt.quiz.passingScorePercentage}%
            </Badge>
            <Badge variant={isPassed ? "default" : "destructive"}>
              {isTimedOut ? t("student.timedOutStatus") : isPassed ? t("student.passed") : t("student.failed")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <AiQuizReviewPanel
        attemptId={attempt.id}
        incorrectCount={incorrectCount}
        quizLanguage={attempt.quiz.language}
        quizLanguages={attempt.quiz.languages}
        quizTitle={attempt.quiz.title}
        sampleQuestionText={attempt.quiz.questions[0]?.questionText}
      />

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">{t("student.reviewAnswers")}</h2>
        {attempt.quiz.questions.map((question, index) => {
          const response = attempt.responses.find((r) => r.questionId === question.id);
          const selectedChoice = question.choices.find((c) => c.id === response?.selectedChoiceId);
          const correctChoice = question.choices.find((c) => c.isCorrect);
          const isCorrect = response?.isCorrect ?? false;
          const needsReview = response?.needsManualReview || question.type === "ESSAY";

          let yourAnswer = t("student.noAnswer");
          if (question.type === "MCQ") {
            yourAnswer = selectedChoice
              ? localize(selectedChoice.choiceText, locale)
              : t("student.noAnswer");
          } else if (question.type === "SEQUENCE" && response?.textResponse) {
            try {
              const order = JSON.parse(response.textResponse) as string[];
              yourAnswer = order
                .map((id) => {
                  const c = question.choices.find((ch) => ch.id === id);
                  return c ? localize(c.choiceText, locale) : id;
                })
                .join(" → ");
            } catch {
              yourAnswer = response.textResponse;
            }
          } else if (response?.textResponse) {
            yourAnswer = response.textResponse;
          }

          return (
            <Card
              key={question.id}
              className={cn(
                "border-border",
                needsReview
                  ? "border-amber-500/40"
                  : isCorrect
                    ? "border-emerald-500/30"
                    : "border-destructive/30",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {t("student.question")} {index + 1}
                    </Badge>
                    <div className="min-w-0 space-y-1">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {question.type.replace("_", " ")}
                      </Badge>
                      <p className="font-medium text-sm leading-relaxed whitespace-pre-wrap">
                        {localize(question.questionText, locale)}
                      </p>
                    </div>
                  </div>
                  {needsReview ? (
                    <Badge variant="outline" className="shrink-0 text-amber-700">
                      Manual review
                    </Badge>
                  ) : isCorrect ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="size-5 shrink-0 text-destructive" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p>
                  <span className="text-muted-foreground">{t("student.yourAnswer")}: </span>
                  <span
                    className={cn(
                      yourAnswer === t("student.noAnswer") && "text-muted-foreground italic",
                      isCorrect && "font-medium text-emerald-600",
                    )}
                  >
                    {yourAnswer}
                  </span>
                </p>
                {!needsReview && !isCorrect && question.type === "MCQ" && correctChoice && (
                  <p>
                    <span className="text-muted-foreground">{t("student.correctAnswer")}: </span>
                    <span className="font-medium text-emerald-600">
                      {localize(correctChoice.choiceText, locale)}
                    </span>
                  </p>
                )}
                {!needsReview &&
                  !isCorrect &&
                  question.type === "SHORT_TEXT" &&
                  question.config?.acceptedAnswers?.[0] && (
                    <p>
                      <span className="text-muted-foreground">{t("student.correctAnswer")}: </span>
                      <span className="font-medium text-emerald-600">
                        {question.config.acceptedAnswers[0]}
                      </span>
                    </p>
                  )}
                {!needsReview &&
                  !isCorrect &&
                  question.type === "NUMERIC" &&
                  question.config?.correctNumber !== undefined && (
                    <p>
                      <span className="text-muted-foreground">{t("student.correctAnswer")}: </span>
                      <span className="font-medium text-emerald-600">
                        {question.config.correctNumber}
                      </span>
                    </p>
                  )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
