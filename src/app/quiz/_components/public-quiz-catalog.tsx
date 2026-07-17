"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Play } from "lucide-react";

import { PublicQuizCard } from "@/components/quiz/public-quiz-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId, getOrCreateGuestLead } from "@/lib/guest-session";
import { cn } from "@/lib/utils";
import { localize, type LocalizedText } from "@/types/quiz";

import { PublicQuizShell } from "./public-quiz-shell";
import { QuizUnlockModal, type UnlockQuizTarget } from "./quiz-unlock-modal";

interface CatalogQuiz {
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

type CourseGroup = {
  courseId: string;
  courseTitle: string;
  shortLabel: string;
  modules: { id: string; title: string }[];
  items: CatalogQuiz[];
};

function plainFromHtml(html: string | null | undefined) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function courseLabel(course: CatalogQuiz["course"], locale: string) {
  return localize(course.title as LocalizedText, locale as "en" | "si" | "ta");
}

function moduleLabel(mod: CatalogQuiz["module"], locale: string) {
  if (!mod) return null;
  return localize(mod.title as LocalizedText, locale as "en" | "si" | "ta");
}

/** Compact labels for the category nav (prefer English title for matching). */
function shortCourseLabel(course: CatalogQuiz["course"], locale: string): string {
  const fullTitle = courseLabel(course, locale);
  const enTitle =
    typeof course.title === "object" && course.title && "en" in course.title
      ? String((course.title as LocalizedText).en ?? "")
      : fullTitle;
  const t = `${enTitle} ${fullTitle}`.toLowerCase();
  if (t.includes("scholarship") || t.includes("ශිෂ්‍යත්ව") || t.includes("புலமை")) {
    return locale === "si" ? "ශිෂ්‍යත්ව" : locale === "ta" ? "புலமைப்பரிசில்" : "Scholarship";
  }
  if (t.includes("ordinary") || t.includes("(o/l)") || t.includes("o/l") || t.includes("සාමාන්‍ය") || t.includes("சாதாரண")) {
    return "O/L";
  }
  if (t.includes("advanced") || t.includes("(a/l)") || t.includes("a/l") || t.includes("උසස්") || t.includes("உயர்")) {
    return "A/L";
  }
  if (t.includes("cambridge") || t.includes("edexcel") || t.includes("international") || t.includes("ජාත්‍යන්තර") || t.includes("சர்வதேச")) {
    return locale === "si" ? "ජාත්‍යන්තර" : locale === "ta" ? "சர்வதேச" : "International";
  }
  return fullTitle.length > 22 ? `${fullTitle.slice(0, 20)}…` : fullTitle;
}

/** Fixed display order: Scholarship, O/L, A/L, International, then anything else. */
function categoryRank(course: CatalogQuiz["course"]): number {
  const enTitle =
    typeof course.title === "object" && course.title && "en" in course.title
      ? String((course.title as LocalizedText).en ?? "")
      : String(course.title ?? "");
  const t = enTitle.toLowerCase();
  if (t.includes("scholarship")) return 0;
  if (t.includes("ordinary") || t.includes("(o/l)") || /\bo\/l\b/.test(t)) return 1;
  if (t.includes("advanced") || t.includes("(a/l)") || /\ba\/l\b/.test(t)) return 2;
  if (t.includes("cambridge") || t.includes("edexcel") || t.includes("international")) return 3;
  return 4;
}

export function PublicQuizCatalog() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [quizzes, setQuizzes] = useState<CatalogQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inProgressByQuiz, setInProgressByQuiz] = useState<Record<string, InProgressSummary>>({});
  const [unlockTarget, setUnlockTarget] = useState<UnlockQuizTarget | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | "all">("all");

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

  const byCourse = useMemo((): CourseGroup[] => {
    const map = new Map<string, CourseGroup & { rank: number }>();
    for (const quiz of quizzes) {
      const title = courseLabel(quiz.course, locale);
      let group = map.get(quiz.course.id);
      if (!group) {
        group = {
          courseId: quiz.course.id,
          courseTitle: title,
          shortLabel: shortCourseLabel(quiz.course, locale),
          modules: [],
          items: [],
          rank: categoryRank(quiz.course),
        };
        map.set(quiz.course.id, group);
      }
      group.items.push(quiz);
      if (quiz.module?.id) {
        const modTitle = moduleLabel(quiz.module, locale) ?? "";
        if (!group.modules.some((m) => m.id === quiz.module!.id)) {
          group.modules.push({ id: quiz.module.id, title: modTitle });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.rank - b.rank);
  }, [quizzes, locale]);

  // Keep selection in sync when quizzes load / locale changes.
  useEffect(() => {
    if (byCourse.length === 0) {
      setActiveCourseId(null);
      return;
    }
    if (!activeCourseId || !byCourse.some((c) => c.courseId === activeCourseId)) {
      setActiveCourseId(byCourse[0].courseId);
      setActiveModuleId("all");
    }
  }, [byCourse, activeCourseId]);

  const activeCourse = useMemo(
    () => byCourse.find((c) => c.courseId === activeCourseId) ?? null,
    [byCourse, activeCourseId],
  );

  const filteredQuizzes = useMemo(() => {
    if (!activeCourse) return [];
    if (activeModuleId === "all") return activeCourse.items;
    return activeCourse.items.filter((q) => q.module?.id === activeModuleId);
  }, [activeCourse, activeModuleId]);

  const firstInProgressId = useMemo(
    () => Object.keys(inProgressByQuiz)[0] ?? null,
    [inProgressByQuiz],
  );

  const needsUnlock = (quiz: CatalogQuiz) =>
    Boolean(quiz.requiresUnlock) && quiz.unlocked !== true;

  const startHref = (quiz: CatalogQuiz) =>
    inProgressByQuiz[quiz.id] ? `/quiz/${quiz.id}/take` : `/quiz/${quiz.id}`;

  const handlePrimary = (quiz: CatalogQuiz) => {
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

  const handleResume = () => {
    if (firstInProgressId) {
      router.push(`/quiz/${firstInProgressId}/take`);
      return;
    }
    document.getElementById("quizzes-by-course")?.scrollIntoView({ behavior: "smooth" });
  };

  const selectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    setActiveModuleId("all");
  };

  return (
    <PublicQuizShell activeNav="quiz">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b2a4a] via-[#1a4a7a] to-[#3b9eff] p-6 text-white shadow-[0_20px_50px_-24px_rgba(11,42,74,0.55)] md:p-10 lg:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-2xl md:size-80"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-1/2 bg-[radial-gradient(ellipse_at_80%_50%,_rgba(255,255,255,0.16),_transparent_55%)] md:block"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-white ring-1 ring-white/25">
              {t("public.hero.badge")}
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-3xl font-extrabold leading-tight tracking-tight md:text-4xl lg:text-[2.75rem]">
              {t("public.hero.title")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
              {t("public.hero.description")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                variant="brand"
                size="lg"
                className="px-6 font-semibold"
                onClick={handleResume}
              >
                <Play className="size-4 fill-current" />
                {firstInProgressId
                  ? t("public.hero.resumeLastQuiz")
                  : t("public.hero.browseQuizzes")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-white/50 bg-transparent px-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                onClick={() => router.push("/quiz/in-progress")}
              >
                {t("public.hero.viewProgress")}
              </Button>
            </div>
          </div>
        </section>

        {loading && (
          <div className="mt-10 flex h-48 items-center justify-center gap-2 text-slate-500">
            <Spinner className="size-6" />
            {t("public.loadingQuizzes")}
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && quizzes.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
            {t("public.noQuizzesYet")}
          </div>
        )}

        {!loading && !error && byCourse.length > 0 && (
          <section id="quizzes-by-course" className="mt-8 scroll-mt-24 md:mt-10">
            {/* Category nav */}
            <nav
              aria-label={t("public.categoryNav")}
              className="sticky top-14 z-20 -mx-4 border-b border-slate-200/80 bg-[#f4f7fb]/95 px-4 backdrop-blur-md md:top-16 md:-mx-0 md:rounded-2xl md:border md:bg-white/90 md:px-2 md:py-2 md:shadow-sm"
            >
              <div className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:py-0 [&::-webkit-scrollbar]:hidden">
                {byCourse.map((group) => {
                  const selected = group.courseId === activeCourseId;
                  return (
                    <button
                      key={group.courseId}
                      type="button"
                      onClick={() => selectCourse(group.courseId)}
                      className={cn(
                        "shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                        selected
                          ? "bg-[#2b7fff] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      {group.shortLabel}
                    </button>
                  );
                })}
              </div>
            </nav>

            {activeCourse ? (
              <div className="mt-6">
                <div className="mb-4">
                  <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">
                    {activeCourse.courseTitle}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500 md:text-[15px]">
                    {t("public.categorySubtitle")}
                  </p>
                </div>

                {/* Module sub-nav */}
                <nav
                  aria-label={t("public.moduleNav")}
                  className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <button
                    type="button"
                    onClick={() => setActiveModuleId("all")}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:text-[13px]",
                      activeModuleId === "all"
                        ? "border-[#2b7fff] bg-[#2b7fff]/10 text-[#1a5fcc]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                    )}
                  >
                    {t("public.allModules")}
                  </button>
                  {activeCourse.modules.map((mod) => {
                    const selected = activeModuleId === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveModuleId(mod.id)}
                        className={cn(
                          "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:text-[13px]",
                          selected
                            ? "border-[#2b7fff] bg-[#2b7fff]/10 text-[#1a5fcc]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                        )}
                      >
                        {mod.title}
                      </button>
                    );
                  })}
                </nav>

                {filteredQuizzes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                    {t("public.noQuizzesInModule")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredQuizzes.map((quiz, i) => {
                      const desc =
                        plainFromHtml(localize(quiz.description, locale as "en" | "si" | "ta")) ||
                        moduleLabel(quiz.module, locale) ||
                        t("public.cardFallbackDesc");
                      return (
                        <PublicQuizCard
                          key={quiz.id}
                          title={localize(quiz.title, locale as "en" | "si" | "ta")}
                          description={desc}
                          durationMinutes={quiz.durationMinutes}
                          questionCount={quiz._count.questions}
                          iconIndex={i}
                          isNew={i === 0}
                          locked={needsUnlock(quiz)}
                          onPrimary={() => handlePrimary(quiz)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </section>
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
