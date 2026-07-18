import type { Metadata } from "next";

import { ProfilePageContent } from "./_components/profile-page-content";

export const metadata: Metadata = {
  title: "My Profile",
  description: "View and update your account details.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfilePageContent />;
}
