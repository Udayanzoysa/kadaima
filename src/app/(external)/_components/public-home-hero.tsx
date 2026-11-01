"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, Play, Sparkles } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import type { HomepageLocalized } from "@/lib/public-quizzes";

function pickLocalized(value: HomepageLocalized | null | undefined, locale: string, fallback: string): string {
  if (!value) return fallback;
  const loc = locale === "si" || locale === "ta" ? locale : "en";
  const picked = (value[loc] || value.en || value.si || value.ta || "").trim();
  return picked || fallback;
}

/**
 * Modern Kadaima Home Hero — Education-focused composition.
 * Features clean sky-blue gradient, bold typography with highlighted keywords,
 * dual CTAs ("Explore Quizzes" & "View My Progress"), and a clean student portrait
 * in white uniform with tablet positioned on the right side against soft blue wave shapes.
 */
export function PublicHomeHero({
  hero,
}: {
  hero?: {
    badge?: HomepageLocalized;
    title?: HomepageLocalized;
    description?: HomepageLocalized;
    showSecondaryCta?: boolean;
  } | null;
} = {}) {
  const { locale, t } = useI18n();

  const badge = pickLocalized(hero?.badge, locale, "LEARN • PRACTICE • EXCEL");
  const title = pickLocalized(hero?.title, locale, "Your Next Success Story Starts Here");
  const description = pickLocalized(
    hero?.description,
    locale,
    "Explore quizzes, practice past papers and track your progress. Learn anytime, anywhere.",
  );
  const showSecondary = hero?.showSecondaryCta !== false;

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#D8E6F8] bg-linear-to-r from-[#EBF3FE] via-[#F2F7FF] to-[#E3EFFF] p-5 shadow-xs sm:mb-8 sm:p-8 md:p-10 lg:px-12 lg:py-10">
      {/* Subtle decorative glow and wave shapes contained strictly within hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-80 rounded-full bg-gradient-to-br from-[#1769D2]/15 to-[#3b9eff]/20 blur-3xl lg:size-96"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-1/4 size-64 rounded-full bg-sky-200/35 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-10 size-48 rounded-full bg-blue-300/15 blur-2xl"
      />

      <div className="relative z-10 grid items-center gap-6 md:grid-cols-12 md:gap-8">
        {/* Left column: Text & CTAs */}
        <div className="space-y-4 md:col-span-7 lg:col-span-7">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1 text-[11px] font-bold tracking-widest text-[#1769D2] uppercase shadow-2xs ring-1 ring-[#1769D2]/20 backdrop-blur-xs">
            <Sparkles className="size-3 text-[#1769D2]" />
            <span>{badge}</span>
          </div>

          <h1 className="font-[family-name:var(--font-outfit)] font-extrabold text-3xl leading-[1.15] tracking-tight text-[#12243E] sm:text-4xl lg:text-[2.75rem]">
            {title.includes("Success Story") ? (
              <>
                {title.split("Success Story")[0]}
                <span className="text-[#1769D2]">Success Story</span>
                {title.split("Success Story")[1]}
              </>
            ) : (
              title
            )}
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-[#607089] sm:text-base">
            {description}
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <a
              href="#quizzes-by-course"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-6 font-semibold text-sm text-white shadow-xs transition hover:bg-[#1152AA] active:scale-[0.98]"
            >
              <Play className="size-4 fill-current" />
              {t("public.hero.browseQuizzes") || "Explore Quizzes"}
            </a>
            {showSecondary ? (
              <Link
                href="/quiz/in-progress"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DFE7F1] bg-white px-6 font-semibold text-[#12243E] text-sm shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                <BarChart3 className="size-4 text-[#1769D2]" />
                {t("public.hero.viewProgress") || "View My Progress"}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Right column: High-quality Student Portrait in white uniform with tablet */}
        <div className="relative flex items-end justify-center md:col-span-5 md:justify-end lg:col-span-5">
          <div className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-none">
            {/* Soft backdrop container with gentle gradient matching educational theme */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-2 -bottom-2 -top-2 rounded-3xl bg-linear-to-tr from-[#1769D2]/10 via-white/40 to-sky-200/30 ring-1 ring-white/60 shadow-inner"
            />

            <div className="relative z-10 mx-auto flex items-end justify-center overflow-hidden rounded-2xl">
              <Image
                src="/media/hero/kadaima-student.webp"
                alt=""
                width={454}
                height={504}
                priority
                className="h-auto w-full max-h-[300px] sm:max-h-[340px] md:max-h-[360px] object-contain object-bottom select-none transition-transform duration-300 hover:scale-[1.02]"
                sizes="(max-width: 640px) 280px, (max-width: 768px) 340px, (max-width: 1024px) 320px, 420px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
