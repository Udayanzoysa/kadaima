import Link from "next/link";

import type { Metadata } from "next";

import { JsonLd } from "@/components/site/json-ld";
import { SiteStaticPage } from "@/components/site/site-static-page";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdFaqPage } from "@/lib/page-seo";

const title = "FAQs — Online Classes, Quizzes & LMS";
const description = `Frequently asked questions about ${APP_CONFIG.name} Classroom LMS, online tuition classes, practice quizzes, accounts, and teacher pages in Sri Lanka.`;

const FAQ_JSON_LD_ITEMS = [
  {
    question: "Do I need an account to try a quiz?",
    answer:
      "Many quizzes can be started as a guest. Creating a free student account helps you save progress, view attempts, join online classes, and unlock premium papers when needed.",
  },
  {
    question: "How does Kadaima Classroom LMS work for online tuition classes?",
    answer:
      "Students can join teacher-led batches using class invitations, view their weekly timetable, access protected lesson notes and assigned quizzes, track attendance, and settle monthly tuition fees online.",
  },
  {
    question: "How do unlocks and payments work?",
    answer:
      "Some quizzes and class tuition invoices support PayHere online payments or bank-slip verification. Once approved, access is unlocked automatically for your student account.",
  },
  {
    question: "Can I practise in Sinhala or Tamil?",
    answer:
      "Yes. Use the language switcher in the header. Quiz and class content appears in English, Sinhala, or Tamil depending on the languages published by the teacher.",
  },
  {
    question: "How do I become a teacher on Kadaima?",
    answer:
      "Register as a teacher at /teacher/register, create your public teacher storefront, and launch online quizzes, question banks, and classroom batches from your dashboard.",
  },
  {
    question: "What is a teacher profile?",
    answer:
      "A public page at /t/your-slug where students can discover your bio, class schedules, and published practice quizzes.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={jsonLdFaqPage(FAQ_JSON_LD_ITEMS)} />
      <SiteStaticPage
        title="Frequently asked questions"
        subtitle="Quick answers about practising quizzes and learning on Kadaima LMS."
      >
        <h2>Do I need an account to try a quiz?</h2>
        <p>
          Many quizzes can be started as a guest. Creating a free student account helps you save progress, view
          attempts, join online classes, and unlock premium papers when needed.
        </p>

        <h2>How does Kadaima Classroom LMS work for online tuition classes?</h2>
        <p>
          Students can join teacher-led batches, view their personal{" "}
          <Link href="/timetable" className="font-medium text-[#1563b8] hover:underline">
            timetable
          </Link>
          , access protected lesson resources and assigned quizzes, track attendance, and settle monthly tuition fees.
          Learn more on our{" "}
          <Link href="/lms" className="font-medium text-[#1563b8] hover:underline">
            Kadaima Classroom LMS
          </Link>{" "}
          overview.
        </p>

        <h2>How do unlocks and payments work?</h2>
        <p>
          Some quizzes and tuition invoices require verification or payment before access. Follow the unlock or tuition
          checkout steps; PayHere and bank-slip submissions are supported as configured for that paper or class.
        </p>

        <h2>Can I practise in Sinhala or Tamil?</h2>
        <p>
          Yes. Use the language switcher in the header. Quiz content appears in the languages the teacher published.
        </p>

        <h2>How do I become a teacher on Kadaima?</h2>
        <p>
          Register as a teacher, then set up your public teacher page and classes from the dashboard. See{" "}
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
          A public page at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">/t/your-slug</code> where
          students can find your quizzes and class resources once your profile is approved and published. Browse{" "}
          <Link href="/teachers" className="font-medium text-[#1563b8] hover:underline">
            verified teachers
          </Link>
          .
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
    </>
  );
}
