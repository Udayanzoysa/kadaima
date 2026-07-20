import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { MyAttemptsList } from "./_components/my-attempts-list";

export const metadata: Metadata = buildPageMetadata({
  title: "My Attempts",
  description: "Review your completed quiz attempts and results.",
  path: "/quiz/my-attempts",
  noIndex: true,
});

export default function MyAttemptsPage() {
  return <MyAttemptsList />;
}
