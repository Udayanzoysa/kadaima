"use client";

import Link from "next/link";

import { Play } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { PUBLIC_HERO_GLOW_CLASS, PUBLIC_HERO_GRADIENT_CLASS } from "@/lib/public-brand";
import { cn } from "@/lib/utils";

/**
 * Home hero — follows the active locale (en / si / ta) via I18nProvider.
 */
export function PublicHomeHero() {
  const { t } = useI18n();

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 text-white sm:rounded-3xl sm:p-5 md:p-8 lg:p-9",
        PUBLIC_HERO_GRADIENT_CLASS,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl md:size-72"
      />
      <div aria-hidden className={PUBLIC_HERO_GLOW_CLASS} />

      <div className="relative max-w-2xl">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-white ring-1 ring-white/25">
          {t("public.hero.badge")}
        </span>
        <h1 className="mt-3 font-[family-name:var(--font-outfit)] text-xl font-extrabold leading-tight tracking-tight sm:text-2xl md:text-4xl lg:text-[2.5rem]">
          {t("public.hero.title")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 md:text-[15px]">
          {t("public.hero.description")}
        </p>
        <div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap">
          <a
            href="#quizzes-by-course"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1563b8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#114f94] sm:w-auto"
          >
            <Play className="size-4 fill-current" />
            {t("public.hero.browseQuizzes")}
          </a>
          <Link
            href="/quiz/in-progress"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/50 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            {t("public.hero.viewProgress")}
          </Link>
        </div>
      </div>
    </section>
  );
}
