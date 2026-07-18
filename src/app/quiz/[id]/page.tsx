import { Suspense } from "react";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { absoluteUrl } from "@/lib/site-url";
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
  const path = `/quiz/${id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "website",
      ...(quiz?.coverImageUrl ? { images: [{ url: quiz.coverImageUrl }] } : {}),
    },
    twitter: {
      card: quiz?.coverImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(quiz?.coverImageUrl ? { images: [quiz.coverImageUrl] } : {}),
    },
  };
}

export default function PublicQuizDetailPage() {
  return (
    <Suspense fallback={null}>
      <PublicQuizDetail />
    </Suspense>
  );
}
