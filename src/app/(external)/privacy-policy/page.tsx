import type { Metadata } from "next";
import Link from "next/link";

import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP_CONFIG.name} collects, uses, and protects your personal information.`,
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <SiteStaticPage
      title="Privacy Policy"
      subtitle="Last updated: 17 July 2026"
    >
      <p>
        This Privacy Policy explains how Kadaima (“we”, “us”) collects and uses information when you
        use our website and learning services.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>Account details such as name, email, phone number, and school (when provided)</li>
        <li>Quiz activity, including attempts, answers, scores, and progress</li>
        <li>Payment-related references for unlocks or subscriptions (processed via payment partners)</li>
        <li>Technical data such as browser type, device, and basic usage logs</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To create and manage student and teacher accounts</li>
        <li>To deliver quizzes, results, and learning progress</li>
        <li>To process unlocks, subscriptions, vouchers, and bank-slip reviews</li>
        <li>To improve platform reliability, security, and support</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>
        We do not sell personal data. We may share limited information with service providers that
        help us operate Kadaima (for example hosting, email/SMS delivery, or PayHere payment
        processing), and when required by law.
      </p>

      <h2>4. Data retention</h2>
      <p>
        We keep account and quiz records for as long as needed to provide the service, meet legal
        obligations, and resolve disputes. You may request account deletion by contacting support.
      </p>

      <h2>5. Security</h2>
      <p>
        We use reasonable technical and organisational measures to protect your information. No
        online service is fully risk-free; please keep your password confidential.
      </p>

      <h2>6. Children & students</h2>
      <p>
        Kadaima is used for educational practice. Guardians or schools should supervise younger
        students where appropriate. Contact us if you believe a child’s data was submitted without
        proper consent.
      </p>

      <h2>7. Contact</h2>
      <p>
        For privacy questions, email{" "}
        <a
          href="mailto:support@kadaima.com"
          className="font-medium text-[#2b7fff] hover:underline"
        >
          support@kadaima.com
        </a>{" "}
        or visit our{" "}
        <Link href="/contact" className="font-medium text-[#2b7fff] hover:underline">
          Contact us
        </Link>{" "}
        page.
      </p>
    </SiteStaticPage>
  );
}
