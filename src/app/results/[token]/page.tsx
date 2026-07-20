import type { Metadata } from "next";

import { I18nProvider } from "@/hooks/use-i18n";
import { buildPageMetadata } from "@/lib/page-seo";

import { PublicQuizResult } from "./_components/public-quiz-result";

type ResultPageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: ResultPageProps): Promise<Metadata> {
  const { token } = await params;
  return buildPageMetadata({
    title: "Quiz Result",
    description: "Your quiz attempt result.",
    path: `/results/${token}`,
    noIndex: true,
  });
}

export default function PublicResultPage() {
  return (
    <I18nProvider>
      <PublicQuizResult />
    </I18nProvider>
  );
}
