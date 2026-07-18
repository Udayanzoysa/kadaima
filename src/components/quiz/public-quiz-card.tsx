"use client";

import {
  Beaker,
  BookOpen,
  Calculator,
  Clock3,
  FileQuestionMark,
  FlaskConical,
  Lock,
  Sigma,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const CARD_ICONS: LucideIcon[] = [BookOpen, Beaker, Calculator, FlaskConical, Sigma];

export function PublicQuizCard({
  title,
  description,
  durationMinutes,
  questionCount,
  isNew = false,
  locked = false,
  iconIndex = 0,
  className,
  onPrimary,
  primaryLabel,
}: {
  title: string;
  description: string;
  durationMinutes: number;
  questionCount: number;
  isNew?: boolean;
  locked?: boolean;
  iconIndex?: number;
  className?: string;
  onPrimary: () => void;
  primaryLabel?: string;
}) {
  const { t } = useI18n();
  const Icon = CARD_ICONS[iconIndex % CARD_ICONS.length];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md",
        locked && "border-slate-200/80 bg-slate-50/80",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-3.5 p-3.5 sm:gap-4 sm:p-4",
          locked && "pointer-events-none select-none opacity-45 blur-[1.5px]",
        )}
      >
        <div
          className={cn(
            "relative flex size-[4.75rem] shrink-0 items-center justify-center rounded-xl sm:size-24",
            locked ? "bg-slate-200 text-slate-500" : "bg-[#eef6ff] text-[#1563b8]",
          )}
        >
          {isNew && !locked ? (
            <span className="absolute left-1.5 top-1.5 rounded bg-slate-300/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-800">
              {t("public.newBadge")}
            </span>
          ) : null}
          <Icon className="size-7 sm:size-8" strokeWidth={1.6} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-[15px] font-bold leading-snug text-slate-900 sm:text-base">
            {title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 sm:text-[13px]">
            {description}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3.5 shrink-0" strokeWidth={1.75} />
                {t("public.minsShort").replace("{count}", String(durationMinutes))}
              </span>
              <span className="inline-flex items-center gap-1">
                <FileQuestionMark className="size-3.5 shrink-0" strokeWidth={1.75} />
                {t("public.qsShort").replace("{count}", String(questionCount))}
              </span>
            </div>

            {!locked ? (
              <Button
                variant="brand"
                size="sm"
                className="h-8 shrink-0 rounded-lg px-4 text-xs font-semibold"
                onClick={onPrimary}
              >
                {primaryLabel ?? t("public.start")}
              </Button>
            ) : (
              <div className="h-8 w-20 shrink-0" aria-hidden />
            )}
          </div>
        </div>
      </div>

      {locked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
          <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-md sm:text-[13px]">
            <Lock className="size-3.5 text-amber-600" strokeWidth={2.25} />
            {t("public.premiumContent")}
          </span>
          <span className="pointer-events-none text-[11px] font-medium text-slate-600 sm:text-xs">
            {t("public.subscriptionRequired")}
          </span>
          <Button
            variant="brand"
            size="sm"
            className="mt-1 h-8 rounded-lg px-4 text-xs font-semibold"
            onClick={onPrimary}
          >
            <Lock className="size-3.5" />
            {primaryLabel ?? t("public.unlock")}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
