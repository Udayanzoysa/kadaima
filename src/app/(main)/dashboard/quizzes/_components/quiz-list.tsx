"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { BookOpen, CheckCircle2, ClipboardList, Clock, Target, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

        // Use allSettled so a single failed attempt-status lookup doesn't
        // wipe out the whole list — worst case that quiz just shows "Start".
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map(({ quiz, attempt }) => {
          const isCompleted = attempt && attempt.status !== "In_Progress";
          const isInProgress = attempt && attempt.status === "In_Progress";

          return (
            <Card key={quiz.id} className="flex flex-col border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{localize(quiz.title, locale)}</CardTitle>
                  {isCompleted && (
                    <Badge variant={attempt.isPassed ? "default" : "destructive"} className="shrink-0">
                      {attempt.status === "Timed_Out"
                        ? t("student.timedOutStatus")
                        : attempt.isPassed
                          ? t("student.passed")
                          : t("student.failed")}
                    </Badge>
                  )}
                  {isInProgress && (
                    <Badge variant="secondary" className="shrink-0">
                      {t("student.inProgress")}
                    </Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">{localize(quiz.description, locale)}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <ClipboardList className="size-4" />
                  {quiz._count.questions} {t("student.questionsLabel")}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  {t("student.duration")}: {quiz.durationMinutes} {t("student.minutes")}
                </div>
                <div className="flex items-center gap-2">
                  <Target className="size-4" />
                  {t("student.passingScore")}: {quiz.passingScorePercentage}%
                </div>
                <Badge variant="outline">{quiz.course.title}</Badge>
              </CardContent>
              <CardFooter>
                {isCompleted ? (
                  <Button className="w-full" variant="outline" onClick={() => goToResult(quiz.id)}>
                    {attempt.isPassed ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                    {t("student.viewResult")}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => goToQuiz(quiz.id)}>
                    {isInProgress ? t("student.resumeQuiz") : t("student.startQuiz")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
