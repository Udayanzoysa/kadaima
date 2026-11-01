import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { I18nProvider } from "@/hooks/use-i18n";

/** Teacher pages use unified public shell — keep shell visible while loading. */
export default function Loading() {
  return (
    <I18nProvider>
      <PublicQuizShell>
        <PublicContentSkeleton className="py-16" />
      </PublicQuizShell>
    </I18nProvider>
  );
}
