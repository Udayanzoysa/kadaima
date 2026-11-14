import Link from "next/link";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { JsonLd } from "@/components/site/json-ld";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata, jsonLdFaqPage, jsonLdLmsPage } from "@/lib/page-seo";

const title = "Kadaima Classroom LMS | Online Tuition & Quiz Platform Sri Lanka";
const description =
  "Complete Sri Lankan Learning Management System (LMS) for tuition teachers, institutes, and students. Manage online batches, timetables, attendance, lessons, quizzes, and PayHere tuition billing.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/lms",
  absoluteTitle: true,
  keywords: [
    "Kadaima LMS",
    "Sri Lanka LMS",
    "online tuition management system Sri Lanka",
    "classroom LMS Sri Lanka",
    "online exam and quiz platform",
    "tuition attendance and fee tracking",
  ],
});

const LMS_FEATURES = [
  {
    icon: Users,
    title: "Class Batches & Student Roster",
    description:
      "Organize O/L, A/L, Scholarship, and subject batches with invite links, capacity limits, and co-teacher permissions.",
  },
  {
    icon: CalendarDays,
    title: "Weekly Schedules & Student Timetable",
    description:
      "Publish recurring class schedules and live sessions that automatically appear in each enrolled student’s personal timetable.",
  },
  {
    icon: BookOpen,
    title: "Protected Lessons & Assigned Quizzes",
    description:
      "Share lesson notes, PDFs, and timed MCQ quizzes exclusively with enrolled students using secure authenticated delivery.",
  },
  {
    icon: ClipboardCheck,
    title: "Session Attendance Tracking",
    description:
      "Mark present, absent, or late attendance per class session with full audit history and lock controls.",
  },
  {
    icon: CreditCard,
    title: "Monthly Tuition Billing & PayHere",
    description:
      "Generate monthly tuition invoices in LKR, accept PayHere online payments or bank slips, and issue instant digital receipts.",
  },
  {
    icon: ShieldCheck,
    title: "Trilingual Support (EN / SI / TA)",
    description:
      "Built for Sri Lankan learners with full support for English, Sinhala, and Tamil quizzes, teacher storefronts, and alerts.",
  },
];

const LMS_FAQS = [
  {
    question: "What is Kadaima Classroom LMS?",
    answer:
      "Kadaima Classroom LMS is a Sri Lankan online learning management system combining tuition batch management, timetables, attendance, protected lesson materials, online quizzes, and monthly tuition billing in one platform.",
  },
  {
    question: "Can Sri Lankan tuition teachers accept PayHere and bank slips?",
    answer:
      "Yes. Teachers and institutes can generate monthly tuition invoices in LKR and accept both PayHere online payments and manual bank-slip uploads with automatic receipt generation.",
  },
  {
    question: "Does Kadaima LMS support Sinhala, Tamil, and English medium classes?",
    answer: "Yes. Teachers can publish courses, quizzes, and public teacher profiles in Sinhala, Tamil, and English.",
  },
];

export default function LmsOverviewPage() {
  return (
    <>
      <JsonLd data={[...jsonLdLmsPage({ siteName: APP_CONFIG.name, description }), jsonLdFaqPage(LMS_FAQS)]} />
      <PublicQuizShell>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10">
          <section className="relative overflow-hidden rounded-3xl border border-[#D8E6F8] bg-linear-to-r from-[#EBF3FE] via-[#F2F7FF] to-[#E3EFFF] p-6 shadow-xs sm:p-10">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center rounded-full bg-white/90 px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#1769D2] uppercase ring-1 ring-[#1769D2]/20">
                Sri Lanka Classroom LMS
              </span>
              <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-extrabold leading-tight tracking-tight text-[#12243E] sm:text-4xl">
                All-in-One <span className="text-[#1769D2]">Learning Management System</span> for Sri Lankan Classes
                &amp; Quizzes
              </h1>
              <p className="text-sm leading-relaxed text-[#475569] sm:text-base">
                Run online tuition batches, publish Grade 5 Scholarship, G.C.E. O/L, and A/L practice quizzes, track
                attendance, and automate monthly LKR tuition billing — all inside Kadaima LMS.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Link
                  href="/teacher/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1152AA]"
                >
                  <span>Start Teaching on Kadaima</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/quiz"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DFE7F1] bg-white px-6 text-sm font-semibold text-[#12243E] shadow-2xs transition hover:bg-slate-50"
                >
                  <span>Browse Practice Quizzes</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="lms-features-heading">
            <h2
              id="lms-features-heading"
              className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-[#12243E]"
            >
              Built for Tuition Teachers, Institutes &amp; Students
            </h2>
            <p className="mt-1 text-sm text-[#475569]">
              Everything required to teach online in Sri Lanka without juggling separate spreadsheets, chat groups, and
              exam tools.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LMS_FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <article key={feat.title} className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#EBF3FE] text-[#1769D2]">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-[family-name:var(--font-outfit)] text-base font-bold text-[#12243E]">
                      {feat.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">{feat.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            className="mt-10 rounded-3xl border border-[#DFE7F1] bg-white p-6 sm:p-8"
            aria-labelledby="lms-faq-heading"
          >
            <h2
              id="lms-faq-heading"
              className="font-[family-name:var(--font-outfit)] text-xl font-bold text-[#12243E] sm:text-2xl"
            >
              Kadaima LMS — Frequently Asked Questions
            </h2>
            <div className="mt-5 space-y-5">
              {LMS_FAQS.map((item) => (
                <div key={item.question} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <h3 className="flex items-start gap-2 text-base font-semibold text-[#12243E]">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1769D2]" />
                    <span>{item.question}</span>
                  </h3>
                  <p className="mt-1.5 pl-6 text-sm leading-relaxed text-[#475569]">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </PublicQuizShell>
    </>
  );
}
