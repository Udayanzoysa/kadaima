import { I18nProvider } from "@/hooks/use-i18n";

import { PublicQuizDetail } from "./_components/public-quiz-detail";

export default function PublicQuizDetailPage() {
  return (
    <I18nProvider>
      <PublicQuizDetail />
    </I18nProvider>
  );
}
