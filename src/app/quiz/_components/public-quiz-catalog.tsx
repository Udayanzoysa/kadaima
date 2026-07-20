"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  FilterX,
  Globe,
  GraduationCap,
  Play,
  School,
  Star,
  type LucideIcon,
} from "lucide-react";

import { PublicQuizCard } from "@/components/quiz/public-quiz-card";
import { PublicCatalogSearch } from "@/components/site/public-catalog-search";
import { PublicEmptyState, PublicErrorBanner } from "@/components/site/public-feedback";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId, getOrCreateGuestLead } from "@/lib/guest-session";
import { PUBLIC_HERO_GLOW_CLASS, PUBLIC_HERO_GRADIENT_CLASS } from "@/lib/public-brand";
import {
  categoryRankFromKind,
  courseKindFromTitle,
  courseSectionSubtitleKey,
  plainFromHtml,
  shortCourseLabel,
  type CourseKind,
} from "@/lib/public-catalog";
import type { CatalogQuiz } from "@/lib/public-quizzes";
import { cn } from "@/lib/utils";
import { mediaUrl, type LocalizedText, localize } from "@/types/quiz";

import { PublicQuizShell } from "./public-quiz-shell";
import type { UnlockQuizTarget } from "./quiz-unlock-modal";

const QuizUnlockModal = dynamic(() => import("./quiz-unlock-modal").then((m) => m.QuizUnlockModal), {
  ssr: false,
});

function QuizCatalogSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]"
    >
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-xl bg-slate-200/80" />
        <Skeleton className="h-40 w-full rounded-2xl bg-slate-200/70" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-7 w-56 max-w-full bg-slate-200/80" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
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
  kind: CourseKind;
  modules: { id: string; title: string }[];
  items: CatalogQuiz[];
};

function courseLabel(course: CatalogQuiz["course"], locale: string) {
  return localize(course.title as LocalizedText, locale as "en" | "si" | "ta");
}

function moduleLabel(mod: CatalogQuiz["module"], locale: string) {
  if (!mod) return null;
  return localize(mod.title as LocalizedText, locale as "en" | "si" | "ta");
}

function courseKind(course: CatalogQuiz["course"]): CourseKind {
  return courseKindFromTitle(course.title);
}

function courseSectionSubtitle(kind: CourseKind, t: (key: string) => string): string {
  return t(courseSectionSubtitleKey(kind));
}

function categoryRank(course: CatalogQuiz["course"]): number {
  return categoryRankFromKind(courseKind(course));
}

function courseIcon(kind: CourseKind): LucideIcon {
  if (kind === "scholarship") return Star;
  if (kind === "ol") return School;
  if (kind === "al") return GraduationCap;
  if (kind === "driving") return Globe;
  return BookOpen;
}

