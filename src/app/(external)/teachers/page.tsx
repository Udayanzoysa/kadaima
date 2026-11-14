import Link from "next/link";

import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { TeacherCard } from "@/components/home/teacher-card";
import { JsonLd } from "@/components/site/json-ld";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdCollectionPage } from "@/lib/page-seo";
import { fetchFeaturedTeachers } from "@/lib/public-teachers";

const title = "Verified Teachers & Online Classes";
const description = `Discover experienced Sri Lankan teachers on ${APP_CONFIG.name} LMS for Mathematics, Science, English, Grade 5 Scholarship, G.C.E. O/L, and A/L classes and quizzes.`;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/teachers",
  keywords: ["Sri Lanka online teachers", "O/L teachers Sri Lanka", "A/L tuition teachers", "Kadaima teachers"],
});

export default async function TeachersDirectoryPage() {
  const teachers = await fetchFeaturedTeachers();

  return (
    <>
      <JsonLd
        data={jsonLdCollectionPage({
          name: title,
          description,
          path: "/teachers",
          siteName: APP_CONFIG.name,
          breadcrumbs: [
            { name: "Home", path: "/" },
            { name: "Teachers", path: "/teachers" },
          ],
          items: teachers.map((teacher) => ({
            name: teacher.name,
            path: `/t/${teacher.slug}`,
          })),
        })}
      />
      <PublicQuizShell>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10">
          <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-[#D8E6F8] bg-linear-to-r from-[#EBF3FE] via-[#F2F7FF] to-[#E3EFFF] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-2xl space-y-2">
              <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-extrabold tracking-tight text-[#12243E] sm:text-3xl">
                Verified Teachers on Kadaima LMS
              </h1>
              <p className="text-sm leading-relaxed text-[#475569] sm:text-base">
                Explore educator storefronts, class schedules, and practice quizzes across Sri Lanka.
              </p>
            </div>
            <Link
              href="/teacher/register"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1152AA]"
            >
              <span>Join as a Teacher</span>
              <ArrowRight className="size-4" />
            </Link>
          </header>

          <section aria-label="Teacher profiles">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => (
                <TeacherCard key={teacher.slug} teacher={teacher} />
              ))}
            </div>
          </section>
        </main>
      </PublicQuizShell>
    </>
  );
}
