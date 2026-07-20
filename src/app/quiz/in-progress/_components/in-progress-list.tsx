"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Clock3, PlayCircle } from "lucide-react";

import { PublicEmptyState, PublicErrorBanner } from "@/components/site/public-feedback";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId, getOrCreateGuestLead } from "@/lib/guest-session";
import { localize, type LocalizedText } from "@/types/quiz";

import { PublicQuizShell } from "../../_components/public-quiz-shell";
import { QuizListSkeleton } from "../../_components/quiz-list-skeleton";

interface InProgressItem {
  id: string;
  quizId: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  secondsRemaining?: number;
  lastActivityAt: string;
  answeredCount: number;
  totalQuestions: number;
  isExpired: boolean;
  quiz: {
    id: string;
    title: LocalizedText;
    description: LocalizedText | null;
    durationMinutes: number;
    course: { id: string; title: string };
  };
}

function plainFromHtml(html: string | null | undefined) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchInProgress(): Promise<InProgressItem[]> {
  const token = getClientCookie("session_token");
  if (token) {
    const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/me/in-progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
    // Fall through to guest if token invalid
  }

  const lead = getOrCreateGuestLead();
  const guestSessionId = lead?.guestSessionId || ensureGuestSessionId();
  if (!guestSessionId) return [];

  const res = await fetch(
    `${APP_CONFIG.apiUrl}/public/quizzes/in-progress?guestSessionId=${encodeURIComponent(guestSessionId)}`,
  );
  if (!res.ok) throw new Error("Could not load in-progress quizzes.");
  return res.json();
}

export function InProgressList() {
  const router = useRouter();
  const { locale } = useI18n();
  const [items, setItems] = useState<InProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchInProgress());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load in-progress quizzes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PublicQuizShell activeNav="in-progress">
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900 md:text-3xl">
            In Progress
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quizzes you started but haven&apos;t finished — pick up where you left off.
          </p>
        </div>

        {loading && <QuizListSkeleton />}

        {error && (
          <PublicErrorBanner message={error} onRetry={() => void load()} />
        )}

        {!loading && !error && items.length === 0 && (
          <PublicEmptyState
            message="No quizzes in progress right now."
            ctaLabel="Start a quiz"
            icon={PlayCircle}
          />
        )}

        {!loading && !error && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const remainingMins =
              typeof item.secondsRemaining === "number"
                ? Math.max(0, Math.ceil(item.secondsRemaining / 60))
                : Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / 60000));
            const progress =
              item.totalQuestions > 0
                ? Math.round((item.answeredCount / item.totalQuestions) * 100)
                : 0;

            return (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1563b8]">
                  {localize(item.quiz.course.title, locale)}
                </p>
                <h2 className="mt-1.5 font-[family-name:var(--font-outfit)] text-lg font-semibold text-slate-900">
                  {localize(item.quiz.title, locale)}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {plainFromHtml(localize(item.quiz.description, locale))}
                </p>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>
                      Answered{" "}
                      <span className="font-semibold text-slate-800">
                        {item.answeredCount}/{item.totalQuestions}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5" />
                      {item.isExpired ? (
                        <span className="text-amber-600">Time up</span>
                      ) : (
                        `${remainingMins} min left`
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#1563b8] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="brand"
                  className="mt-5 w-full font-bold"
                  onClick={() => router.push(`/quiz/${item.quizId}/take`)}
                >
                  Resume ?
                </Button>
              </article>
            );
          })}
        </div>
        ) : null}
      </main>
    </PublicQuizShell>
  );
}
