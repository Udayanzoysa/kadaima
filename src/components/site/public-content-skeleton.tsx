import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Quiet public-page placeholder — no branded spinner. */
export function PublicContentSkeleton({
  className,
  variant = "page",
}: {
  className?: string;
  variant?: "page" | "detail" | "form" | "cards";
}) {
  if (variant === "form") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading"
        className={cn("mx-auto w-full max-w-2xl space-y-4 px-4 py-6", className)}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl bg-slate-200/80" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 bg-slate-200/80" />
            <Skeleton className="h-4 w-56 bg-slate-200/70" />
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-10 w-full bg-slate-200/80" />
          <Skeleton className="h-10 w-full bg-slate-200/80" />
          <Skeleton className="h-10 w-full bg-slate-200/80" />
          <Skeleton className="mt-2 h-11 w-full rounded-xl bg-slate-200/80" />
        </div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading"
        className={cn("mx-auto w-full max-w-3xl space-y-4 px-4 py-6", className)}
      >
        <Skeleton className="h-8 w-64 max-w-full bg-slate-200/80" />
        <Skeleton className="h-4 w-full bg-slate-200/70" />
        <Skeleton className="h-4 w-[80%] bg-slate-200/70" />
        <Skeleton className="mt-4 h-40 w-full rounded-2xl bg-slate-200/70" />
        <Skeleton className="h-11 w-40 rounded-xl bg-slate-200/80" />
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading"
        className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-3 w-24 bg-slate-200/80" />
            <Skeleton className="mt-3 h-5 w-[80%] bg-slate-200/80" />
            <Skeleton className="mt-2 h-3 w-full bg-slate-200/70" />
            <Skeleton className="mt-5 h-10 w-full rounded-xl bg-slate-200/80" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("mx-auto w-full max-w-6xl space-y-4 px-4 py-8", className)}
    >
      <Skeleton className="h-8 w-48 bg-slate-200/80" />
      <Skeleton className="h-4 w-72 max-w-full bg-slate-200/70" />
      <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl bg-slate-200/70" />
        ))}
      </div>
    </div>
  );
}
