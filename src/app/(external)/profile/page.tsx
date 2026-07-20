import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { ProfilePageContent } from "./_components/profile-page-content";

export const metadata: Metadata = buildPageMetadata({
  title: "My Profile",
  description: "View and update your account details.",
  path: "/profile",
  noIndex: true,
});

export default function ProfilePage() {
  return <ProfilePageContent />;
}
