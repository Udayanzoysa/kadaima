import { Suspense } from "react";

import type { Metadata } from "next";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { JsonLd } from "@/components/site/json-ld";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdQuizPage } from "@/lib/page-seo";
import {
  localize,
  plainTextFromLocalized,
  type LocalizedText,
} from "@/types/quiz";

import { PublicQuizDetail } from "./_components/public-quiz-detail";

type QuizPageProps = {
  params: Promise<{ id: string }>;
};

type PublishedQuizMeta = {
  id: string;
  title?: LocalizedText | string | null;
  description?: LocalizedText | string | null;
  coverImageUrl?: string | null;
  durationMinutes?: number | null;
};

async function fetchQuizMeta(id: string): Promise<PublishedQuizMeta | null> {
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublishedQuizMeta;
  } catch {
    return null;
  }
}

function metaText(value: LocalizedText | string | null | undefined): string {
  return plainTextFromLocalized(localize(value, "en")).trim();
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const { id } = await params;
  const quiz = await fetchQuizMeta(id);
  const title = metaText(quiz?.title) || "Practice Quiz";
  const description =
    metaText(quiz?.description) ||
    `Take the ${title} practice quiz on ${APP_CONFIG.name} — Sri Lanka’s online exam & quiz portal.`;

  return buildPageMetadata({
    title,
    description,
    path: `/quiz/${id}`,
    image: quiz?.coverImageUrl,
  });
}

export default async function PublicQuizDetailPage({ params }: QuizPageProps) {
  const { id } = await params;
  const quiz = await fetchQuizMeta(id);
  const title = metaText(quiz?.title) || "Practice Quiz";
  const description =
    metaText(quiz?.description) ||
    `Take the ${title} practice quiz on ${APP_CONFIG.name}.`;

  return (
    <>
      {quiz ? (
        <JsonLd
          data={jsonLdQuizPage({
            name: title,
            description,
            path: `/quiz/${id}`,
            image: quiz.coverImageUrl,
            siteName: APP_CONFIG.name,
            timeRequiredMinutes: quiz.durationMinutes,
          })}
        />
      ) : null}
      <Suspense
        fallback={
          <PublicQuizShell>
            <PublicContentSkeleton variant="detail" className="flex-1 py-8" />
          </PublicQuizShell>
        }
      >
        <PublicQuizDetail />
      </Suspense>
    </>
  );
}
