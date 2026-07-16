import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

import { AccountRegisterForm } from "../../../_components/account-register-form";

export default function RegisterTeacherV1() {
  return (
    <div className="flex h-dvh">
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Teacher registration</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Create a teacher account to manage quizzes and the question bank.
            </div>
          </div>
          <div className="space-y-4">
            <AccountRegisterForm accountType="teacher" />
            <p className="text-center text-muted-foreground text-xs">
              Learning instead?{" "}
              <Link prefetch={false} href="/student/register" className="text-primary">
                Register as a student
              </Link>
            </p>
            <p className="text-center text-muted-foreground text-xs">
              Already have an account?{" "}
              <Link prefetch={false} href="/login" className="text-primary">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <BrandLogo className="mx-auto h-12 w-auto brightness-0 invert" priority />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">Teach</h1>
              <p className="text-primary-foreground/80 text-xl">Build quizzes and question banks.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
