import type { Metadata } from "next";
import Link from "next/link";

import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata } from "@/lib/page-seo";

const title = "FAQs";
const description = `Frequently asked questions about ${APP_CONFIG.name} quizzes, accounts, unlocks, and teacher pages.`;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/faq",
});

export default function FaqPage() {
  return (
    <SiteStaticPage
      title="Frequently asked questions"
      subtitle="Quick answers about practising on Kadaima."
    >
      <h2>Do I need an account to try a quiz?</h2>
      <p>
        Many quizzes can be started as a guest. Creating a free student account helps you save
        progress, view attempts, and unlock premium papers when needed.
      </p>

      <h2>How do unlocks and payments work?</h2>
      <p>
        Some quizzes require verification before you can start. Follow the unlock steps on the quiz
        page; our team reviews bank-slip or subscription details as configured for that paper.
      </p>

      <h2>Can I practise in Sinhala or Tamil?</h2>
      <p>
        Yes. Use the language switcher in the header. Quiz content appears in the languages the
        teacher published.
      </p>

      <h2>How do I become a teacher on Kadaima?</h2>
      <p>
        Register as a teacher, then set up your public teacher page from the dashboard. See{" "}
        <Link href="/teacher/register" className="font-medium text-[#1563b8] hover:underline">
          Teacher registration
        </Link>{" "}
        and{" "}
        <Link href="/partner" className="font-medium text-[#1563b8] hover:underline">
          How to be a partner
        </Link>
        .
      </p>

      <h2>What is a teacher profile?</h2>
      <p>
        A public page at{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">/t/your-slug</code> where
        students can find your quizzes and class resources once your profile is approved and
        published.
      </p>

      <h2>Still stuck?</h2>
      <p>
        Visit{" "}
        <Link href="/contact" className="font-medium text-[#1563b8] hover:underline">
          Contact us
        </Link>{" "}
        or email{" "}
        <a href="mailto:support@kadaima.lk" className="font-medium text-[#1563b8] hover:underline">
          support@kadaima.lk
        </a>
        .
      </p>
    </SiteStaticPage>
  );
}
