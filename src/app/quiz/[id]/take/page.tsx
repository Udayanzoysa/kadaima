import { I18nProvider } from "@/hooks/use-i18n";

import { PublicTakeQuiz } from "./_components/public-take-quiz";

export default function PublicTakeQuizPage() {
  return (
    <I18nProvider>
      <PublicTakeQuiz />
    </I18nProvider>
  );
}
