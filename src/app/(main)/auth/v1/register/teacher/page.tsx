import Link from "next/link";

import { Presentation } from "lucide-react";

import { AccountRegisterForm } from "../../../_components/account-register-form";
import { AuthShell } from "../../../_components/auth-shell";
import { GoogleButton } from "../../../_components/social-auth/google-button";

export default function RegisterTeacherV1() {
  return (
    <AuthShell
      icon={<Presentation className="size-7" strokeWidth={1.75} />}
      title="Teacher registration"
      description="Create a teacher account to manage quizzes and the question bank."
      backHref="/login"
      backLabel="Back to Login"
    >
      <div className="space-y-4">
        <AccountRegisterForm accountType="teacher" />
        <div className="relative text-center text-xs text-slate-400 after:absolute after:inset-0 after:top-1/2 after:border-t after:border-slate-200">
          <span className="relative z-10 bg-white px-2">or</span>
        </div>
        <GoogleButton accountType="teacher" />
        <p className="text-center text-xs text-slate-500">
          Learning instead?{" "}
          <Link
            prefetch={false}
            href="/student/register"
            className="font-medium text-sky-600 hover:text-sky-700"
          >
            Register as a student
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
