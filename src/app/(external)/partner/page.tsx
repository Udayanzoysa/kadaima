import type { Metadata } from "next";
import Link from "next/link";

import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata } from "@/lib/page-seo";

const title = "Become a partner";
const description = `Partner with ${APP_CONFIG.name} — schools, institutes, and education brands in Sri Lanka.`;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/partner",
});

export default function PartnerPage() {
  return (
    <SiteStaticPage
      title="How to be a partner"
      subtitle="Work with Kadaima to reach students and teachers across Sri Lanka."
    >
      <p>
        We partner with schools, tuition centres, publishers, and education brands who want to
        offer structured online practice — quizzes, timed attempts, and results — under a trusted
        local platform.
      </p>

      <h2>Who this is for</h2>
      <ul>
        <li>Schools and institutes rolling out digital practice for Scholarship, O/L, or A/L</li>
        <li>Teachers and content creators who want a public profile and shared quiz library</li>
        <li>Organisations looking for co-branded exams, events, or institutional licences</li>
      </ul>

      <h2>What you get</h2>
      <ul>
        <li>Teacher accounts with courses, question banks, and public teacher pages</li>
        <li>Optional unlock / subscription flows for premium practice content</li>
        <li>Support for English, Sinhala, and Tamil where your content needs it</li>
      </ul>

      <h2>Next step</h2>
      <p>
        Email{" "}
        <a href="mailto:partners@kadaima.lk" className="font-medium text-[#1563b8] hover:underline">
          partners@kadaima.lk
        </a>{" "}
        or send a note via our{" "}
        <Link href="/contact" className="font-medium text-[#1563b8] hover:underline">
          Contact us
        </Link>{" "}
        page (choose Teachers &amp; schools). Already teaching?{" "}
        <Link href="/teacher/register" className="font-medium text-[#1563b8] hover:underline">
          Create a teacher account
        </Link>
        .
      </p>
    </SiteStaticPage>
  );
}
