import type { Metadata } from "next";

import { JsonLd } from "@/components/site/json-ld";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdCollectionPage } from "@/lib/page-seo";
import { fetchPublicQuizzes } from "@/lib/public-quizzes";
import { localize, plainTextFromLocalized, type LocalizedText } from "@/types/quiz";

import { PublicQuizCatalog } from "./_components/public-quiz-catalog";

const title = "Practice Quizzes";
const description = `Browse practice quizzes by exam category on ${APP_CONFIG.name} — Scholarship, O/L, A/L, Driving Licence, and more.`;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/quiz",
});

export default async function PublicQuizzesPage() {
  const initialQuizzes = await fetchPublicQuizzes();

  const courseMap = new Map<string, string>();
  for (const quiz of initialQuizzes) {
    if (!quiz.course?.id || courseMap.has(quiz.course.id)) continue;
    const name = plainTextFromLocalized(
      localize(quiz.course.title as LocalizedText, "en"),
    ).trim();
    if (name) courseMap.set(quiz.course.id, name);
  }

  return (
    <>
      <JsonLd
        data={jsonLdCollectionPage({
          name: title,
          description,
          path: "/quiz",
          siteName: APP_CONFIG.name,
          breadcrumbs: [
            { name: "Home", path: "/" },
            { name: "Quizzes", path: "/quiz" },
          ],
          items: [...courseMap.entries()].map(([id, name]) => ({
            name,
            path: `/quiz/course/${id}`,
          })),
        })}
      />
      <PublicQuizCatalog initialQuizzes={initialQuizzes} />
    </>
  );
}
