import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { ProfilePageContent } from "./_components/profile-page-content";

export const metadata: Metadata = {
  title: `My Profile | ${APP_CONFIG.name}`,
  description: "View and update your account details.",
};

export default function ProfilePage() {
  return <ProfilePageContent />;
}
