"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { BarChart2, BookOpen, Clock, HelpCircle, Lock, Play } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { normalizeQuizLanguages, type SupportedLocale } from "@/types/quiz";

function localeLabel(code: SupportedLocale): string {
  return LOCALES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

/**
 * Modern 4-Column Public Quiz Card — exactly matches Image 3 design.
 * Features 16:9 thumbnail banner, duration badge overlay (top-right),
 * 2-line title and description, questions/score indicators, and full-width Start Quiz CTA.
 */
export function PublicQuizCard({
  title,
  description,
  durationMinutes,
  questionCount,
  viewCount = 0,
  coverImageUrl,
  locked = false,
  languages,
  language,
  className,
  href,
  onPrimary,
  primaryLabel,
}: {
  title: string;
  description: string;
  durationMinutes: number;
  questionCount: number;
  viewCount?: number;
  coverImageUrl?: string | null;
  locked?: boolean;
  languages?: Array<SupportedLocale | string> | null;
  language?: SupportedLocale | string | null;
  className?: string;
  href?: string;
  onPrimary: () => void;
  isNew?: boolean;
  iconIndex?: number;
  primaryLabel?: string;
}) {
  const { t } = useI18n();
  const [imgError, setImgError] = useState(false);
  const availableLanguages = normalizeQuizLanguages(languages, language);

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DFE7F1] bg-white shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1769D2]/40 hover:shadow-md",
        locked && "border-[#1769D2]/30 bg-[#F9FBFE]",
        className,
      )}
    >
      {/* Top Media Banner (16:9) with Duration Overlay */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200">
        {coverImageUrl && !imgError ? (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#EBF3FE] to-[#D5E4F7] text-[#1769D2]">
            <BookOpen className="size-10 stroke-[1.5] opacity-75" />
          </div>
        )}

        {/* Duration badge: Top-Right (as in Image 3) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs">
          <Clock className="size-3 text-white/90" />
          <span>{durationMinutes}m</span>
        </div>

        {/* Lock indicator: Top-Left (if premium/locked) */}
        {locked ? (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-[#1769D2] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
            <Lock className="size-3" />
            <span>PRO</span>
          </div>
        ) : null}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-[family-name:var(--font-outfit)] text-sm font-bold leading-snug text-[#12243E] transition group-hover:text-[#1769D2] line-clamp-1">
          {href ? (
            <Link href={href} className="hover:underline focus-visible:outline-hidden focus-visible:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="mt-1 min-h-[2rem] text-xs leading-relaxed text-[#475569] line-clamp-2">{description}</p>

        {/* Language badges (if trilingual/bilingual) */}
        {availableLanguages.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {availableLanguages.map((code) => (
              <span
                key={code}
                className="inline-flex rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600"
              >
                {localeLabel(code as Locale)}
              </span>
            ))}
          </div>
        ) : null}

        {/* Metadata info: Questions Count & Score */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-[#607089]">
          <div className="flex items-center gap-1 font-medium">
            <HelpCircle className="size-3.5 text-slate-400" />
            <span>{questionCount} Questions</span>
          </div>
          <div className="flex items-center gap-1 font-medium text-emerald-600">
            <BarChart2 className="size-3.5" />
            <span>0%</span>
          </div>
        </div>

        {/* Action Button: Full-width Start Quiz (as in Image 3) */}
        <div className="mt-3 pt-1">
          {(() => {
            const fallbackLabel = t("public.startQuiz");
            const ctaLabel =
              primaryLabel && primaryLabel.length > 0
                ? primaryLabel
                : fallbackLabel.length > 0
                  ? fallbackLabel
                  : "Start Quiz";
            return href && !locked ? (
              <Link
                href={href}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1769D2] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1152AA] active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/50"
              >
                <Play className="size-3 fill-current" />
                <span>{ctaLabel}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onPrimary}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1769D2] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1152AA] active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/50 cursor-pointer"
              >
                <Play className="size-3 fill-current" />
                <span>{ctaLabel}</span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
