import Link from "next/link";

import { AuthShell } from "../../_components/auth-shell";
import { LoginForm } from "../../_components/login-form";
import { GoogleButton } from "../../_components/social-auth/google-button";

export default function LoginV1() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your email and password to continue."
      backHref="/"
      backLabel="Back to home"
    >
      <div className="space-y-4">
        <LoginForm />
        <div className="relative text-center text-xs text-slate-400 after:absolute after:inset-0 after:top-1/2 after:border-t after:border-slate-200">
          <span className="relative z-10 bg-white px-2">or</span>
        </div>
        <GoogleButton accountType="student" />
        <p className="text-center text-xs text-slate-500">
          New here?{" "}
          <Link prefetch={false} href="/student/register" className="font-medium text-[#2b7fff] hover:text-[#1f6ae0]">
            Student
          </Link>
          {" · "}
          <Link prefetch={false} href="/teacher/register" className="font-medium text-[#2b7fff] hover:text-[#1f6ae0]">
            Teacher
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
