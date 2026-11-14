"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  BookOpen,
  Car,
  ChevronDown,
  FilterX,
  Flame,
  Globe,
  GraduationCap,
  type LucideIcon,
  Play,
  School,
  Search,
  Star,
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
  type CourseKind,
  categoryRankFromKind,
  courseKindFromTitle,
  courseSectionSubtitleKey,
  plainFromHtml,
  shortCourseLabel,
} from "@/lib/public-catalog";
import type { CatalogQuiz, PublicHomepagePayload } from "@/lib/public-quizzes";
import { cn } from "@/lib/utils";
import { type LocalizedText, localize, mediaUrl } from "@/types/quiz";

import { PublicQuizShell } from "./public-quiz-shell";
import type { UnlockQuizTarget } from "./quiz-unlock-modal";

type HomeSection = PublicHomepagePayload["sections"][number];

const QuizUnlockModal = dynamic(() => import("./quiz-unlock-modal").then((m) => m.QuizUnlockModal), {
  ssr: false,
});

function QuizCatalogSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="mt-6 space-y-6">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full bg-slate-200/80" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-64 max-w-full bg-slate-200/80" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl bg-slate-200/70" />
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
  homeSections,
}: {
  embed?: boolean;
  initialQuizzes?: CatalogQuiz[];
  /** When set (home embed), use curated section order/limits instead of keyword ranking. */
  homeSections?: HomeSection[] | null;
} = {}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const hasInitial = Array.isArray(initialQuizzes);
  const [quizzes, setQuizzes] = useState<CatalogQuiz[]>(initialQuizzes ?? []);
  const [sections, setSections] = useState<HomeSection[] | null>(homeSections ?? null);
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

    if (embed) {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/public/homepage?guestSessionId=${encodeURIComponent(guestSessionId)}${userId}`,
      );
      if (!res.ok) throw new Error("Could not load homepage.");
      const data = (await res.json()) as PublicHomepagePayload;
      setSections(data.sections ?? []);
      setQuizzes(data.sections?.flatMap((s) => s.quizzes) ?? []);
      return;
    }

    const res = await fetch(
      `${APP_CONFIG.apiUrl}/public/quizzes?guestSessionId=${encodeURIComponent(guestSessionId)}${userId}`,
    );
    if (!res.ok) throw new Error("Could not load quizzes.");
    setQuizzes(await res.json());
    setSections(null);
  }, [embed]);

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
      const hasPersonalSession = Boolean(getClientCookie("session_token")) || Boolean(getOrCreateGuestLead());
      if (hasPersonalSession) {
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          idleId = window.requestIdleCallback(() => void refreshPersonalized(), { timeout: 2500 });
        } else {
          timer = setTimeout(() => void refreshPersonalized(), 400);
        }
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
    if (sections && sections.length > 0) {
      return sections.map((section) => {
        const title = courseLabel(section.course, locale);
        const kind = courseKind(section.course);
        const modules: { id: string; title: string }[] = [];
        for (const quiz of section.quizzes) {
          if (quiz.module?.id) {
            const modTitle = moduleLabel(quiz.module, locale) ?? "";
            if (!modules.some((m) => m.id === quiz.module!.id)) {
              modules.push({ id: quiz.module.id, title: modTitle });
            }
          }
        }
        return {
          courseId: section.courseId,
          courseTitle: title,
          shortLabel: shortCourseLabel(section.course.title, locale),
          kind,
          modules,
          items: section.quizzes,
        };
      });
    }

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
  }, [quizzes, locale, sections]);

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

  const startHref = (quiz: CatalogQuiz) => (inProgressByQuiz[quiz.id] ? `/quiz/${quiz.id}/take` : `/quiz/${quiz.id}`);

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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [activePill, setActivePill] = useState<string>("all");

  const categoryPills = useMemo(() => {
    const drivingCount = byCourse.find((c) => c.kind === "driving")?.items.length ?? 12;
    const olCount = byCourse.find((c) => c.kind === "ol")?.items.length ?? 86;
    const alCount = byCourse.find((c) => c.kind === "al")?.items.length ?? 64;
    const schoolCount =
      byCourse
        .filter((c) => c.kind === "other" || c.kind === "scholarship")
        .reduce((sum, c) => sum + c.items.length, 0) || 48;
    const popularCount = Math.min(20, quizzes.length || 20);
    const newCount = 8;

    return [
      { id: "driving", label: "Driving Licence Exam", count: drivingCount, icon: Car },
      { id: "ol", label: "G.C.E. O/L", count: olCount, icon: GraduationCap },
      { id: "al", label: "G.C.E. A/L", count: alCount, icon: GraduationCap },
      { id: "school", label: "School Subjects", count: schoolCount, icon: BookOpen },
      { id: "popular", label: "Popular", count: popularCount, icon: Star },
      { id: "new", label: "New", count: newCount, icon: Flame },
    ];
  }, [byCourse, quizzes.length]);

  const filteredCourses = useMemo(() => {
    let result = byCourse;

    // Filter by Level
    if (selectedLevel !== "all") {
      result = result.filter((c) => c.kind === selectedLevel);
    }

    // Filter by Active Category Pill
    if (activePill !== "all") {
      if (activePill === "driving") {
        result = result.filter((c) => c.kind === "driving");
      } else if (activePill === "ol") {
        result = result.filter((c) => c.kind === "ol");
      } else if (activePill === "al") {
        result = result.filter((c) => c.kind === "al");
      } else if (activePill === "school") {
        result = result.filter((c) => c.kind === "other" || c.kind === "scholarship");
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result
        .map((group) => {
          const matchingItems = group.items.filter((item) => {
            const titleEn = localize(item.title, "en").toLowerCase();
            const titleSi = localize(item.title, "si").toLowerCase();
            const titleTa = localize(item.title, "ta").toLowerCase();
            const desc = (plainFromHtml(localize(item.description, locale as "en" | "si" | "ta")) || "").toLowerCase();
            return (
              titleEn.includes(q) ||
              titleSi.includes(q) ||
              titleTa.includes(q) ||
              desc.includes(q) ||
              group.courseTitle.toLowerCase().includes(q)
            );
          });
          return { ...group, items: matchingItems };
        })
        .filter((group) => group.items.length > 0);
    }

    return result;
  }, [byCourse, selectedLevel, activePill, searchQuery, locale]);

  const discoveryBar = (
    <div className="space-y-4 mb-6">
      {/* Large Search Bar with Level Filter (Image 3) */}
      <div className="flex flex-col sm:flex-row items-center gap-2 rounded-2xl border border-[#DFE7F1] bg-white p-2.5 shadow-2xs">
        <div className="relative flex flex-1 items-center w-full">
          <Search className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes, subjects or topics..."
            className="w-full bg-transparent py-2 pl-10 pr-4 text-sm text-[#12243E] placeholder:text-slate-400 focus:outline-hidden"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mr-2 text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-[#DFE7F1] pt-2 sm:pt-0 sm:pl-3">
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value);
              if (e.target.value !== "all") {
                setActivePill(e.target.value);
              } else {
                setActivePill("all");
              }
            }}
            className="w-full sm:w-auto rounded-xl bg-slate-50 border-0 py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer focus:ring-0"
          >
            <option value="all">All Levels</option>
            <option value="driving">Driving Licence</option>
            <option value="ol">G.C.E. O/L</option>
            <option value="al">G.C.E. A/L</option>
            <option value="scholarship">Grade 5 Scholarship</option>
          </select>
        </div>
      </div>

      {/* Category Discovery Pills (Image 3) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {categoryPills.map((pill) => {
          const Icon = pill.icon;
          const isActive = activePill === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                const next = isActive ? "all" : pill.id;
                setActivePill(next);
                if (next === "driving" || next === "ol" || next === "al") {
                  setSelectedLevel(next);
                } else if (next === "all") {
                  setSelectedLevel("all");
                }
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-2xs cursor-pointer",
                isActive
                  ? "bg-[#1769D2] text-white shadow-xs"
                  : "border border-[#DFE7F1] bg-white text-slate-700 hover:border-[#1769D2]/40 hover:bg-slate-50",
              )}
            >
              <Icon className={cn("size-3.5", isActive ? "text-white" : "text-slate-500")} />
              <span>{pill.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const mainPanel = (
    <div className="min-w-0 flex-1 space-y-8">
      {filteredCourses.map((group) => {
        const quizzesForSection =
          group.courseId === activeCourseId && activeModuleId !== "all"
            ? group.items.filter((q) => q.module?.id === activeModuleId)
            : group.items;

        return (
          <section key={group.courseId} id={`course-section-${group.courseId}`} className="scroll-mt-20 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[#DFE7F1] pb-3">
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-tight text-[#12243E] md:text-xl">
                  {group.courseTitle}
                </h2>
                <p className="mt-0.5 text-xs text-[#607089] sm:text-[13px]">{courseSectionSubtitle(group.kind, t)}</p>
              </div>
              <Link
                href={`/quiz/course/${group.courseId}`}
                aria-label={`See all ${group.courseTitle} quizzes`}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#1769D2] transition hover:text-[#1152AA] hover:underline sm:text-sm"
              >
                <span>{t("public.seeAll") || "See All"}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {quizzesForSection.length === 0 ? (
              <PublicEmptyState className="py-8" message={t("public.noQuizzesInModule")} icon={Play} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {quizzesForSection.map((quiz) => {
                  let desc = plainFromHtml(localize(quiz.description, locale as "en" | "si" | "ta"));
                  if (!desc) desc = moduleLabel(quiz.module, locale) ?? "";
                  if (!desc) desc = t("public.cardFallbackDesc");
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
                      languages={quiz.languages}
                      language={quiz.language}
                      href={startHref(quiz)}
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
        {discoveryBar}

        {loading && <QuizCatalogSkeleton label={t("public.loadingQuizzes")} />}

        {error && (
          <PublicErrorBanner
            className="mt-4"
            message={error}
            onRetry={() => void reloadQuizzes()}
            retryLabel={t("student.tryAgain")}
          />
        )}

        {!loading && !error && filteredCourses.length === 0 && (
          <PublicEmptyState
            className="mt-8"
            message={searchQuery ? "No quizzes match your search criteria." : t("public.noQuizzesFound")}
            icon={Play}
          />
        )}

        {!loading && !error && filteredCourses.length > 0 && mainPanel}
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
