"use client";

import { useEffect, useState } from "react";

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
import { getOrCreateGuestLead } from "@/lib/guest-session";
import { cn } from "@/lib/utils";
import { localize, mediaUrl, type LocalizedText } from "@/types/quiz";

import { PublicQuizShell } from "./public-quiz-shell";

interface PublicQuizCard {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  coverImageUrl?: string | null;
  durationMinutes: number;
  passingScorePercentage: number;
  course: { id: string; title: string };
  _count: { questions: number };
}

interface InProgressSummary {
  quizId: string;
  answeredCount: number;
  totalQuestions: number;
}

/** Hardcoded upcoming challenges (placeholder until backend supports them). */
const UPCOMING = [
  {
    id: "upcoming-1",
    title: "ගණිත තර්කය",
    titleEn: "Mathematical Logic",
    tag: "PREMIUM",
    tagTone: "bg-[#2b7fff]/10 text-[#2b7fff]",
    subject: "MATHEMATICS",
    subjectTone: "bg-teal-500/10 text-teal-700",
    minutes: 15,
    questions: 25,
    students: "1.2k",
    locked: true,
    accent: "from-[#dbeafe] to-[#eff6ff]",
  },
  {
    id: "upcoming-2",
    title: "පරිසර අධ්‍යයනය",
    titleEn: "Environmental Studies",
    tag: "NEW",
    tagTone: "bg-violet-500/10 text-violet-700",
    subject: "ENVIRONMENT",
    subjectTone: "bg-emerald-500/10 text-emerald-700",
    minutes: 30,
    questions: 25,
    students: "860",
    locked: false,
    accent: "from-[#d1fae5] to-[#ecfdf5]",
  },
  {
    id: "upcoming-3",
    title: "Language Proficiency",
    titleEn: "Language Proficiency",
    tag: "POPULAR",
    tagTone: "bg-fuchsia-500/10 text-fuchsia-700",
    subject: "LANGUAGE",
    subjectTone: "bg-sky-500/10 text-sky-700",
    minutes: 25,
    questions: 20,
    students: "2.1k",
    locked: false,
    accent: "from-[#ede9fe] to-[#f5f3ff]",
  },
  {
    id: "upcoming-4",
    title: "Historical Contexts",
    titleEn: "Historical Contexts",
    tag: "RECOMMENDED",
    tagTone: "bg-slate-500/10 text-slate-600",
    subject: "HISTORY",
    subjectTone: "bg-amber-500/10 text-amber-700",
    minutes: 20,
    questions: 18,
    students: "540",
    locked: true,
    accent: "from-[#ffedd5] to-[#fff7ed]",
  },
] as const;

function plainFromHtml(html: string | null | undefined) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function PublicQuizCatalog() {
  const router = useRouter();
  const { locale } = useI18n();
  const [quizzes, setQuizzes] = useState<PublicQuizCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inProgressByQuiz, setInProgressByQuiz] = useState<Record<string, InProgressSummary>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes`);
        if (!res.ok) throw new Error("Could not load quizzes.");
        setQuizzes(await res.json());

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

  const activeQuiz = quizzes[activeIndex] ?? null;
  const goPrev = () => setActiveIndex((i) => (i <= 0 ? Math.max(quizzes.length - 1, 0) : i - 1));
  const goNext = () => setActiveIndex((i) => (i >= quizzes.length - 1 ? 0 : i + 1));

  const startHref = activeQuiz
    ? inProgressByQuiz[activeQuiz.id]
      ? `/quiz/${activeQuiz.id}/take`
      : `/quiz/${activeQuiz.id}`
    : "/";

  const descPlain = activeQuiz
    ? plainFromHtml(localize(activeQuiz.description, locale))
    : "";

  return (
    <PublicQuizShell activeNav="Quiz">
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
                      New Challenge
                    </span>
                    <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
                      {localize(activeQuiz.title, locale)}
                    </h1>
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
                        onClick={() => router.push(startHref)}
                      >
                        <Play className="size-4 fill-current" />
                        {inProgressByQuiz[activeQuiz.id] ? "Resume" : "Start Now"}
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

                {/* Mobile carousel controls */}
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

            {/* Upcoming Challenges */}
            <section className="mt-10 md:mt-12">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-slate-900 md:text-2xl">
                    Upcoming Challenges
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Personalized recommendations for your Grade 5 prep.
                  </p>
                </div>
                <button type="button" className="shrink-0 text-sm font-semibold text-[#2b7fff]">
                  View All →
                </button>
              </div>

              {/* Desktop: horizontal carousel-style row */}
              <div className="hidden gap-4 md:grid md:grid-cols-2">
                {UPCOMING.slice(0, 2).map((card) => (
                  <UpcomingCard key={card.id} card={card} />
                ))}
              </div>

              {/* Mobile: vertical list */}
              <div className="flex flex-col gap-3 md:hidden">
                {UPCOMING.map((card) => (
                  <UpcomingMobileRow key={card.id} card={card} />
                ))}
              </div>

              {/* Extra desktop cards */}
              <div className="mt-4 hidden gap-4 md:grid md:grid-cols-2">
                {UPCOMING.slice(2).map((card) => (
                  <UpcomingCard key={card.id} card={card} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </PublicQuizShell>
  );
}

function UpcomingCard({ card }: { card: (typeof UPCOMING)[number] }) {
  return (
    <article className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div
        className={cn(
          "flex size-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
          card.accent,
        )}
      >
        <span className="text-2xl font-bold text-[#2b7fff]/70">
          {card.titleEn.charAt(0)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", card.tagTone)}>
              {card.tag}
            </span>
            <span
              className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", card.subjectTone)}
            >
              {card.subject}
            </span>
          </div>
          <button type="button" className="text-slate-300 hover:text-[#2b7fff]" aria-label="Save">
            <Bookmark className="size-4" />
          </button>
        </div>
        <h3 className="mt-2 truncate font-semibold text-slate-900">{card.title}</h3>
        <p className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />
            {card.minutes} Mins
          </span>
          <span>•</span>
          <span>{card.questions} Questions</span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Users className="size-3.5" />
            {card.students} Students Attempted
          </span>
          <Button
            size="sm"
            variant={card.locked ? "default" : "outline"}
            className={cn(
              "rounded-lg font-semibold",
              card.locked
                ? "bg-[#1e3a5f] text-white hover:bg-[#254a75]"
                : "border-[#2b7fff] text-[#2b7fff] hover:bg-[#2b7fff]/5",
            )}
            disabled
          >
            {card.locked ? (
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

function UpcomingMobileRow({ card }: { card: (typeof UPCOMING)[number] }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-[#2b7fff]/80",
          card.accent,
        )}
      >
        {card.titleEn.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", card.tagTone)}>
            {card.tag}
          </span>
        </div>
        <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900">{card.titleEn}</h3>
        <p className="text-[11px] text-slate-500">
          {card.minutes} mins • Intermediate
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-slate-300" />
    </article>
  );
}
