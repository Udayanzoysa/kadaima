import { Suspense } from "react";

import { PublicQuizDetail } from "./_components/public-quiz-detail";

export default function PublicQuizDetailPage() {
  return (
    <Suspense fallback={null}>
      <PublicQuizDetail />
    </Suspense>
  );
}
