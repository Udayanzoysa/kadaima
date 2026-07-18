"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Award, CheckCircle2, Globe, XCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ProfileMenu, type SiteAuthUser } from "@/components/site/profile-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { KadaimaLoader } from "@/components/site/kadaima-loader";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { deleteClientCookie, getClientCookie } from "@/lib/cookie.client";
import { getGuestQuizCount } from "@/lib/guest-session";
import { LOCALES } from "@/lib/i18n";
import { safeJson } from "@/lib/safe-json";
import { cn } from "@/lib/utils";
import { localize, type AttemptDetail } from "@/types/quiz";

export function PublicQuizResult() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { locale, setLocale, t } = useI18n();
  const localeMeta = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState(0);
  const [authUser, setAuthUser] = useState<SiteAuthUser | null | undefined>(undefined);

  useEffect(() => {
    setQuizCount(getGuestQuizCount());

    const authToken = getClientCookie("session_token");
    if (!authToken) {
      setAuthUser(null);
    } else {
      (async () => {
        try {
          const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (!res.ok) {
            deleteClientCookie("session_token");
            setAuthUser(null);
            return;
          }
          const data = await res.json();
          setAuthUser({ name: data.name, email: data.email, team: data.team });
        } catch {
          setAuthUser(null);
        }
      })();
    }

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

  const header = (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <BrandLogo className="h-8 w-auto md:h-9" priority />
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition hover:border-[#2b7fff]/40 hover:text-[#2b7fff]"
            onClick={() => {
              const idx = LOCALES.findIndex((l) => l.code === locale);
              setLocale(LOCALES[(idx + 1) % LOCALES.length].code);
            }}
          >
            <Globe className="size-3.5" />
            <span className="max-w-[4.5rem] truncate">{localeMeta.label}</span>
          </button>

          {authUser === undefined ? (
            <div className="flex items-center gap-1.5" aria-busy="true" aria-label="Loading account">
              <span className="hidden h-9 w-[4.5rem] animate-pulse rounded-full bg-slate-200/90 sm:inline-block" />
              <span className="inline-block h-9 w-[7.5rem] animate-pulse rounded-full bg-slate-200/90 sm:w-[9.5rem]" />
            </div>
          ) : authUser ? (
            <ProfileMenu user={authUser} />
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-[#2b7fff]/40 hover:text-[#2b7fff] sm:px-3.5"
              >
                {t("public.nav.login")}
              </Link>
              <Link
                href="/student/register"
                className="inline-flex h-9 items-center rounded-full bg-[#2b7fff] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1f6fe6] sm:px-3.5"
              >
                {t("public.nav.register")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  if (loading) {
    return <KadaimaLoader variant="page" label="Kadaima is loading…" className="min-h-screen" />;
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
        {header}
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <p className="text-slate-600">{error ?? "Result not found."}</p>
          <Button asChild variant="brand" className="font-semibold">
            <Link href="/">Back to quizzes</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isPassed = attempt.isPassed;
  const showRegisterCta = !authUser && quizCount >= 3;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {header}

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 pb-16 md:px-6">
        {showRegisterCta && (
          <div className="rounded-2xl border border-[#bcd8ff] bg-[#eef6ff] px-5 py-4 text-sm">
            <p className="font-bold text-slate-900">
              Wow! You&apos;ve completed {quizCount} quizzes!
            </p>
            <p className="mt-1 text-slate-600">
              Create a free permanent account to save your badges and compete on the school leaderboard.
            </p>
            <Button asChild variant="brand" className="mt-3 font-semibold" size="sm">
              <Link href="/student/register">Register now</Link>
            </Button>
          </div>
        )}

        <section
          className={cn(
            "rounded-2xl border-2 px-6 py-10 text-center",
            isPassed ? "border-emerald-500/40 bg-emerald-50" : "border-red-400/40 bg-red-50",
          )}
        >
          {isPassed ? (
            <Award className="mx-auto size-14 text-emerald-600" />
          ) : (
            <XCircle className="mx-auto size-14 text-red-500" />
          )}
          <h1 className="mt-3 font-[family-name:var(--font-outfit)] text-2xl font-extrabold text-slate-900">
            {localize(attempt.quiz.title, locale)}
          </h1>
          <p className="text-sm text-slate-500">{localize(attempt.quiz.course.title, locale)}</p>
          <p className="mt-4 text-sm text-slate-500">Your score</p>
          <p className={cn("text-5xl font-extrabold", isPassed ? "text-emerald-600" : "text-red-500")}>
            {attempt.finalScore}%
          </p>
          <Progress value={attempt.finalScore} className="mx-auto mt-3 h-2 w-48" />
          <p className="mt-3 font-medium text-slate-800">
            {isPassed ? "Congratulations, you passed!" : "Keep practising — you can try another quiz!"}
          </p>
          <Badge variant="outline" className="mt-3 border-slate-300 text-slate-600">
            Pass mark {attempt.quiz.passingScorePercentage}%
          </Badge>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-extrabold text-slate-900">
            Review answers
          </h2>
          {attempt.quiz.questions.map((question, index) => {
            const response = attempt.responses.find((r) => r.questionId === question.id);
            const selected = question.choices.find((c) => c.id === response?.selectedChoiceId);
            const correct = question.choices.find((c) => c.isCorrect);
            const isCorrect = response?.isCorrect ?? false;

            return (
              <article
                key={question.id}
                className={cn(
                  "rounded-2xl border bg-white p-4 shadow-sm",
                  isCorrect ? "border-emerald-500/30" : "border-red-400/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="border-slate-300 text-slate-600">
                      Q{index + 1}
                    </Badge>
                    <p className="text-sm font-medium text-slate-800">
                      {localize(question.questionText, locale)}
                    </p>
                  </div>
                  {isCorrect ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="size-5 shrink-0 text-red-500" />
                  )}
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-slate-500">Your answer: </span>
                  {selected ? localize(selected.choiceText, locale) : "No answer"}
                </p>
                {!isCorrect && correct && (
                  <p className="text-sm">
                    <span className="text-slate-500">Correct: </span>
                    <span className="font-medium text-emerald-700">
                      {localize(correct.choiceText, locale)}
                    </span>
                  </p>
                )}
              </article>
            );
          })}
        </section>

        <Button asChild variant="brand" className="font-semibold">
          <Link href="/">Try another quiz</Link>
        </Button>
      </main>
    </div>
  );
}
