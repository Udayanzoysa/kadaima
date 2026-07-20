import type { Metadata } from "next";
import Link from "next/link";

import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms & Conditions",
  description: `Terms and conditions for using ${APP_CONFIG.name}.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <SiteStaticPage
      title="Terms & Conditions"
      subtitle="Last updated: 17 July 2026"
    >
      <p>
        By accessing or using Kadaima, you agree to these Terms & Conditions. If you do not agree,
        please do not use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        Kadaima provides online quizzes, practice assessments, teacher pages, and related learning
        tools. Features may change as we improve the platform.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate registration details</li>
        <li>You are responsible for activity under your account</li>
        <li>Keep login credentials secure and notify us of suspected misuse</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not cheat, share answer keys improperly, or disrupt other users</li>
        <li>Do not upload unlawful, harmful, or infringing content</li>
        <li>Do not attempt to bypass payment, unlock, or security controls</li>
      </ul>

      <h2>4. Payments & access</h2>
      <p>
        Some quizzes may require unlock, subscription, voucher, or bank-slip approval. Fees,
        renewal dates, and access rules are shown at checkout or in admin-configured billing
        settings. Approved access applies according to the active payment mode.
      </p>

      <h2>5. Content & academic use</h2>
      <p>
        Quizzes and materials are for learning and practice. Results are indicators of performance
        on Kadaima and are not official national exam results unless explicitly stated by an exam
        body.
      </p>

      <h2>6. Teachers</h2>
      <p>
        Teachers are responsible for the accuracy and appropriateness of content they publish,
        including public teacher pages and attached quizzes.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Kadaima is provided “as is”. We are not liable for
        indirect or consequential losses arising from use of the platform, including exam outcomes
        or temporary service interruptions.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms from time to time. Continued use after changes means you accept
        the updated terms. The “Last updated” date above reflects the latest revision.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms? Email{" "}
        <a
          href="mailto:support@kadaima.com"
          className="font-medium text-[#1563b8] hover:underline"
        >
          support@kadaima.com
        </a>{" "}
        or see{" "}
        <Link href="/contact" className="font-medium text-[#1563b8] hover:underline">
          Contact us
        </Link>
        .
      </p>
    </SiteStaticPage>
  );
}