export function PublicQuizCatalog({
  embed = false,
  initialQuizzes,
}: {
  embed?: boolean;
  initialQuizzes?: CatalogQuiz[];
} = {}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const hasInitial = Array.isArray(initialQuizzes);
  const [quizzes, setQuizzes] = useState<CatalogQuiz[]>(initialQuizzes ?? []);
  const [loading, setLoading] = useState(!hasInitial);
  const [error, setError] = useState<string | null>(null);
  const [inProgressByQuiz, setInProgressByQuiz] = useState<Record<string, InProgressSummary>>({});
  const [unlockTarget, setUnlockTarget] = useState<UnlockQuizTarget | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | "all">("all");
  /** When true (search hit), main area shows only the selected course section. */
  const [focusSingleCourse, setFocusSingleCourse] = useState(false);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set());

  const reloadQuizzes = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadProgress = async () => {
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
          if (!cancelled) setInProgressByQuiz(map);
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
          if (!cancelled) setInProgressByQuiz(map);
        }
      }
    };

    const refreshPersonalized = async () => {
      try {
        await reloadQuizzes();
        if (!cancelled) await loadProgress();
      } catch {
        /* keep SSR catalog */
      }
    };

    if (hasInitial) {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => void refreshPersonalized(), { timeout: 2500 });
      } else {
        timer = setTimeout(() => void refreshPersonalized(), 400);
      }
    } else {
      void (async () => {
        try {
          await reloadQuizzes();
          if (!cancelled) await loadProgress();
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Could not load quizzes.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [hasInitial, reloadQuizzes]);

  const byCourse = useMemo((): CourseGroup[] => {
    const map = new Map<string, CourseGroup & { rank: number }>();
    for (const quiz of quizzes) {
      const title = courseLabel(quiz.course, locale);
      let group = map.get(quiz.course.id);
      if (!group) {
        group = {
          courseId: quiz.course.id,
          courseTitle: title,
          shortLabel: shortCourseLabel(quiz.course.title, locale),
          kind: courseKind(quiz.course),
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

  useEffect(() => {
    if (byCourse.length === 0) {
      setActiveCourseId(null);
      return;
    }
    if (!activeCourseId || !byCourse.some((c) => c.courseId === activeCourseId)) {
      const first = byCourse[0].courseId;
      setActiveCourseId(first);
      setActiveModuleId("all");
      setExpandedCourseIds(new Set([first]));
    }
  }, [byCourse, activeCourseId]);

  const firstInProgressId = useMemo(() => Object.keys(inProgressByQuiz)[0] ?? null, [inProgressByQuiz]);

  const needsUnlock = (quiz: CatalogQuiz) => Boolean(quiz.requiresUnlock) && quiz.unlocked !== true;

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

  const selectCourse = (
    courseId: string,
    moduleId: string | "all" = "all",
    opts?: { focusOnly?: boolean; scroll?: boolean },
  ) => {
    setActiveCourseId(courseId);
    setActiveModuleId(moduleId);
    setExpandedCourseIds((prev) => new Set(prev).add(courseId));
    setFocusSingleCourse(Boolean(opts?.focusOnly));
    if (opts?.scroll !== false) {
      window.requestAnimationFrame(() => {
        document.getElementById(`course-section-${courseId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const clearFilters = () => {
    setActiveModuleId("all");
    setFocusSingleCourse(false);
    if (byCourse[0]) {
      setActiveCourseId(byCourse[0].courseId);
      setExpandedCourseIds(new Set([byCourse[0].courseId]));
    }
  };

  const toggleExpanded = (courseId: string) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const visibleCourses = useMemo(() => {
    if (focusSingleCourse && activeCourseId) {
      return byCourse.filter((c) => c.courseId === activeCourseId);
    }
    return byCourse;
  }, [byCourse, focusSingleCourse, activeCourseId]);

  const sidebar = (
    <aside className="w-full shrink-0 space-y-3 md:sticky md:top-20 md:w-[220px] md:self-start lg:w-[250px]">
      <PublicCatalogSearch
        onSelect={(entry) => {
          selectCourse(
            entry.courseId,
            entry.type === "module" && entry.moduleId ? entry.moduleId : "all",
            { focusOnly: true },
          );
        }}
      />

      <nav
        aria-label={t("public.categoryNav")}
        className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm"
      >
        <p className="mb-1.5 px-2 pt-1 text-[10px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
          {t("public.categories")}
        </p>
        <div className="space-y-0.5">
          {byCourse.map((group) => {
            const selected = group.courseId === activeCourseId;
            const expanded = expandedCourseIds.has(group.courseId);
            const Icon = courseIcon(group.kind);
            return (
              <div key={group.courseId}>
                <div className="flex items-stretch gap-0.5">
                  <button
                    type="button"
                    onClick={() => selectCourse(group.courseId, "all", { focusOnly: false })}
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-between rounded-xl px-2.5 py-2 text-[13px] transition",
                      selected
                        ? "bg-[#eef6ff] font-semibold text-[#1563b8]"
                        : "font-medium text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon
                        className="size-4 shrink-0"
                        strokeWidth={1.75}
                        fill={selected && group.kind === "scholarship" ? "currentColor" : "none"}
                      />
                      <span className="truncate">{group.shortLabel}</span>
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        selected
                          ? "bg-[#1563b8]/15 text-[#1563b8]"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {group.items.length}
                    </span>
                  </button>
                  {group.modules.length > 0 ? (
                    <button
                      type="button"
                      aria-label={t("public.moduleNav")}
                      onClick={() => toggleExpanded(group.courseId)}
                      className="rounded-lg px-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-[#1563b8]"
                    >
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                      />
                    </button>
                  ) : null}
                </div>
                {expanded && group.modules.length > 0 ? (
                  <div className="ml-2 space-y-0.5 border-l border-slate-100 py-0.5 pl-3">
                    {group.modules.map((mod) => {
                      const modSelected = selected && activeModuleId === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() =>
                            selectCourse(group.courseId, mod.id, { focusOnly: false })
                          }
                          className={cn(
                            "block w-full rounded-lg px-2 py-1.5 text-left text-xs transition",
                            modSelected
                              ? "font-semibold text-[#1563b8]"
                              : "text-slate-600 hover:text-[#1563b8]",
                          )}
                        >
                          {mod.title}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#eef6ff] px-3 py-2 text-xs font-semibold text-[#1563b8] transition hover:bg-[#dcebff]"
        >
          <FilterX className="size-3.5" />
          {t("public.clearFilters")}
        </button>
      </nav>
    </aside>
  );

  const mainPanel = (
    <div className="min-w-0 flex-1 space-y-6">
      {visibleCourses.map((group) => {
        const quizzesForSection =
          group.courseId === activeCourseId && activeModuleId !== "all"
            ? group.items.filter((q) => q.module?.id === activeModuleId)
            : group.items;

        return (
          <section
            key={group.courseId}
            id={`course-section-${group.courseId}`}
            className="scroll-mt-20 space-y-3"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-2">
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-tight text-[#123a6b] md:text-xl">
                  {group.courseTitle}
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 sm:text-[13px]">
                  {courseSectionSubtitle(group.kind, t)}
                </p>
              </div>
              <Link
                href={`/quiz/course/${group.courseId}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1563b8] transition hover:bg-[#eef6ff] sm:text-sm"
              >
                {t("public.seeAll")}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {quizzesForSection.length === 0 ? (
              <PublicEmptyState
                className="py-8"
                message={t("public.noQuizzesInModule")}
                icon={Play}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {quizzesForSection.map((quiz) => {
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
                      viewCount={quiz._count.attempts ?? 0}
                      coverImageUrl={mediaUrl(quiz.coverImageUrl, APP_CONFIG.apiUrl)}
                      locked={needsUnlock(quiz)}
                      onPrimary={() => handlePrimary(quiz)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );

  const list = (
    <>
      <div id="quizzes-by-course" className="scroll-mt-24">
        {loading && <QuizCatalogSkeleton label={t("public.loadingQuizzes")} />}

        {error && (
          <PublicErrorBanner
            className="mt-4"
            message={error}
            onRetry={() => void reloadQuizzes()}
            retryLabel={t("student.tryAgain")}
          />
        )}

        {!loading && !error && quizzes.length === 0 && (
          <PublicEmptyState className="mt-4" message={t("public.noQuizzesYet")} icon={Play} />
        )}

        {!loading && !error && byCourse.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4 md:mt-5 md:flex-row md:gap-5">
            {sidebar}
            {mainPanel}
          </div>
        ) : null}
      </div>

      {unlockTarget ? (
        <QuizUnlockModal
          open
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
      ) : null}
    </>
  );

  if (embed) return list;

  return (
    <PublicQuizShell activeNav="quiz">
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <section
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 text-white md:p-10 lg:p-12",
            PUBLIC_HERO_GRADIENT_CLASS,
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-2xl md:size-80"
          />
          <div aria-hidden className={PUBLIC_HERO_GLOW_CLASS} />

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
              <Button variant="brand" size="lg" className="px-6 font-semibold" onClick={handleResume}>
                <Play className="size-4 fill-current" />
                {firstInProgressId ? t("public.hero.resumeLastQuiz") : t("public.hero.browseQuizzes")}
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
        {list}
      </main>
    </PublicQuizShell>
  );
}
