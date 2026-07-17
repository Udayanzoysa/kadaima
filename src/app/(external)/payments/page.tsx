import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { PaymentsPageContent } from "./_components/payments-page-content";

export const metadata: Metadata = {
  title: `My Payments | ${APP_CONFIG.name}`,
  description: "View your subscription and quiz unlock payment history.",
};

export default function PaymentsPage() {
  return <PaymentsPageContent />;
}
