import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function CourseQuizzesLoading() {
  return (
    <PublicQuizShell activeNav="quiz">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 md:px-6 md:py-5">
        <Skeleton className="mb-3 h-4 w-56 max-w-full bg-slate-200/80" />
        <div className="mb-4 space-y-2 border-b border-slate-200/70 pb-3">
          <Skeleton className="h-7 w-72 max-w-full bg-slate-200/80" />
          <Skeleton className="h-4 w-96 max-w-full bg-slate-200/70" />
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-xl bg-slate-200/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      </main>
    </PublicQuizShell>
  );
}
