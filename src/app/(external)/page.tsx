import { I18nProvider } from "@/hooks/use-i18n";
import { PublicQuizCatalog } from "@/app/quiz/_components/public-quiz-catalog";

/** Public Kadaima home — featured quizzes + upcoming challenges. */
export default function HomePage() {
  return (
    <I18nProvider>
      <PublicQuizCatalog />
    </I18nProvider>
  );
}
