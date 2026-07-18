import Link from "next/link";

import { AccountRegisterForm } from "../../../_components/account-register-form";
import { AuthShell } from "../../../_components/auth-shell";
import { GoogleButton } from "../../../_components/social-auth/google-button";

export default function RegisterStudentV1() {
  return (
    <AuthShell
      title="Student registration"
      description="Create a student account to take quizzes and track your attempts."
      backHref="/login"
      backLabel="Back to Login"
    >
      <div className="space-y-4">
        <AccountRegisterForm accountType="student" />
        <div className="relative text-center text-xs text-slate-400 after:absolute after:inset-0 after:top-1/2 after:border-t after:border-slate-200">
          <span className="relative z-10 bg-white px-2">or</span>
        </div>
        <GoogleButton accountType="student" redirectTo="/" />
        <p className="text-center text-xs text-slate-500">
          Teaching instead?{" "}
          <Link
            prefetch={false}
            href="/teacher/register"
            className="font-medium text-[#2b7fff] hover:text-[#1f6ae0]"
          >
            Register as a teacher
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
