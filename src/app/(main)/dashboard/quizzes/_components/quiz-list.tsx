"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { BookOpen } from "lucide-react";
import { toast } from "sonner";

import { PublicQuizCard } from "@/components/quiz/public-quiz-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { LOCALES } from "@/lib/i18n";
import { localize, type QuizAttempt, type QuizSummary } from "@/types/quiz";

interface QuizWithAttempt {
  quiz: QuizSummary;
  attempt: QuizAttempt | null;
}

function plainFromHtml(html: string | null | undefined) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function QuizList() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<QuizWithAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    (async () => {
      try {
        const quizzesRes = await fetch(`${APP_CONFIG.apiUrl}/quizzes?status=Published`, { headers });
        if (!quizzesRes.ok) throw new Error(`Failed to load quizzes (${quizzesRes.status})`);
        const quizzes: QuizSummary[] = await quizzesRes.json();

        const settled = await Promise.allSettled(
          quizzes.map(async (quiz) => {
            const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quiz.id}/my-attempt`, { headers });
            const attempt: QuizAttempt | null = res.ok ? await res.json() : null;
            return { quiz, attempt };
          }),
        );

        const withAttempts = settled.map((result, index) =>
          result.status === "fulfilled" ? result.value : { quiz: quizzes[index], attempt: null },
        );

        setItems(withAttempts);
      } catch (err) {
        console.error("Failed to load quizzes:", err);
        toast.error(t("student.noQuizzes"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const goToQuiz = (quizId: string) => router.push(`/admin/quizzes/${quizId}/take`);
  const goToResult = (quizId: string) => router.push(`/admin/quizzes/${quizId}/result`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">{t("student.myQuizzes")}</h1>
          <p className="text-muted-foreground text-sm">{t("student.myQuizzesDescription")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {loading && (
        <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground text-sm">
          <Spinner className="size-5" />
          {t("student.loadingQuizzes")}
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card className="border-border border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <BookOpen className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t("student.noQuizzes")}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map(({ quiz, attempt }, i) => {
          const isCompleted = attempt && attempt.status !== "In_Progress";
          const isInProgress = attempt && attempt.status === "In_Progress";
          const desc =
            plainFromHtml(localize(quiz.description, locale)) ||
            localize(quiz.course.title, locale);

          let primaryLabel = t("student.startQuiz");
          if (isCompleted) primaryLabel = t("student.viewResult");
          else if (isInProgress) primaryLabel = t("student.resumeQuiz");

          return (
            <PublicQuizCard
              key={quiz.id}
              title={localize(quiz.title, locale)}
              description={desc}
              durationMinutes={quiz.durationMinutes}
              questionCount={quiz._count.questions}
              iconIndex={i}
              isNew={i === 0 && !attempt}
              primaryLabel={primaryLabel}
              onPrimary={() => {
                if (isCompleted) goToResult(quiz.id);
                else goToQuiz(quiz.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
