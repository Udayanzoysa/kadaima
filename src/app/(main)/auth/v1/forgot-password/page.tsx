import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

import { ForgotPasswordForm } from "../../_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex h-dvh">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <BrandLogo className="mx-auto h-12 w-auto brightness-0 invert" priority />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">Reset access</h1>
              <p className="text-primary-foreground/80 text-xl">We&apos;ll send a one-time code</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Forgot password</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Choose email or SMS. If an account exists, we&apos;ll send a reset code.
            </div>
          </div>
          <ForgotPasswordForm />
          <p className="text-center text-muted-foreground text-xs">
            Already have a code?{" "}
            <Link prefetch={false} href="/reset-password" className="text-primary">
              Enter reset code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
