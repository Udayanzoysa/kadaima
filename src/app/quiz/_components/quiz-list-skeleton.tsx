import { Skeleton } from "@/components/ui/skeleton";

/** Quiet card placeholders for In Progress / My Attempts lists. */
export function QuizListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <Skeleton className="h-3 w-24 bg-slate-200/80" />
          <Skeleton className="mt-3 h-5 w-[80%] bg-slate-200/80" />
          <Skeleton className="mt-2 h-3 w-full bg-slate-200/70" />
          <Skeleton className="mt-1.5 h-3 w-[65%] bg-slate-200/70" />
          <Skeleton className="mt-4 h-1.5 w-full rounded-full bg-slate-200/70" />
          <div className="mt-3 flex justify-between">
            <Skeleton className="h-3 w-20 bg-slate-200/70" />
            <Skeleton className="h-3 w-16 bg-slate-200/70" />
          </div>
          <Skeleton className="mt-5 h-10 w-full rounded-xl bg-slate-200/80" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
