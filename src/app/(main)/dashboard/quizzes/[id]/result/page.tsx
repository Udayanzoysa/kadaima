import { I18nProvider } from "@/hooks/use-i18n";

import { QuizResult } from "./_components/quiz-result";

export default function QuizResultPage() {
  return (
    <I18nProvider>
      <QuizResult />
    </I18nProvider>
  );
}
