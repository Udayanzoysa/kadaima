import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#eef3f7] px-4 py-10">
      <div className="w-full max-w-[420px] space-y-5 rounded-2xl border border-white/80 bg-white px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-36 bg-slate-200/80" />
          <Skeleton className="h-7 w-48 bg-slate-200/80" />
          <Skeleton className="h-4 w-64 max-w-full bg-slate-200/70" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl bg-slate-200/80" />
        <Skeleton className="h-11 w-full rounded-xl bg-slate-200/80" />
        <Skeleton className="h-11 w-full rounded-xl bg-slate-200/80" />
      </div>
    </div>
  );
}
