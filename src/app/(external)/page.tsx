import { PublicQuizCatalog } from "@/app/quiz/_components/public-quiz-catalog";
import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { JsonLd } from "@/components/site/json-ld";
import { APP_CONFIG } from "@/config/app-config";
import { I18nProvider } from "@/hooks/use-i18n";
import { DEFAULT_SITE_SEO, getSiteSeo } from "@/lib/site-seo";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

import { PublicHomeHero } from "./_components/public-home-hero";

/** Public Kadaima home — hero + catalog follow the selected locale. */
export default async function HomePage() {
  const seo = await getSiteSeo();
  const siteUrl = getSiteUrl();
  const siteName = seo.siteName || APP_CONFIG.name;
  const description = seo.metaDescription || DEFAULT_SITE_SEO.metaDescription;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
      description,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
      logo: absoluteUrl("/brand/kadaima-mark.png"),
    },
  ];

  return (
    <I18nProvider>
      <JsonLd data={structuredData} />
      <PublicQuizShell activeNav="quiz">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
          <PublicHomeHero />
          <PublicQuizCatalog embed />
        </main>
      </PublicQuizShell>
    </I18nProvider>
  );
}
