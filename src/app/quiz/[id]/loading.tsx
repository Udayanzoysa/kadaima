import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";

/** Detail-shaped skeleton — avoids inheriting the list chrome from /quiz/loading. */
export default function Loading() {
  return (
    <PublicQuizShell>
      <PublicContentSkeleton variant="detail" className="flex-1 py-8" />
    </PublicQuizShell>
  );
}
