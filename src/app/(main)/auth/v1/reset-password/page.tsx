import { Suspense } from "react";

import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

import { ResetPasswordForm } from "../../_components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-dvh">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <BrandLogo className="mx-auto h-12 w-auto brightness-0 invert" priority />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">New password</h1>
              <p className="text-primary-foreground/80 text-xl">
                Set a new password for your account
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Reset password</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Choose a new password (min. 8 characters). If you opened this from your email link,
              email and code are applied automatically.
            </div>
          </div>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
          <p className="text-center text-muted-foreground text-xs">
            <Link prefetch={false} href="/forgot-password" className="text-primary">
              Request a new link
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
