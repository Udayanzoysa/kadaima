import type { Metadata } from "next";

import { PaymentsPageContent } from "./_components/payments-page-content";

export const metadata: Metadata = {
  title: "My Payments",
  description: "View your subscription and quiz unlock payment history.",
  robots: { index: false, follow: false },
};

export default function PaymentsPage() {
  return <PaymentsPageContent />;
}
