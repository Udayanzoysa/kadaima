import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { PaymentsPageContent } from "./_components/payments-page-content";

export const metadata: Metadata = buildPageMetadata({
  title: "My Payments",
  description: "View your subscription and quiz unlock payment history.",
  path: "/payments",
  noIndex: true,
});

export default function PaymentsPage() {
  return <PaymentsPageContent />;
}
