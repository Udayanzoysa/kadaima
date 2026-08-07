import { Suspense } from "react";

import type { Metadata } from "next";

import { JsonLd } from "@/components/site/json-ld";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdContactPage } from "@/lib/page-seo";

import { ContactPageContent } from "./_components/contact-page-content";

const description = `Contact the ${APP_CONFIG.name} team for support, partnerships, and general inquiries.`;

export const metadata: Metadata = buildPageMetadata({
  title: "Contact us",
  description,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={jsonLdContactPage({
          siteName: APP_CONFIG.name,
          description,
        })}
      />
      <Suspense fallback={<PublicContentSkeleton variant="form" className="flex-1 py-8" />}>
        <ContactPageContent />
      </Suspense>
    </>
  );
}
