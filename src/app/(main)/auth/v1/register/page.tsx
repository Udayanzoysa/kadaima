import Link from "next/link";

import { GraduationCap, Presentation, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AuthShell } from "../../_components/auth-shell";

export default function RegisterHubV1() {
  return (
    <AuthShell
      icon={<UserPlus className="size-7" strokeWidth={1.75} />}
      title="Create an account"
      description="Choose how you want to join Kadaima."
      backHref="/login"
      backLabel="Back to Login"
    >
      <div className="grid gap-3">
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-4 rounded-xl border-slate-200 p-4 text-left hover:border-sky-300 hover:bg-sky-50/50"
        >
          <Link prefetch={false} href="/student/register">
            <GraduationCap className="size-6 shrink-0 text-sky-600" />
            <span>
              <span className="block font-medium text-slate-900">I&apos;m a student</span>
              <span className="block text-xs font-normal text-slate-500">
                Take quizzes and view My Quizzes
              </span>
            </span>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-4 rounded-xl border-slate-200 p-4 text-left hover:border-sky-300 hover:bg-sky-50/50"
        >
          <Link prefetch={false} href="/teacher/register">
            <Presentation className="size-6 shrink-0 text-sky-600" />
            <span>
              <span className="block font-medium text-slate-900">I&apos;m a teacher</span>
              <span className="block text-xs font-normal text-slate-500">
                Manage quizzes and the question bank
              </span>
            </span>
          </Link>
        </Button>
      </div>
    </AuthShell>
  );
}
