"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Award, CheckCircle2, ClipboardList, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getOrCreateGuestLead } from "@/lib/guest-session";
import { localize, type LocalizedText } from "@/types/quiz";

import { PublicQuizShell } from "../../_components/public-quiz-shell";

interface CompletedAttempt {
  id: string;
  quizId: string;
  status: "Submitted" | "Timed_Out";
  resultToken: string | null;
  startedAt: string;
  submittedAt: string | null;
  finalScore: number;
  isPassed: boolean;
  correctCount: number;
  totalQuestions: number;
  quiz: {
    id: string;
    title: LocalizedText;
    description: LocalizedText | null;
    durationMinutes: number;
    passingScorePercentage: number;
    course: { id: string; title: string };
  };
}

export function MyAttemptsList() {
  const router = useRouter();
  const { locale } = useI18n();
  const [items, setItems] = useState<CompletedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLead, setNeedsLead] = useState(false);

  useEffect(() => {
    (async () => {
      const lead = getOrCreateGuestLead();
      if (!lead) {
        setNeedsLead(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${APP_CONFIG.apiUrl}/public/quizzes/my-attempts?guestSessionId=${encodeURIComponent(lead.guestSessionId)}`,
        );
        if (!res.ok) throw new Error("Could not load your attempts.");
        setItems(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your attempts.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PublicQuizShell activeNav="My Attempts">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900 md:text-3xl">
            My Attempts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Finished quizzes — review your score and answers anytime.
          </p>
        </div>

        {loading && (
          <div className="flex h-48 items-center justify-center gap-2 text-slate-500">
            <Spinner className="size-6" />
            Loading...
          </div>
        )}

        {needsLead && (
          <EmptyState message="Complete a quiz to see your results here." cta="Browse quizzes" />
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !needsLead && !error && items.length === 0 && (
          <EmptyState message="No completed attempts yet." cta="Take a quiz" />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const submittedLabel = item.submittedAt
              ? new Date(item.submittedAt).toLocaleString()
              : "—";
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2b7fff]">
                    {item.quiz.course.title}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      item.isPassed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {item.isPassed ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <XCircle className="size-3.5" />
                    )}
                    {item.status === "Timed_Out"
                      ? "Timed out"
                      : item.isPassed
                        ? "Passed"
                        : "Failed"}
                  </span>
                </div>

                <h2 className="mt-2 font-[family-name:var(--font-outfit)] text-lg font-semibold text-slate-900">
                  {localize(item.quiz.title, locale)}
                </h2>

                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Score</p>
                    <p
                      className={`font-[family-name:var(--font-outfit)] text-3xl font-bold ${
                        item.isPassed ? "text-emerald-600" : "text-[#2b7fff]"
                      }`}
                    >
                      {item.finalScore}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.correctCount}/{item.totalQuestions} correct · Pass{" "}
                      {item.quiz.passingScorePercentage}%
                    </p>
                  </div>
                  <Award
                    className={`size-10 shrink-0 ${item.isPassed ? "text-emerald-400" : "text-slate-200"}`}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-400">Submitted {submittedLabel}</p>

                <Button
                  className="mt-5 w-full rounded-xl bg-[#2b7fff] font-bold hover:bg-[#1f6ae0]"
                  disabled={!item.resultToken}
                  onClick={() => {
                    if (item.resultToken) router.push(`/results/${item.resultToken}`);
                  }}
                >
                  Review result →
                </Button>
              </article>
            );
          })}
        </div>
      </main>
    </PublicQuizShell>
  );
}

function EmptyState({ message, cta }: { message: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <ClipboardList className="mx-auto size-10 text-slate-300" />
      <p className="mt-3 text-slate-500">{message}</p>
      <Button asChild className="mt-4 rounded-xl bg-[#2b7fff] font-semibold hover:bg-[#1f6ae0]">
        <Link href="/">{cta}</Link>
      </Button>
    </div>
  );
}
