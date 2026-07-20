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
import { cn } from "@/lib/utils";

function formatViews(count: number) {
  if (count >= 1000) {
    const k = count / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
}

export function PublicQuizCard({
  title,
  description,
  durationMinutes,
  questionCount,
  viewCount = 0,
  coverImageUrl,
  locked = false,
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
  className?: string;
  onPrimary: () => void;
  isNew?: boolean;
  iconIndex?: number;
  primaryLabel?: string;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onPrimary}
      className={cn(
        "group relative flex w-full cursor-pointer gap-3 overflow-hidden rounded-2xl border bg-white p-3 text-left shadow-sm transition duration-200",
        "hover:border-[#1563b8]/35 hover:shadow-[0_10px_28px_-14px_rgba(21,99,184,0.35)]",
        "focus-visible:ring-2 focus-visible:ring-[#1563b8]/40 focus-visible:outline-none",
        locked ? "border-[#1563b8]/25 bg-[#eef6ff]" : "border-slate-200/90",
        className,
      )}
    >
      {locked ? (
        <Lock
          className="absolute top-2.5 right-2.5 z-10 size-4 text-[#1563b8]"
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          "relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl sm:size-[5.25rem]",
          locked && "opacity-80",
        )}
      >
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 72px, 84px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#eef6ff] to-[#dcebff] text-[#1563b8]">
            <BookOpen className="size-8" strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
        <div className={cn("min-w-0", locked && "pr-5")}>
          <h3 className="line-clamp-1 font-[family-name:var(--font-outfit)] text-[15px] leading-snug font-bold text-[#123a6b] sm:text-base">
            {title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
            {description}
          </p>
          {locked ? (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#1563b8]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1563b8]">
              <Crown className="size-3" strokeWidth={2.25} aria-hidden />
              {t("public.subscribedUsersOnly")}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-slate-600">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium sm:text-xs">
            <Clock3 className="size-3.5 shrink-0 text-[#1563b8]/80" strokeWidth={1.75} aria-hidden />
            {durationMinutes}m
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium sm:text-xs">
            <FileQuestionMark
              className="size-3.5 shrink-0 text-[#1563b8]/80"
              strokeWidth={1.75}
              aria-hidden
            />
            {questionCount} Qs
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium sm:text-xs">
            <Eye className="size-3.5 shrink-0 text-[#1563b8]/80" strokeWidth={1.75} aria-hidden />
            {formatViews(viewCount)}
          </span>
          <span className="ml-auto text-[11px] font-semibold text-[#1563b8] sm:opacity-0 sm:transition sm:group-hover:opacity-100">
            {locked ? t("public.unlock") : t("public.start")} →
          </span>
        </div>
      </div>
    </button>
  );
}
