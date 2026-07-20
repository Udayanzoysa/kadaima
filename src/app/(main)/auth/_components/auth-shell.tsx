"use client";

import type { ReactNode } from "react";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  children,
  backHref = "/login",
  backLabel = "Back to Login",
  showSupport = true,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  showSupport?: boolean;
  className?: string;
}) {
  return (
    <div className="auth-form-surface flex min-h-dvh items-center justify-center bg-[#f4f7fb] px-4 py-10">
      <div
        className={cn(
          "w-full max-w-[420px] rounded-2xl border border-white/80 bg-white px-6 py-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10",
          className,
        )}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo className="mb-5 h-10 w-auto sm:h-11" priority />
          <h1 className="font-bold text-2xl tracking-tight text-slate-900 sm:text-[1.65rem]">
            {title}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
        </div>

        {children}

        <div className="mt-6 space-y-3 text-center">
          <Link
            prefetch={false}
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1563b8] transition-colors hover:text-[#114f94]"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
          {showSupport ? (
            <p className="text-xs text-slate-500">
              Need more help?{" "}
              <a
                href="mailto:support@kadaima.com"
                className="font-medium text-[#1563b8] hover:text-[#114f94]"
              >
                Contact Support
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const authPrimaryButtonClass =
  "h-11 w-full rounded-xl bg-[#1563b8] font-medium text-white shadow-sm hover:bg-[#114f94] focus-visible:border-[#1563b8] focus-visible:ring-[#1563b8]/30";

/** Keeps chrome autofill from painting over the field border */
const authAutofillClass =
  "autofill:[-webkit-text-fill-color:#0f172a] autofill:[caret-color:#0f172a] autofill:[box-shadow:inset_0_0_0_1000px_#ffffff] autofill:hover:[box-shadow:inset_0_0_0_1000px_#ffffff] autofill:focus:[box-shadow:inset_0_0_0_1000px_#ffffff]";

/** Standalone inputs (password, plain text fields) */
export const authInputClass = cn(
  "h-11 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-[#1563b8] focus-visible:ring-3 focus-visible:ring-[#1563b8]/25",
  authAutofillClass,
);

/** Outer wrapper for icon + input groups — this is what draws the visible box */
export const authInputGroupClass =
  "relative h-11 isolate overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-colors has-[[data-slot=input-group-control]:focus-visible]:border-[#1563b8] has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-[#1563b8]/25";

/** Inner control inside InputGroup — no second border */
export const authInputGroupControlClass = cn(
  "h-11 border-0 bg-transparent text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-0 focus-visible:ring-0",
  authAutofillClass,
);
