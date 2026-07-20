import Link from "next/link";

import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Dashed empty panel used on public quiz lists and catalogs. */
export function PublicEmptyState({
  message,
  ctaLabel,
  ctaHref = "/",
  icon: Icon = Inbox,
  className,
}: {
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center",
        className,
      )}
    >
      <Icon className="mx-auto size-10 text-slate-300" aria-hidden />
      <p className="mt-3 text-slate-500">{message}</p>
      {ctaLabel ? (
        <Button asChild variant="brand" className="mt-4 font-semibold">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

/** Inline error banner for in-shell list/catalog failures. */
export function PublicErrorBanner({
  message,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{message}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-200 bg-white text-red-700 hover:bg-red-50"
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Centered error for detail / take / results style pages. */
export function PublicCenteredError({
  message,
  backHref = "/",
  backLabel = "Back to quizzes",
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  message: string;
  backHref?: string;
  backLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-10 text-[#1563b8]" aria-hidden />
      <p className="max-w-md text-sm text-slate-600">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="brandOutline">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
        {onRetry ? (
          <Button type="button" variant="brand" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
