import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/lib/page-seo";

import { AuthShell } from "../../_components/auth-shell";
import { LoginForm } from "../../_components/login-form";
import { GoogleButton } from "../../_components/social-auth/google-button";

export const metadata: Metadata = buildPageMetadata({
  title: "Log in",
  description: "Sign in to your Kadaima account to continue practice quizzes and track progress.",
  path: "/login",
  noIndex: true,
});

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
          <Link prefetch={false} href="/student/register" className="font-medium text-[#1563b8] hover:text-[#114f94]">
            Student
          </Link>
          {" · "}
          <Link prefetch={false} href="/teacher/register" className="font-medium text-[#1563b8] hover:text-[#114f94]">
            Teacher
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
