import { Suspense } from "react";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { JsonLd } from "@/components/site/json-ld";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdCollectionPage } from "@/lib/page-seo";
import { isValidCourseId } from "@/lib/public-catalog";
import { fetchPublicQuizzesByCourse } from "@/lib/public-quizzes";
import {
  localize,
  plainTextFromLocalized,
  type LocalizedText,
} from "@/types/quiz";

import { CourseQuizzesView } from "./_components/course-quizzes-view";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

function courseTitleEn(title: LocalizedText | string | null | undefined): string {
  if (!title) return "";
  if (typeof title === "string") return plainTextFromLocalized(title).trim();
  return plainTextFromLocalized(localize(title, "en")).trim();
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  if (!isValidCourseId(courseId)) {
    return buildPageMetadata({
      title: "Course quizzes",
      description: `Practice quizzes on ${APP_CONFIG.name}.`,
      path: `/quiz/course/${courseId}`,
      noIndex: true,
    });
  }

  const quizzes = await fetchPublicQuizzesByCourse(courseId);
  const course = quizzes[0]?.course;
  const titleBase = courseTitleEn(course?.title) || "Practice quizzes";
  const count = quizzes.length;
  const title = `${titleBase} Quizzes`;
  const description =
    count > 0
      ? `Browse ${count} practice quiz${count === 1 ? "" : "zes"} for ${titleBase} on ${APP_CONFIG.name}. Filter by module and start free or unlock premium papers.`
      : `Practice quizzes for ${titleBase} on ${APP_CONFIG.name} — Sri Lanka’s online exam & quiz portal.`;

  return buildPageMetadata({
    title,
    description,
    path: `/quiz/course/${courseId}`,
    noIndex: count === 0,
  });
}

export default async function CourseQuizzesPage({ params }: CoursePageProps) {
  const { courseId } = await params;
  if (!isValidCourseId(courseId)) notFound();

  const quizzes = await fetchPublicQuizzesByCourse(courseId);
  if (quizzes.length === 0) notFound();

  const course = quizzes[0].course;
  const titleEn = courseTitleEn(course.title) || "Practice quizzes";
  const path = `/quiz/course/${courseId}`;
  const description = `Practice quizzes for ${titleEn} on ${APP_CONFIG.name}.`;

  return (
    <>
      <JsonLd
        data={jsonLdCollectionPage({
          name: `${titleEn} Quizzes`,
          description,
          path,
          siteName: APP_CONFIG.name,
          breadcrumbs: [
            { name: "Home", path: "/" },
            { name: "Quizzes", path: "/quiz" },
            { name: titleEn, path },
          ],
          items: quizzes.map((quiz) => ({
            name: courseTitleEn(quiz.title) || "Practice quiz",
            path: `/quiz/${quiz.id}`,
          })),
        })}
      />
      <Suspense
        fallback={
          <PublicQuizShell activeNav="quiz">
            <PublicContentSkeleton variant="page" className="flex-1 py-6" />
          </PublicQuizShell>
        }
      >
        <CourseQuizzesView courseId={courseId} initialQuizzes={quizzes} />
      </Suspense>
    </>
  );
}
