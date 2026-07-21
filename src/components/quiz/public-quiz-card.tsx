"use client";

import Image from "next/image";
import {
  BookOpen,
  Clock3,
  Crown,
  Eye,
  FileQuestionMark,
  Lock,
} from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  normalizeQuizLanguages,
  type SupportedLocale,
} from "@/types/quiz";

function formatViews(count: number) {
  if (count >= 1000) {
    const k = count / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
}

function localeLabel(code: SupportedLocale): string {
  return LOCALES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

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
  onPrimary,
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
  onPrimary: () => void;
  isNew?: boolean;
  iconIndex?: number;
  primaryLabel?: string;
}) {
  const { t } = useI18n();
  const availableLanguages = normalizeQuizLanguages(languages, language);

  return (
    <button
      type="button"
      onClick={onPrimary}
      className={cn(
        "group relative flex w-full min-h-[8.25rem] cursor-pointer gap-4 overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition duration-200 sm:min-h-[9rem] sm:p-5",
        "bg-[#f4f6f8] hover:border-[#1563b8]/35 hover:bg-[#eef2f6] hover:shadow-[0_12px_32px_-14px_rgba(21,99,184,0.28)]",
        "focus-visible:ring-2 focus-visible:ring-[#1563b8]/40 focus-visible:outline-none",
        locked ? "border-[#1563b8]/25 bg-[#e8f1fb]" : "border-slate-200/80",
        className,
      )}
    >
      {locked ? (
        <Lock
          className="absolute top-3 right-3 z-10 size-4 text-[#1563b8]"
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          "relative size-[5.5rem] shrink-0 overflow-hidden rounded-xl sm:size-[6.25rem]",
          locked && "opacity-80",
        )}
      >
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 88px, 100px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#e8eef4] to-[#dce6f0] text-[#1563b8]">
            <BookOpen className="size-9" strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 py-0.5">
        <div className={cn("min-w-0", locked && "pr-5")}>
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 line-clamp-1 font-[family-name:var(--font-outfit)] text-base leading-snug font-bold text-[#123a6b] sm:text-[1.0625rem]">
              {title}
            </h3>
            {availableLanguages.length > 0 ? (
              <div
                className="flex shrink-0 flex-wrap justify-end gap-1 pt-0.5"
                aria-label={availableLanguages.map(localeLabel).join(", ")}
              >
                {availableLanguages.map((code) => (
                  <span
                    key={code}
                    className="inline-flex max-w-[5.5rem] items-center truncate rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide text-slate-600 ring-1 ring-slate-200/70"
                    title={localeLabel(code as Locale)}
                  >
                    {localeLabel(code as Locale)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
            {description}
          </p>
          {locked ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1563b8]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1563b8]">
              <Crown className="size-3" strokeWidth={2.25} aria-hidden />
              {t("public.subscribedUsersOnly")}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3.5 text-slate-600">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium sm:text-[13px]">
            <Clock3 className="size-3.5 shrink-0 text-[#1563b8]/80" strokeWidth={1.75} aria-hidden />
            {durationMinutes}m
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium sm:text-[13px]">
            <FileQuestionMark
              className="size-3.5 shrink-0 text-[#1563b8]/80"
              strokeWidth={1.75}
              aria-hidden
            />
            {questionCount} Qs
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium sm:text-[13px]">
            <Eye className="size-3.5 shrink-0 text-[#1563b8]/80" strokeWidth={1.75} aria-hidden />
            {formatViews(viewCount)}
          </span>
          <span className="ml-auto text-xs font-semibold text-[#1563b8] sm:opacity-0 sm:transition sm:group-hover:opacity-100">
            {locked ? t("public.unlock") : t("public.start")} →
          </span>
        </div>
      </div>
    </button>
  );
}
