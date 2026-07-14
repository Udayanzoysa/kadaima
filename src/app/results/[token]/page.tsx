import { I18nProvider } from "@/hooks/use-i18n";

import { PublicQuizResult } from "./_components/public-quiz-result";

export default function PublicResultPage() {
  return (
    <I18nProvider>
      <PublicQuizResult />
    </I18nProvider>
  );
}
