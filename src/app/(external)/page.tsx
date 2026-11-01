import type { Metadata } from "next";

import { PublicQuizCatalog } from "@/app/quiz/_components/public-quiz-catalog";
import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { TeacherShowcaseSection } from "@/components/home/teacher-showcase-section";
import { JsonLd } from "@/components/site/json-ld";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdWebSiteAndOrganization } from "@/lib/page-seo";
import { fetchPublicHomepage } from "@/lib/public-quizzes";
import { fetchFeaturedTeachers } from "@/lib/public-teachers";
import { DEFAULT_SITE_SEO, getSiteSeo } from "@/lib/site-seo";
import { getSiteUrl } from "@/lib/site-url";

import { PublicHomeHero } from "./_components/public-home-hero";
import { PublicHomePromo } from "./_components/public-home-promo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();
  return buildPageMetadata({
    title: seo.metaTitle?.trim() || DEFAULT_SITE_SEO.metaTitle,
    description: seo.metaDescription?.trim() || DEFAULT_SITE_SEO.metaDescription,
    path: "/",
    image: seo.ogImageUrl,
    keywords: seo.keywords,
    siteName: seo.siteName || APP_CONFIG.name,
    absoluteTitle: true,
  });
}

/** Public Kadaima home — hero + curated catalog from homepage settings. */
export default async function HomePage() {
  const [seo, homepage, featuredTeachers] = await Promise.all([
    getSiteSeo(),
    fetchPublicHomepage(),
    fetchFeaturedTeachers(),
  ]);
  const siteUrl = getSiteUrl();
  const siteName = seo.siteName || APP_CONFIG.name;
  const description = seo.metaDescription || DEFAULT_SITE_SEO.metaDescription;

  return (
    <>
      <JsonLd
        data={jsonLdWebSiteAndOrganization({
          siteName,
          description,
          siteUrl,
        })}
      />
      <PublicQuizShell activeNav="quiz">
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
          <PublicHomeHero hero={homepage?.hero} />
          <TeacherShowcaseSection teachers={featuredTeachers} />
          <PublicQuizCatalog
            embed
            homeSections={homepage?.sections}
            initialQuizzes={homepage?.sections.flatMap((s) => s.quizzes) ?? []}
          />
          {homepage?.promoSection ? <PublicHomePromo promo={homepage.promoSection} /> : null}
        </main>
      </PublicQuizShell>
    </>
  );
}
