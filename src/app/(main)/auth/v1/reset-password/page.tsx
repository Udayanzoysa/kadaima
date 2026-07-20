import { Suspense } from "react";

import { Spinner } from "@/components/ui/spinner";

import { AuthShell } from "../../_components/auth-shell";
import { ResetPasswordForm } from "../../_components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      description="Choose a new password for your account. If you opened this from your email, the link is applied automatically."
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner className="size-6 text-[#1563b8]" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
