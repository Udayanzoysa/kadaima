import { APP_CONFIG } from "@/config/app-config";

export type SiteSeo = {
  siteName: string;
  metaTitle: string;
  metaDescription: string;
  googleAnalyticsId: string | null;
  ogImageUrl: string | null;
  keywords: string | null;
};

export const DEFAULT_SITE_SEO: SiteSeo = {
  siteName: APP_CONFIG.name,
  metaTitle: APP_CONFIG.meta.title,
  metaDescription: APP_CONFIG.meta.description,
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-80G4MMHK8B",
  ogImageUrl: null,
  keywords: "online exam, quiz portal, scholarship, O/L, A/L, Sri Lanka, Kadaima",
};

/** Fetch public SEO config (cached). Falls back to APP_CONFIG defaults. */
export async function getSiteSeo(): Promise<SiteSeo> {
  try {
    const res = await fetch(`${APP_CONFIG.apiUrl}/public/settings/seo`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_SITE_SEO;
    const data = (await res.json()) as Partial<SiteSeo>;
    return {
      siteName: data.siteName?.trim() || DEFAULT_SITE_SEO.siteName,
      metaTitle: data.metaTitle?.trim() || DEFAULT_SITE_SEO.metaTitle,
      metaDescription: data.metaDescription?.trim() || DEFAULT_SITE_SEO.metaDescription,
      googleAnalyticsId: data.googleAnalyticsId?.trim() || null,
      ogImageUrl: data.ogImageUrl?.trim() || null,
      keywords: data.keywords?.trim() || null,
    };
  } catch {
    return DEFAULT_SITE_SEO;
  }
}
