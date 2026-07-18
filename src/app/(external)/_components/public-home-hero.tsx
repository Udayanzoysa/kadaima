"use client";

import Link from "next/link";

import { Play } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";

/**
 * Home hero — follows the active locale (en / si / ta) via I18nProvider.
 */
export function PublicHomeHero() {
  const { t } = useI18n();

  return (
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
          <a
            href="#quizzes-by-course"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1563b8] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#114f94]"
          >
            <Play className="size-4 fill-current" />
            {t("public.hero.browseQuizzes")}
          </a>
          <Link
            href="/quiz/in-progress"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/50 bg-transparent px-6 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t("public.hero.viewProgress")}
          </Link>
        </div>
      </div>
    </section>
  );
}
