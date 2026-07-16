import Link from "next/link";

import { GraduationCap, Presentation } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function RegisterHubV1() {
  return (
    <div className="flex h-dvh">
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Create an account</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Choose how you want to join Techwing LMS.
            </div>
          </div>

          <div className="grid gap-4">
            <Button asChild variant="outline" className="h-auto justify-start gap-4 p-4 text-left">
              <Link prefetch={false} href="/student/register">
                <GraduationCap className="size-6 shrink-0" />
                <span>
                  <span className="block font-medium">I&apos;m a student</span>
                  <span className="block text-muted-foreground text-xs font-normal">
                    Take quizzes and view My Quizzes
                  </span>
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start gap-4 p-4 text-left">
              <Link prefetch={false} href="/teacher/register">
                <Presentation className="size-6 shrink-0" />
                <span>
                  <span className="block font-medium">I&apos;m a teacher</span>
                  <span className="block text-muted-foreground text-xs font-normal">
                    Manage quizzes and the question bank
                  </span>
                </span>
              </Link>
            </Button>
          </div>

          <p className="text-center text-muted-foreground text-xs">
            Already have an account?{" "}
            <Link prefetch={false} href="/login" className="text-primary">
              Login
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <BrandLogo className="mx-auto h-12 w-auto brightness-0 invert" priority />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">Welcome!</h1>
              <p className="text-primary-foreground/80 text-xl">You&apos;re in the right place.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
