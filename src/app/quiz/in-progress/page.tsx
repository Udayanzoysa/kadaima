import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { InProgressList } from "./_components/in-progress-list";

export const metadata: Metadata = buildPageMetadata({
  title: "In Progress",
  description: "Resume quizzes you have started.",
  path: "/quiz/in-progress",
  noIndex: true,
});

export default function InProgressPage() {
  return <InProgressList />;
}
