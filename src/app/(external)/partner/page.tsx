import type { Metadata } from "next";

import { JsonLd } from "@/components/site/json-ld";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdBreadcrumbList } from "@/lib/page-seo";
import { absoluteUrl } from "@/lib/site-url";

import { PartnerPageContent } from "./_components/partner-page-content";

const title = "Partner with Kadaima: Empowering Educators Across Sri Lanka";
const description =
  "Work with Kadaima to reach students nationwide, share your expertise, and generate a steady extra income. Open to teachers, tutors, language instructors, and institutes.";

const base = buildPageMetadata({
  title,
  description,
  path: "/partner",
  keywords: [
    "Kadaima partners",
    "teacher account Sri Lanka",
    "online quiz platform teachers",
    "IELTS tutor Sri Lanka",
    "O/L A/L teacher earnings",
  ],
});

export const metadata: Metadata = {
  ...base,
  openGraph: {
    ...base.openGraph,
    locale: "en_LK",
    alternateLocale: ["si_LK", "ta_LK"],
  },
};

function jsonLdPartnerPage() {
  return [
    jsonLdBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Partner with Kadaima", path: "/partner" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: absoluteUrl("/partner"),
      inLanguage: ["en", "si", "ta"],
      isPartOf: {
        "@type": "WebSite",
        name: APP_CONFIG.name,
        url: absoluteUrl("/"),
      },
      about: {
        "@type": "Organization",
        name: APP_CONFIG.name,
        email: "partners@kadaima.lk",
      },
    },
  ];
}

export default function PartnerPage() {
  return (
    <>
      <JsonLd data={jsonLdPartnerPage()} />
      <PartnerPageContent />
    </>
  );
}
