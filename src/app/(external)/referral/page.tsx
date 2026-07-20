import type { Metadata } from "next";
import Link from "next/link";

import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata } from "@/lib/page-seo";

const title = "Referral";
const description = `Share ${APP_CONFIG.name} with friends and classmates — referral details for students and teachers.`;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/referral",
});

export default function ReferralPage() {
  return (
    <SiteStaticPage
      title="Referral"
      subtitle="Invite classmates and colleagues to practise on Kadaima."
    >
      <p>
        Sharing Kadaima helps more Sri Lankan students prepare for Scholarship, O/L, A/L, and other
        exams. Send your friends to the homepage or your teacher’s public page so they can start
        practising quickly.
      </p>

      <h2>For students</h2>
      <ul>
        <li>
          Share the site:{" "}
          <Link href="/" className="font-medium text-[#1563b8] hover:underline">
            kadaima.com
          </Link>
        </li>
        <li>Point friends to a specific quiz from the catalogue after you open it</li>
        <li>
          Create a free account via{" "}
          <Link href="/student/register" className="font-medium text-[#1563b8] hover:underline">
            Student registration
          </Link>{" "}
          so progress and attempts stay saved
        </li>
      </ul>

      <h2>For teachers</h2>
      <ul>
        <li>
          Publish your teacher page and share{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">/t/your-slug</code>
        </li>
        <li>
          Register or upgrade via{" "}
          <Link href="/teacher/register" className="font-medium text-[#1563b8] hover:underline">
            Teacher registration
          </Link>
        </li>
        <li>
          For institutional sharing or co-branded campaigns, see{" "}
          <Link href="/partner" className="font-medium text-[#1563b8] hover:underline">
            How to be a partner
          </Link>
        </li>
      </ul>

      <h2>Rewards programme</h2>
      <p>
        Formal referral rewards (credits, unlocks, or partner incentives) may be announced for
        selected campaigns. Until then, sharing your quiz links and teacher page is the best way to
        grow your class on Kadaima. Questions?{" "}
        <Link href="/contact" className="font-medium text-[#1563b8] hover:underline">
          Contact us
        </Link>
        .
      </p>
    </SiteStaticPage>
  );
}
