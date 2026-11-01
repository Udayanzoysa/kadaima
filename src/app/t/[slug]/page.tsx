import type { Metadata } from "next";

import { JsonLd } from "@/components/site/json-ld";
import { APP_CONFIG } from "@/config/app-config";
import { I18nProvider } from "@/hooks/use-i18n";
import { buildPageMetadata, jsonLdTeacherPage } from "@/lib/page-seo";

import { TeacherLandingPage } from "./_components/teacher-landing-page";

interface TeacherPageProps {
  params: Promise<{ slug: string }>;
}

type TeacherPublicMeta = {
  slug?: string;
  displayName?: string | null;
  title?: string | null;
  description?: string | null;
  aboutText?: string | null;
  sideBannerUrl?: string | null;
  banners?: Array<{ imageUrl?: string | null }>;
};

const FALLBACK_TEACHER_META: Record<string, TeacherPublicMeta> = {
  "nimal-silva": {
    slug: "nimal-silva",
    displayName: "Mr. Nimal Silva",
    title: "B.Sc. (Hons) in Mathematics",
    description: "Senior Mathematics Teacher specializing in G.C.E. O/L & A/L Combined Mathematics syllabus.",
    sideBannerUrl: "/media/teachers/nimal-silva.webp",
  },
  "kavindi-perera": {
    slug: "kavindi-perera",
    displayName: "Ms. Kavindi Perera",
    title: "B.Sc. in Science Education",
    description: "Senior Science Teacher specializing in O/L Science syllabus.",
    sideBannerUrl: "/media/teachers/kavindi-perera.webp",
  },
  "ruwan-fernando": {
    slug: "ruwan-fernando",
    displayName: "Mr. Ruwan Fernando",
    title: "M.A. in English",
    description: "Senior English Language & Literature Educator.",
    sideBannerUrl: "/media/teachers/ruwan-fernando.webp",
  },
  "nimalka-perera": {
    slug: "nimalka-perera",
    displayName: "Ms. Nimalka Perera",
    title: "BSc (Hons) in Physics | Experienced Teacher",
    description: "A passionate Science teacher with 8+ years of experience in O/L and A/L Science, focused on concept clarity, practical application and exam success.",
    sideBannerUrl: "/media/teachers/nimalka-perera.webp",
  },
};

async function fetchTeacherMeta(slug: string): Promise<TeacherPublicMeta | null> {
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return FALLBACK_TEACHER_META[slug] || null;
    return (await res.json()) as TeacherPublicMeta;
  } catch {
    return FALLBACK_TEACHER_META[slug] || null;
  }
}

export async function generateMetadata({ params }: TeacherPageProps): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await fetchTeacherMeta(slug);
  const name = teacher?.displayName?.trim() || slug;
  const title = `${name} — Teacher`;
  const description =
    teacher?.description?.trim() ||
    teacher?.title?.trim() ||
    teacher?.aboutText?.trim() ||
    `Practice quizzes and resources from ${name} on ${APP_CONFIG.name}.`;
  const image = teacher?.banners?.[0]?.imageUrl || teacher?.sideBannerUrl || undefined;

  return buildPageMetadata({
    title,
    description,
    path: `/t/${slug}`,
    image,
    ogType: "profile",
  });
}

export default async function TeacherPublicPage({ params }: TeacherPageProps) {
  const { slug } = await params;
  const teacher = await fetchTeacherMeta(slug);
  const name = teacher?.displayName?.trim() || slug;
  const description =
    teacher?.description?.trim() ||
    teacher?.title?.trim() ||
    teacher?.aboutText?.trim() ||
    `Practice quizzes and resources from ${name} on ${APP_CONFIG.name}.`;
  const image = teacher?.banners?.[0]?.imageUrl || teacher?.sideBannerUrl || undefined;

  return (
    <I18nProvider>
      {teacher ? (
        <JsonLd
          data={jsonLdTeacherPage({
            name,
            description,
            path: `/t/${slug}`,
            image,
            jobTitle: teacher.title,
          })}
        />
      ) : null}
      <TeacherLandingPage slug={slug} initialTeacher={teacher as any} />
    </I18nProvider>
  );
}
