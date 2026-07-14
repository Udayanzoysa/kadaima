import { I18nProvider } from "@/hooks/use-i18n";

import { QuizBuilder } from "../../new/_components/quiz-builder";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <I18nProvider>
      <QuizBuilder quizId={id} />
    </I18nProvider>
  );
}
