"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Award, CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getGuestQuizCount } from "@/lib/guest-session";
import { LOCALES } from "@/lib/i18n";
import { safeJson } from "@/lib/safe-json";
import { cn } from "@/lib/utils";
import { localize, type AttemptDetail } from "@/types/quiz";

export function PublicQuizResult() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { locale, setLocale } = useI18n();

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState(0);

  useEffect(() => {
    setQuizCount(getGuestQuizCount());
    (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/results/${token}`);
        if (!res.ok) {
          const body = await safeJson<{ message?: string }>(res);
          throw new Error(body?.message || "Result not found.");
        }
        const detail = await safeJson<AttemptDetail>(res);
        if (!detail) throw new Error("Empty result response.");
        setAttempt(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load result.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b3d2e] text-white/70">
        <Spinner className="size-7" />
        <span className="ml-2">Loading result...</span>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b3d2e] px-4 text-center text-white">
        <p>{error ?? "Result not found."}</p>
        <Button asChild variant="secondary">
          <Link href="/">Back to quizzes</Link>
        </Button>
      </div>
    );
  }

  const isPassed = attempt.isPassed;

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-[#0b3d2e]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 md:px-6">
        <Link href="/" className="font-[family-name:var(--font-nunito-sans)] text-lg font-extrabold">
          {APP_CONFIG.name}
        </Link>
        <div className="flex gap-1.5">
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
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 md:px-6">
        {quizCount >= 3 && (
          <div className="rounded-2xl border border-[#e8c96a] bg-[#fff8e1] px-5 py-4 text-sm">
            <p className="font-bold">Wow! You&apos;ve completed {quizCount} quizzes!</p>
            <p className="mt-1 text-[#0b3d2e]/70">
              Create a free permanent account to save your badges and compete on the school leaderboard.
            </p>
            <Button asChild className="mt-3 bg-[#0b3d2e] hover:bg-[#145a44]" size="sm">
              <Link href="/auth/v1/register">Register now</Link>
            </Button>
          </div>
        )}

        <section
          className={cn(
            "rounded-2xl border-2 px-6 py-10 text-center",
            isPassed ? "border-emerald-500/40 bg-emerald-50" : "border-red-400/40 bg-red-50",
          )}
        >
          {isPassed ? <Award className="mx-auto size-14 text-emerald-600" /> : <XCircle className="mx-auto size-14 text-red-500" />}
          <h1 className="mt-3 font-[family-name:var(--font-nunito-sans)] text-2xl font-extrabold">
            {localize(attempt.quiz.title, locale)}
          </h1>
          <p className="text-sm text-[#0b3d2e]/60">{attempt.quiz.course.title}</p>
          <p className="mt-4 text-sm text-[#0b3d2e]/60">Your score</p>
          <p className={cn("text-5xl font-extrabold", isPassed ? "text-emerald-600" : "text-red-500")}>
            {attempt.finalScore}%
          </p>
          <Progress value={attempt.finalScore} className="mx-auto mt-3 h-2 w-48" />
          <p className="mt-3 font-medium">
            {isPassed ? "Congratulations, you passed!" : "Keep practising — you can try another quiz!"}
          </p>
          <Badge variant="outline" className="mt-3 border-[#0b3d2e]/20">
            Pass mark {attempt.quiz.passingScorePercentage}%
          </Badge>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-nunito-sans)] text-lg font-extrabold">Review answers</h2>
          {attempt.quiz.questions.map((question, index) => {
            const response = attempt.responses.find((r) => r.questionId === question.id);
            const selected = question.choices.find((c) => c.id === response?.selectedChoiceId);
            const correct = question.choices.find((c) => c.isCorrect);
            const isCorrect = response?.isCorrect ?? false;

            return (
              <article
                key={question.id}
                className={cn(
                  "rounded-2xl border bg-white p-4",
                  isCorrect ? "border-emerald-500/30" : "border-red-400/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline">Q{index + 1}</Badge>
                    <p className="font-medium text-sm">{localize(question.questionText, locale)}</p>
                  </div>
                  {isCorrect ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="size-5 shrink-0 text-red-500" />
                  )}
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-[#0b3d2e]/60">Your answer: </span>
                  {selected ? localize(selected.choiceText, locale) : "No answer"}
                </p>
                {!isCorrect && correct && (
                  <p className="text-sm">
                    <span className="text-[#0b3d2e]/60">Correct: </span>
                    <span className="font-medium text-emerald-700">{localize(correct.choiceText, locale)}</span>
                  </p>
                )}
              </article>
            );
          })}
        </section>

        <Button asChild className="bg-[#0b3d2e] hover:bg-[#145a44]">
          <Link href="/">Try another quiz</Link>
        </Button>
      </main>
    </div>
  );
}
