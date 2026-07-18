import Link from "next/link";

import { ArrowLeft, HelpCircle, LayoutDashboard, ShieldOff } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f4f7fb] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(21,99,184,0.12),_transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/4 size-72 rounded-full bg-[#1563b8]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-1/4 size-56 rounded-full bg-[#0b2a4a]/8 blur-3xl"
      />

      <div className="relative w-full max-w-[420px] rounded-2xl border border-white/80 bg-white px-6 py-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="mb-6 h-9 w-auto sm:h-10" priority />

          <div className="relative mb-5 flex size-20 items-center justify-center sm:size-24">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-gradient-to-b from-[#fee2e2] to-[#fecaca]/70"
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full ring-1 ring-red-200/80"
            />
            <ShieldOff className="relative size-9 text-red-600 sm:size-10" strokeWidth={1.75} />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600/90">
            Error 403
          </p>
          <h1 className="mt-1.5 font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-[#123a6b] sm:text-[1.7rem]">
            Unauthorized access
          </h1>
          <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-slate-500">
            You do not have permission to view this page. Please contact an administrator if you
            believe this is a mistake.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          <Button
            asChild
            className="h-11 w-full gap-2 rounded-xl bg-[#1563b8] font-semibold text-white shadow-sm hover:bg-[#114f94]"
          >
            <Link prefetch={false} href="/">
              <HelpCircle className="size-4" />
              Back to Quizzes
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 w-full gap-2 rounded-xl border-[#1563b8]/35 font-semibold text-[#1563b8] hover:bg-[#eef6ff] hover:text-[#114f94]"
          >
            <Link prefetch={false} href="/admin">
              <LayoutDashboard className="size-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        <div className="mt-6 space-y-4 text-center">
          <Link
            prefetch={false}
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1563b8] transition-colors hover:text-[#114f94]"
          >
            <ArrowLeft className="size-4" />
            Back to Login
          </Link>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Need more help?{" "}
              <a
                href="mailto:support@kadaima.com"
                className="font-medium text-[#1563b8] hover:text-[#114f94]"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
