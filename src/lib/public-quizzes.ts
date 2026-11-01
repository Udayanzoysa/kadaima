import { APP_CONFIG } from "@/config/app-config";
import type { LocalizedText } from "@/types/quiz";

export interface CatalogQuiz {
  id: string;
  language?: "en" | "si" | "ta";
  languages?: Array<"en" | "si" | "ta">;
  title: LocalizedText;
  description: LocalizedText | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  coverImageUrl?: string | null;
  durationMinutes: number;
  passingScorePercentage: number;
  requiresUnlock?: boolean;
  priceLkr?: number | null;
  unlocked?: boolean;
  course: {
    id: string;
    title: LocalizedText | string;
    seoTitle?: string | null;
    seoDescription?: string | null;
  };
  module?: { id: string; title: LocalizedText | string } | null;
  _count: { questions: number; attempts?: number };
}

export type HomepageLocalized = {
  en: string;
  si: string;
  ta: string;
};

export type PublicHomepagePayload = {
  hero: {
    badge: HomepageLocalized;
    title: HomepageLocalized;
    description: HomepageLocalized;
    showSecondaryCta: boolean;
  };
  maxCategories: number;
  promoSection: {
    enabled: boolean;
    badge: HomepageLocalized;
    title: HomepageLocalized;
    description: HomepageLocalized;
    ctaLabel: HomepageLocalized;
    ctaHref: string;
  };
  sections: Array<{
    courseId: string;
    course: CatalogQuiz["course"];
    maxQuizzes: number;
    quizzes: CatalogQuiz[];
  }>;
};

/** Server-side catalog fetch for SSR — guest unlock state is refreshed client-side. */
export async function fetchPublicQuizzes(): Promise<CatalogQuiz[]> {
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as CatalogQuiz[];
  } catch {
    return [];
  }
}

/** Resolved home layout + curated quiz sections. */
export async function fetchPublicHomepage(): Promise<PublicHomepagePayload | null> {
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/homepage`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicHomepagePayload;
  } catch {
    return null;
  }
}

/** Published quizzes for one course — used by the See All course page. */
export async function fetchPublicQuizzesByCourse(courseId: string): Promise<CatalogQuiz[]> {
  const id = courseId.trim();
  if (!id) return [];
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes?courseId=${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as CatalogQuiz[];
  } catch {
    return [];
  }
}
