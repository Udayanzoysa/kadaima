"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Lock,
  Play,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId, getOrCreateGuestLead } from "@/lib/guest-session";
import { cn } from "@/lib/utils";
import { localize, mediaUrl, type LocalizedText } from "@/types/quiz";

import { PublicQuizShell } from "./public-quiz-shell";
import { QuizUnlockModal, type UnlockQuizTarget } from "./quiz-unlock-modal";

interface PublicQuizCard {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  coverImageUrl?: string | null;
  durationMinutes: number;
  passingScorePercentage: number;
  requiresUnlock?: boolean;
  priceLkr?: number | null;
  unlocked?: boolean;
  course: { id: string; title: LocalizedText | string };
  module?: { id: string; title: LocalizedText | string } | null;
  _count: { questions: number; attempts?: number };
}

interface InProgressSummary {
  quizId: string;
  answeredCount: number;
  totalQuestions: number;
}

function plainFromHtml(html: string | null | undefined) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatAttempts(count: number | undefined) {
  const n = count ?? 0;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

function courseLabel(course: PublicQuizCard["course"], locale: string) {
  return localize(course.title as LocalizedText, locale as "en" | "si" | "ta");
}

function moduleLabel(mod: PublicQuizCard["module"], locale: string) {
  if (!mod) return null;
  return localize(mod.title as LocalizedText, locale as "en" | "si" | "ta");
}

const ACCENTS = [
  "from-[#dbeafe] to-[#eff6ff]",
  "from-[#d1fae5] to-[#ecfdf5]",
  "from-[#ede9fe] to-[#f5f3ff]",
  "from-[#ffedd5] to-[#fff7ed]",
] as const;

export function PublicQuizCatalog() {
  const router = useRouter();
  const { locale } = useI18n();
  const [quizzes, setQuizzes] = useState<PublicQuizCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [inProgressByQuiz, setInProgressByQuiz] = useState<Record<string, InProgressSummary>>({});
  const [unlockTarget, setUnlockTarget] = useState<UnlockQuizTarget | null>(null);

  const reloadQuizzes = async () => {
    const guestSessionId = ensureGuestSessionId();
    let userId = "";
    const token = getClientCookie("session_token");
    if (token) {
      const meRes = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.id) userId = `&userId=${encodeURIComponent(me.id)}`;
      }
    }
    const res = await fetch(
      `${APP_CONFIG.apiUrl}/public/quizzes?guestSessionId=${encodeURIComponent(guestSessionId)}${userId}`,
    );
    if (!res.ok) throw new Error("Could not load quizzes.");
    setQuizzes(await res.json());
  };

  useEffect(() => {
    (async () => {
      try {
        await reloadQuizzes();

        const token = getClientCookie("session_token");
        if (token) {
          const progressRes = await fetch(`${APP_CONFIG.apiUrl}/quizzes/me/in-progress`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (progressRes.ok) {
            const list = (await progressRes.json()) as Array<{
              quizId: string;
              answeredCount: number;
              totalQuestions: number;
            }>;
            const map: Record<string, InProgressSummary> = {};
            for (const item of list) {
              map[item.quizId] = {
                quizId: item.quizId,
                answeredCount: item.answeredCount,
                totalQuestions: item.totalQuestions,
              };
            }
            setInProgressByQuiz(map);
            return;
          }
        }

        const lead = getOrCreateGuestLead();
        if (lead) {
          const progressRes = await fetch(
            `${APP_CONFIG.apiUrl}/public/quizzes/in-progress?guestSessionId=${encodeURIComponent(lead.guestSessionId)}`,
          );
          if (progressRes.ok) {
            const list = (await progressRes.json()) as Array<{
              quizId: string;
              answeredCount: number;
              totalQuestions: number;
            }>;
            const map: Record<string, InProgressSummary> = {};
            for (const item of list) {
              map[item.quizId] = {
                quizId: item.quizId,
                answeredCount: item.answeredCount,
                totalQuestions: item.totalQuestions,
              };
            }
            setInProgressByQuiz(map);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load quizzes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const featured = useMemo(() => quizzes.slice(0, 3), [quizzes]);
  const rest = useMemo(() => quizzes.slice(3), [quizzes]);
  const byCourse = useMemo(() => {
    const map = new Map<string, { courseId: string; courseTitle: string; items: PublicQuizCard[] }>();
    for (const quiz of rest) {
      const title = courseLabel(quiz.course, locale);
      const existing = map.get(quiz.course.id);
      if (existing) existing.items.push(quiz);
      else map.set(quiz.course.id, { courseId: quiz.course.id, courseTitle: title, items: [quiz] });
    }
    return Array.from(map.values());
  }, [rest, locale]);

  const subtitleCourse = quizzes[0] ? courseLabel(quizzes[0].course, locale) : null;

  const activeQuiz = quizzes[activeIndex] ?? null;
  const goPrev = () => setActiveIndex((i) => (i <= 0 ? Math.max(quizzes.length - 1, 0) : i - 1));
  const goNext = () => setActiveIndex((i) => (i >= quizzes.length - 1 ? 0 : i + 1));

  const needsUnlock = (quiz: PublicQuizCard) =>
    Boolean(quiz.requiresUnlock) && quiz.unlocked !== true;

  const startHref = (quiz: PublicQuizCard) =>
    inProgressByQuiz[quiz.id] ? `/quiz/${quiz.id}/take` : `/quiz/${quiz.id}`;

  const handlePrimary = (quiz: PublicQuizCard) => {
    if (needsUnlock(quiz)) {
      setUnlockTarget({
        id: quiz.id,
        title: localize(quiz.title, locale),
        priceLkr: quiz.priceLkr ?? null,
      });
      return;
    }
    router.push(startHref(quiz));
  };

  const descPlain = activeQuiz
    ? plainFromHtml(localize(activeQuiz.description, locale))
    : "";

  const scrollToCourses = () => {
    document.getElementById("quizzes-by-course")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <PublicQuizShell activeNav="quiz">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {loading && (
          <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
            <Spinner className="size-6" />
            Loading quizzes...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && quizzes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
            No published quizzes yet. Check back soon!
          </div>
        )}

        {!loading && activeQuiz && (
          <>
            {/* Hero carousel */}
            <div className="relative">
              {quizzes.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute top-1/2 -left-1 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:border-[#2b7fff]/40 hover:text-[#2b7fff] md:-left-4 md:flex"
                    aria-label="Previous quiz"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute top-1/2 -right-1 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:border-[#2b7fff]/40 hover:text-[#2b7fff] md:-right-4 md:flex"
                    aria-label="Next quiz"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}

              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2b7fff] via-[#3b9eff] to-[#5ec4c0] p-5 text-white shadow-[0_20px_50px_-24px_rgba(43,127,255,0.55)] md:p-8 lg:p-10">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full bg-white/10 blur-2xl md:size-72"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[42%] bg-[radial-gradient(ellipse_at_70%_50%,_rgba(255,255,255,0.18),_transparent_60%)] md:block"
                />

                <div className="relative grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                  <div>
                    <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#2b7fff]">
                      {needsUnlock(activeQuiz) ? "Premium" : "New Challenge"}
                    </span>
                    <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
                      {localize(activeQuiz.title, locale)}
                    </h1>
                    <p className="mt-2 text-sm text-white/85">
                      {courseLabel(activeQuiz.course, locale)}
                      {moduleLabel(activeQuiz.module, locale)
                        ? ` · ${moduleLabel(activeQuiz.module, locale)}`
                        : ""}
                    </p>
                    <p className="mt-3 max-w-xl text-sm text-white/90 md:text-base">
                      {descPlain
                        ? descPlain.slice(0, 140) + (descPlain.length > 140 ? "…" : "")
                        : `Master the fundamentals with our expert-curated time-bound simulation. ${activeQuiz._count.questions} Questions • ${activeQuiz.durationMinutes} Minutes.`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/85 md:text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        {activeQuiz.durationMinutes} mins
                      </span>
                      <span>•</span>
                      <span>{activeQuiz._count.questions} Questions</span>
                      {inProgressByQuiz[activeQuiz.id] && (
                        <>
                          <span>•</span>
                          <span>
                            {inProgressByQuiz[activeQuiz.id].answeredCount}/
                            {inProgressByQuiz[activeQuiz.id].totalQuestions} answered
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button
                        size="lg"
                        className="rounded-xl bg-white px-6 font-bold text-[#2b7fff] hover:bg-white/90"
                        onClick={() => handlePrimary(activeQuiz)}
                      >
                        {needsUnlock(activeQuiz) ? (
                          <>
                            <Lock className="size-4" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Play className="size-4 fill-current" />
                            {inProgressByQuiz[activeQuiz.id] ? "Resume" : "Start Now"}
                          </>
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-xl border-white/40 bg-transparent px-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                        onClick={() => router.push(`/quiz/${activeQuiz.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-inner md:block">
                    {activeQuiz.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(activeQuiz.coverImageUrl, APP_CONFIG.apiUrl) ?? ""}
                        alt={localize(activeQuiz.title, locale)}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                          src="/brand/kadaima-logo.png"
                          alt=""
                          width={180}
                          height={48}
                          className="opacity-90 brightness-0 invert"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {quizzes.length > 1 && (
                  <div className="relative mt-5 flex items-center justify-between md:mt-6">
                    <div className="flex gap-2 md:hidden">
                      <button
                        type="button"
                        onClick={goPrev}
                        className="flex size-9 items-center justify-center rounded-full bg-white/20"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="flex size-9 items-center justify-center rounded-full bg-white/20"
                        aria-label="Next"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                    <div className="ml-auto flex gap-1.5">
                      {quizzes.map((q, i) => (
                        <button
                          key={q.id}
                          type="button"
                          aria-label={`Go to quiz ${i + 1}`}
                          onClick={() => setActiveIndex(i)}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Upcoming Challenges — live data */}
            <section className="mt-10 md:mt-12">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-slate-900 md:text-2xl">
                    Upcoming Challenges
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {subtitleCourse
                      ? `Recommended quizzes for ${subtitleCourse}.`
                      : "Recommended quizzes for you."}
                  </p>
                </div>
                {byCourse.length > 0 && (
                  <button
                    type="button"
                    onClick={scrollToCourses}
                    className="shrink-0 text-sm font-semibold text-[#2b7fff]"
                  >
                    View All →
                  </button>
                )}
              </div>

              {featured.length > 0 && (
                <div className="relative">
                  {featured.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setChallengeIndex((i) =>
                            i <= 0 ? featured.length - 1 : i - 1,
                          )
                        }
                        className="absolute top-1/2 -left-1 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm md:-left-3 md:flex"
                        aria-label="Previous challenge"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setChallengeIndex((i) =>
                            i >= featured.length - 1 ? 0 : i + 1,
                          )
                        }
                        className="absolute top-1/2 -right-1 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm md:-right-3 md:flex"
                        aria-label="Next challenge"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </>
                  )}

                  {/* Desktop: show up to 3 in a row; carousel highlights active on smaller desktop */}
                  <div className="hidden gap-4 md:grid md:grid-cols-3">
                    {featured.map((quiz, i) => (
                      <UpcomingCard
                        key={quiz.id}
                        quiz={quiz}
                        locale={locale}
                        accent={ACCENTS[i % ACCENTS.length]}
                        locked={needsUnlock(quiz)}
                        onPrimary={() => handlePrimary(quiz)}
                      />
                    ))}
                  </div>

                  {/* Mobile carousel: one card at a time */}
                  <div className="md:hidden">
                    {featured[challengeIndex] && (
                      <UpcomingCard
                        quiz={featured[challengeIndex]}
                        locale={locale}
                        accent={ACCENTS[challengeIndex % ACCENTS.length]}
                        locked={needsUnlock(featured[challengeIndex])}
                        onPrimary={() => handlePrimary(featured[challengeIndex])}
                      />
                    )}
                    {featured.length > 1 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {featured.map((q, i) => (
                          <button
                            key={q.id}
                            type="button"
                            aria-label={`Challenge ${i + 1}`}
                            onClick={() => setChallengeIndex(i)}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              i === challengeIndex
                                ? "w-6 bg-[#2b7fff]"
                                : "w-1.5 bg-slate-300",
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Remaining quizzes by course */}
            {byCourse.length > 0 && (
              <section id="quizzes-by-course" className="mt-12 scroll-mt-24 space-y-10">
                {byCourse.map((group) => (
                  <div key={group.courseId}>
                    <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">
                      {group.courseTitle}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {group.items.length} quiz{group.items.length === 1 ? "" : "zes"} in this course
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {group.items.map((quiz, i) => (
                        <UpcomingCard
                          key={quiz.id}
                          quiz={quiz}
                          locale={locale}
                          accent={ACCENTS[i % ACCENTS.length]}
                          locked={needsUnlock(quiz)}
                          onPrimary={() => handlePrimary(quiz)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <QuizUnlockModal
        open={Boolean(unlockTarget)}
        onOpenChange={(open) => {
          if (!open) setUnlockTarget(null);
        }}
        quiz={unlockTarget}
        onUnlocked={async (quizId) => {
          try {
            await reloadQuizzes();
          } catch {
            /* ignore */
          }
          router.push(`/quiz/${quizId}`);
        }}
      />
    </PublicQuizShell>
  );
}

function UpcomingCard({
  quiz,
  locale,
  accent,
  locked,
  onPrimary,
}: {
  quiz: PublicQuizCard;
  locale: string;
  accent: string;
  locked: boolean;
  onPrimary: () => void;
}) {
  const title = localize(quiz.title, locale as "en" | "si" | "ta");
  const category = courseLabel(quiz.course, locale);
  const moduleName = moduleLabel(quiz.module, locale);
  const initial = title.charAt(0).toUpperCase() || "?";

  return (
    <article className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div
        className={cn(
          "flex size-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
          accent,
        )}
      >
        <span className="text-2xl font-bold text-[#2b7fff]/70">{initial}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {locked && (
              <span className="rounded-full bg-[#2b7fff]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#2b7fff]">
                Premium
              </span>
            )}
            <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-700">
              {category}
            </span>
          </div>
          <button type="button" className="text-slate-300 hover:text-[#2b7fff]" aria-label="Save">
            <Bookmark className="size-4" />
          </button>
        </div>
        <h3 className="mt-2 truncate font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {category}
          {moduleName ? ` · ${moduleName}` : ""}
        </p>
        <p className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />
            {quiz.durationMinutes} Mins
          </span>
          <span>•</span>
          <span>{quiz._count.questions} Questions</span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Users className="size-3.5" />
            {formatAttempts(quiz._count.attempts)} Students Attempted
          </span>
          <Button
            size="sm"
            variant={locked ? "default" : "outline"}
            className={cn(
              "rounded-lg font-semibold",
              locked
                ? "bg-[#1e3a5f] text-white hover:bg-[#254a75]"
                : "border-[#2b7fff] text-[#2b7fff] hover:bg-[#2b7fff]/5",
            )}
            onClick={onPrimary}
          >
            {locked ? (
              <>
                <Lock className="size-3.5" />
                Unlock
              </>
            ) : (
              "Start"
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
