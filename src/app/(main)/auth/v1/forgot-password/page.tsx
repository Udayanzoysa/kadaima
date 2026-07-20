import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { AuthShell } from "../../_components/auth-shell";
import { ForgotPasswordForm } from "../../_components/forgot-password-form";

export const metadata: Metadata = buildPageMetadata({
  title: "Forgot password",
  description: "Reset your Kadaima account password.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Lost your way?"
      description="Enter your email to receive a recovery link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
