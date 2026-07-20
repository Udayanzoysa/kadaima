"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

import { FilterX, Play } from "lucide-react";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import type { UnlockQuizTarget } from "@/app/quiz/_components/quiz-unlock-modal";
import { PublicQuizCard } from "@/components/quiz/public-quiz-card";
import { PublicBreadcrumbs } from "@/components/site/public-breadcrumbs";
import { PublicCatalogSearch } from "@/components/site/public-catalog-search";
import { PublicEmptyState, PublicErrorBanner } from "@/components/site/public-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId, getOrCreateGuestLead } from "@/lib/guest-session";
import {
  courseKindFromTitle,
  courseSectionSubtitleKey,
  filterQuizzesByModule,
  plainFromHtml,
} from "@/lib/public-catalog";
import type { CatalogQuiz } from "@/lib/public-quizzes";
import { cn } from "@/lib/utils";
import { mediaUrl, type LocalizedText, localize } from "@/types/quiz";

const QuizUnlockModal = dynamic(
  () => import("@/app/quiz/_components/quiz-unlock-modal").then((m) => m.QuizUnlockModal),
  { ssr: false },
);

function sectionSubtitle(
  kind: ReturnType<typeof courseKindFromTitle>,
  t: (key: string) => string,
): string {
  return t(courseSectionSubtitleKey(kind));
}

