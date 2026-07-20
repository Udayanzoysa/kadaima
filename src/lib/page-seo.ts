import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { absoluteUrl } from "@/lib/site-url";

export type BuildPageMetadataInput = {
  /** Browser / SERP title segment (root template adds `| SiteName` unless `absoluteTitle`). */
  title: string;
  description: string;
  /** Path starting with `/`, e.g. `/about`. */
  path: string;
  image?: string | null;
  /** Private / session pages — keep out of the index. */
  noIndex?: boolean;
  ogType?: "website" | "profile" | "article";
  keywords?: string | string[] | null;
  siteName?: string;
  /** Use for home so the root title template does not double the brand. */
  absoluteTitle?: boolean;
};

/**
 * Standalone public-page SEO pattern.
 * Every indexable (and noindex) public route should use this so title, canonical,
 * Open Graph, and Twitter stay consistent.
 */
export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = absoluteUrl(path);
  const title = input.title.trim() || APP_CONFIG.name;
  const description =
    input.description.trim() ||
    `Practice exams and quizzes on ${APP_CONFIG.name} — Sri Lanka’s online exam & quiz portal.`;
  const siteName = input.siteName?.trim() || APP_CONFIG.name;
  const image = input.image?.trim() || undefined;

  const keywords = input.keywords
    ? Array.isArray(input.keywords)
      ? input.keywords
      : input.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
    : undefined;

  const robots = input.noIndex
    ? {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large" as const,
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      };

  return {
    title: input.absoluteTitle ? { absolute: title } : title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: path },
    robots,
    openGraph: {
      title,
      description,
      url,
      siteName,
      locale: "en_LK",
      type: input.ogType === "profile" ? "profile" : input.ogType === "article" ? "article" : "website",
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

export type BreadcrumbJsonLdItem = {
  name: string;
  path: string;
};

export function jsonLdBreadcrumbList(items: BreadcrumbJsonLdItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function jsonLdWebSiteAndOrganization(input: {
  siteName: string;
  description: string;
  siteUrl: string;
}) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: input.siteName,
      url: input.siteUrl,
      description: input.description,
      inLanguage: ["en", "si", "ta"],
      publisher: {
        "@type": "Organization",
        name: input.siteName,
        url: input.siteUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: input.siteName,
      url: input.siteUrl,
      logo: absoluteUrl("/brand/kadaima-mark.png"),
      areaServed: {
        "@type": "Country",
        name: "Sri Lanka",
      },
    },
  ];
}

export function jsonLdQuizPage(input: {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  siteName?: string;
  timeRequiredMinutes?: number | null;
}) {
  const url = absoluteUrl(input.path);
  return [
    jsonLdBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Quizzes", path: "/quiz" },
      { name: input.name, path: input.path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Quiz",
      name: input.name,
      description: input.description,
      url,
      learningResourceType: "Quiz",
      inLanguage: ["en", "si", "ta"],
      isAccessibleForFree: true,
      provider: {
        "@type": "Organization",
        name: input.siteName || APP_CONFIG.name,
        url: absoluteUrl("/"),
      },
      ...(input.image ? { image: input.image } : {}),
      ...(input.timeRequiredMinutes
        ? { timeRequired: `PT${Math.max(1, Math.round(input.timeRequiredMinutes))}M` }
        : {}),
    },
  ];
}

export function jsonLdTeacherPage(input: {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  jobTitle?: string | null;
}) {
  const url = absoluteUrl(input.path);
  return [
    jsonLdBreadcrumbList([
      { name: "Home", path: "/" },
      { name: input.name, path: input.path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: input.name,
      description: input.description,
      url,
      mainEntity: {
        "@type": "Person",
        name: input.name,
        url,
        ...(input.jobTitle ? { jobTitle: input.jobTitle } : { jobTitle: "Teacher" }),
        ...(input.image ? { image: input.image } : {}),
      },
    },
  ];
}

export function jsonLdAboutPage(input: { siteName: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${input.siteName}`,
    description: input.description,
    url: absoluteUrl("/about"),
    isPartOf: {
      "@type": "WebSite",
      name: input.siteName,
      url: absoluteUrl("/"),
    },
  };
}

export function jsonLdContactPage(input: { siteName: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${input.siteName}`,
    description: input.description,
    url: absoluteUrl("/contact"),
    isPartOf: {
      "@type": "WebSite",
      name: input.siteName,
      url: absoluteUrl("/"),
    },
  };
}

export function jsonLdCollectionPage(input: {
  name: string;
  description: string;
  path: string;
  siteName: string;
  items: Array<{ name: string; path: string }>;
  breadcrumbs?: BreadcrumbJsonLdItem[];
}) {
  const url = absoluteUrl(input.path);
  const graphs: Record<string, unknown>[] = [];

  if (input.breadcrumbs?.length) {
    graphs.push(jsonLdBreadcrumbList(input.breadcrumbs));
  }

  graphs.push({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: input.siteName,
      url: absoluteUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.slice(0, 50).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  });

  return graphs;
}
