import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { QuizListSkeleton } from "@/app/quiz/_components/quiz-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Route fallback — quiet skeletons instead of a second branded logo loader. */
export default function Loading() {
  return (
    <PublicQuizShell>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-48 bg-slate-200/80 md:h-9" />
          <Skeleton className="h-4 w-72 max-w-full bg-slate-200/70" />
        </div>
        <QuizListSkeleton />
      </main>
    </PublicQuizShell>
  );
}
