import { AuthShell } from "../../_components/auth-shell";
import { ForgotPasswordForm } from "../../_components/forgot-password-form";

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
