import type { Metadata } from "next";
import Link from "next/link";

import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";

export const metadata: Metadata = {
  title: `About | ${APP_CONFIG.name}`,
  description: `Learn about ${APP_CONFIG.name}, Sri Lanka’s online exam and quiz portal.`,
};

export default function AboutPage() {
  return (
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
        <li>Practice quizzes in English, Sinhala, or Tamil (one language per quiz)</li>
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
        <Link href="/contact" className="font-medium text-[#2b7fff] hover:underline">
          Contact us
        </Link>{" "}
        page.
      </p>
    </SiteStaticPage>
  );
}
