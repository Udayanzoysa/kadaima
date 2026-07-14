import { I18nProvider } from "@/hooks/use-i18n";

import { QuizList } from "./_components/quiz-list";

export default function QuizzesPage() {
  return (
    <I18nProvider>
      <QuizList />
    </I18nProvider>
  );
}
