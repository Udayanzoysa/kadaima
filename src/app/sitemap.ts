import type { MetadataRoute } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { absoluteUrl } from "@/lib/site-url";

type PublishedQuizRow = {
  id: string;
  course?: { id?: string | null } | null;
  createdBy?: {
    teacherProfile?: { slug?: string | null } | null;
  } | null;
};

const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/quiz", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/partner", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/referral", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
];

async function fetchPublishedQuizzes(): Promise<PublishedQuizRow[]> {
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as PublishedQuizRow[]) : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const quizzes = await fetchPublishedQuizzes();
  const quizEntries: MetadataRoute.Sitemap = quizzes
    .filter((q) => typeof q.id === "string" && q.id.length > 0)
    .map((q) => ({
      url: absoluteUrl(`/quiz/${q.id}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const courseIds = new Set<string>();
  for (const q of quizzes) {
    const courseId = q.course?.id?.trim();
    if (courseId) courseIds.add(courseId);
  }

  const courseEntries: MetadataRoute.Sitemap = [...courseIds].map((courseId) => ({
    url: absoluteUrl(`/quiz/course/${courseId}`),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  const teacherSlugs = new Set<string>();
  for (const q of quizzes) {
    const slug = q.createdBy?.teacherProfile?.slug?.trim().toLowerCase();
    if (slug) teacherSlugs.add(slug);
  }

  const teacherEntries: MetadataRoute.Sitemap = [...teacherSlugs].map((slug) => ({
    url: absoluteUrl(`/t/${slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...courseEntries, ...quizEntries, ...teacherEntries];
}
