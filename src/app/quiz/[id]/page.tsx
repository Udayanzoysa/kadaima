import { Suspense } from "react";

import { I18nProvider } from "@/hooks/use-i18n";

import { PublicQuizDetail } from "./_components/public-quiz-detail";

export default function PublicQuizDetailPage() {
  return (
    <I18nProvider>
      <Suspense fallback={null}>
        <PublicQuizDetail />
      </Suspense>
    </I18nProvider>
  );
}
