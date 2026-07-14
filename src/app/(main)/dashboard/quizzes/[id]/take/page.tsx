import { I18nProvider } from "@/hooks/use-i18n";

import { TakeQuiz } from "./_components/take-quiz";

export default function TakeQuizPage() {
  return (
    <I18nProvider>
      <TakeQuiz />
    </I18nProvider>
  );
}
