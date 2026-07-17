import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { ContactPageContent } from "./_components/contact-page-content";

export const metadata: Metadata = {
  title: `Contact us | ${APP_CONFIG.name}`,
  description: `Contact the ${APP_CONFIG.name} team for support, partnerships, and general inquiries.`,
};

export default function ContactPage() {
  return <ContactPageContent />;
}
