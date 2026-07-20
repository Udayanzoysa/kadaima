import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";

/** Keep public chrome visible while home / profile / payments / legal load. */
export default function Loading() {
  return (
    <PublicQuizShell>
      <PublicContentSkeleton className="min-h-[40vh] flex-1" />
    </PublicQuizShell>
  );
}