export function CourseQuizzesView({
  courseId,
  initialQuizzes,
}: {
  courseId: string;
  initialQuizzes: CatalogQuiz[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const [quizzes, setQuizzes] = useState<CatalogQuiz[]>(initialQuizzes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inProgressByQuiz, setInProgressByQuiz] = useState<Record<string, boolean>>({});
  const [unlockTarget, setUnlockTarget] = useState<UnlockQuizTarget | null>(null);

  const moduleFromUrl = searchParams.get("module")?.trim() || "all";
  const [activeModuleId, setActiveModuleId] = useState<string | "all">(moduleFromUrl);

  useEffect(() => {
    setActiveModuleId(moduleFromUrl);
  }, [moduleFromUrl]);

  const courseTitle = useMemo(() => {
    const first = quizzes[0] ?? initialQuizzes[0];
    if (!first) return t("public.coursePageFallbackTitle");
    return localize(first.course.title as LocalizedText, locale as "en" | "si" | "ta");
  }, [quizzes, initialQuizzes, locale, t]);

  const kind = useMemo(() => {
    const first = quizzes[0] ?? initialQuizzes[0];
    return first ? courseKindFromTitle(first.course.title) : "other";
  }, [quizzes, initialQuizzes]);

  const modules = useMemo(() => {
    const map = new Map<string, string>();
    for (const quiz of quizzes) {
      if (!quiz.module?.id) continue;
      const title = localize(quiz.module.title as LocalizedText, locale as "en" | "si" | "ta");
      if (!map.has(quiz.module.id)) map.set(quiz.module.id, title);
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [quizzes, locale]);

  const visibleQuizzes = useMemo(
    () => filterQuizzesByModule(quizzes, activeModuleId),
    [quizzes, activeModuleId],
  );

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
      `${APP_CONFIG.apiUrl}/public/quizzes?courseId=${encodeURIComponent(courseId)}&guestSessionId=${encodeURIComponent(guestSessionId)}${userId}`,
    );
    if (!res.ok) throw new Error(t("public.courseLoadError"));
    setQuizzes((await res.json()) as CatalogQuiz[]);
  }, [courseId, t]);

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
          const list = (await progressRes.json()) as Array<{ quizId: string }>;
          const map: Record<string, boolean> = {};
          for (const item of list) map[item.quizId] = true;
          if (!cancelled) setInProgressByQuiz(map);
          return;
        }
      }
      const lead = getOrCreateGuestLead();
      if (!lead) return;
      const progressRes = await fetch(
        `${APP_CONFIG.apiUrl}/public/quizzes/in-progress?guestSessionId=${encodeURIComponent(lead.guestSessionId)}`,
      );
      if (progressRes.ok) {
        const list = (await progressRes.json()) as Array<{ quizId: string }>;
        const map: Record<string, boolean> = {};
        for (const item of list) map[item.quizId] = true;
        if (!cancelled) setInProgressByQuiz(map);
      }
    };

    const refresh = async () => {
      try {
        await reloadQuizzes();
        if (!cancelled) await loadProgress();
      } catch {
        /* keep SSR list */
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => void refresh(), { timeout: 2500 });
    } else {
      timer = setTimeout(() => void refresh(), 400);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [reloadQuizzes]);

  const setModuleFilter = (moduleId: string | "all") => {
    setActiveModuleId(moduleId);
    const params = new URLSearchParams(searchParams.toString());
    if (moduleId === "all") params.delete("module");
    else params.set("module", moduleId);
    const qs = params.toString();
    const path = `/quiz/course/${courseId}`;
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  };

  const needsUnlock = (quiz: CatalogQuiz) =>
    Boolean(quiz.requiresUnlock) && quiz.unlocked !== true;

  const handlePrimary = (quiz: CatalogQuiz) => {
    if (needsUnlock(quiz)) {
      setUnlockTarget({
        id: quiz.id,
        title: localize(quiz.title, locale as "en" | "si" | "ta"),
        priceLkr: quiz.priceLkr ?? null,
      });
      return;
    }
    router.push(inProgressByQuiz[quiz.id] ? `/quiz/${quiz.id}/take` : `/quiz/${quiz.id}`);
  };

  const countLabel =
    quizzes.length === 1
      ? t("public.quizReadyOne")
      : t("public.quizzesReady").replace("{count}", String(quizzes.length));

  return (
    <PublicQuizShell activeNav="quiz">
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
        <PublicBreadcrumbs
          className="mb-3"
          items={[
            { label: t("public.breadcrumbHome"), href: "/" },
            { label: t("public.breadcrumbQuizzes"), href: "/quiz" },
            { label: courseTitle },
          ]}
        />

        <header className="mb-4 border-b border-slate-200/70 pb-3">
          <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-tight break-words text-[#123a6b] sm:text-xl md:text-2xl">
            {courseTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{sectionSubtitle(kind, t)}</p>
          <p className="mt-1 text-xs font-medium text-[#1563b8]">{countLabel}</p>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
          <aside className="w-full shrink-0 space-y-3 lg:sticky lg:top-20 lg:w-[250px] lg:self-start">
            <PublicCatalogSearch />

            {modules.length > 0 ? (
              <nav
                aria-label={t("public.moduleNav")}
                className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm"
              >
                <p className="mb-1.5 px-2 pt-1 text-[10px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                  {t("public.moduleNav")}
                </p>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setModuleFilter("all")}
                    className={cn(
                      "flex w-full items-center rounded-xl px-2.5 py-2 text-left text-[13px] transition",
                      activeModuleId === "all"
                        ? "bg-[#eef6ff] font-semibold text-[#1563b8]"
                        : "font-medium text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {t("public.allModules")}
                  </button>
                  {modules.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setModuleFilter(mod.id)}
                      className={cn(
                        "block w-full rounded-xl px-2.5 py-2 text-left text-[13px] transition",
                        activeModuleId === mod.id
                          ? "bg-[#eef6ff] font-semibold text-[#1563b8]"
                          : "font-medium text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      {mod.title}
                    </button>
                  ))}
                </div>
                {activeModuleId !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setModuleFilter("all")}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#eef6ff] px-3 py-2 text-xs font-semibold text-[#1563b8] transition hover:bg-[#dcebff]"
                  >
                    <FilterX className="size-3.5" />
                    {t("public.clearFilters")}
                  </button>
                ) : null}
              </nav>
            ) : null}
          </aside>

          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl bg-slate-200/70" />
                ))}
              </div>
            ) : null}

            {error ? (
              <PublicErrorBanner
                className="mb-4"
                message={error}
                onRetry={() => {
                  setLoading(true);
                  setError(null);
                  void reloadQuizzes()
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : t("public.courseLoadError")),
                    )
                    .finally(() => setLoading(false));
                }}
                retryLabel={t("student.tryAgain")}
              />
            ) : null}

            {!loading && !error && visibleQuizzes.length === 0 ? (
              <PublicEmptyState message={t("public.noQuizzesInModule")} icon={Play} />
            ) : null}

            {!loading && visibleQuizzes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleQuizzes.map((quiz) => {
                  const desc =
                    plainFromHtml(localize(quiz.description, locale as "en" | "si" | "ta")) ||
                    (quiz.module
                      ? localize(quiz.module.title as LocalizedText, locale as "en" | "si" | "ta")
                      : null) ||
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
            ) : null}
          </div>
        </div>
      </main>

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
    </PublicQuizShell>
  );
}
