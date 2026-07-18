import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { I18nProvider } from "@/hooks/use-i18n";
import { absoluteUrl } from "@/lib/site-url";

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

async function fetchTeacherMeta(slug: string): Promise<TeacherPublicMeta | null> {
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as TeacherPublicMeta;
  } catch {
    return null;
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
  const path = `/t/${slug}`;
  const image = teacher?.banners?.[0]?.imageUrl || teacher?.sideBannerUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "profile",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function TeacherPublicPage({ params }: TeacherPageProps) {
  const { slug } = await params;
  return (
    <I18nProvider>
      <TeacherLandingPage slug={slug} />
    </I18nProvider>
  );
}
