import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/site/json-ld";
import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdAboutPage } from "@/lib/page-seo";

const title = "About";
const description = `Learn about ${APP_CONFIG.name}, Sri Lanka’s online exam and quiz portal for Scholarship, O/L, A/L, and more.`;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={jsonLdAboutPage({
          siteName: APP_CONFIG.name,
          description,
        })}
      />
      <SiteStaticPage
        title="About Kadaima"
        subtitle="Sri Lanka’s online exam & quiz portal for students and teachers."
      >
        <p>
          Kadaima helps students practise for school and national exams with structured quizzes,
          timed attempts, and clear results — while teachers publish courses, question banks, and
          public practice papers.
        </p>

        <h2>What we offer</h2>
        <ul>
          <li>Practice quizzes in English, Sinhala, and/or Tamil</li>
          <li>Timed attempts with progress saving and result summaries</li>
          <li>Teacher pages to share quizzes and class resources</li>
          <li>Optional unlock and subscription options for premium practice content</li>
        </ul>

        <h2>Our focus</h2>
        <p>
          We build for Sri Lankan learners — Scholarship, O/L, A/L, and other academic pathways —
          with a simple experience that works on phone and desktop.
        </p>

        <h2>Get in touch</h2>
        <p>
          Questions about the platform, partnerships, or classroom use? Visit our{" "}
          <Link href="/contact" className="font-medium text-[#1563b8] hover:underline">
            Contact us
          </Link>{" "}
          page.
        </p>
      </SiteStaticPage>
    </>
  );
}
