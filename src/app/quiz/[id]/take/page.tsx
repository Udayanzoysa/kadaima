import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { PublicTakeQuiz } from "./_components/public-take-quiz";

type TakePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: TakePageProps): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: "Taking Quiz",
    description: "Active quiz attempt — progress is saved as you go.",
    path: `/quiz/${id}/take`,
    noIndex: true,
  });
}

export default function PublicTakeQuizPage() {
  return <PublicTakeQuiz />;
}
