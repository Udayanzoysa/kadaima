import { I18nProvider } from "@/hooks/use-i18n";

import { QuizBuilder } from "./_components/quiz-builder";

export default function AddQuizPage() {
  return (
    <I18nProvider>
      <QuizBuilder />
    </I18nProvider>
  );
}
