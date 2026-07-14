import { I18nProvider } from "@/hooks/use-i18n";

import { PublicQuizCatalog } from "./_components/public-quiz-catalog";

export default function PublicQuizzesPage() {
  return (
    <I18nProvider>
      <PublicQuizCatalog />
    </I18nProvider>
  );
}
