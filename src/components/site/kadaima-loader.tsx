"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

type KadaimaLoaderProps = {
  /** Full-viewport overlay (default) or inline block for page sections. */
  variant?: "overlay" | "page" | "inline";
  label?: string;
  className?: string;
};

/**
 * Branded Kadaima loading state used across the full site.
 * Theme: brand blue `#2b7fff` on soft `#f4f7fb`.
 */
export function KadaimaLoader({
  variant = "page",
  label = "Kadaima is loading…",
  className,
}: KadaimaLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-5 text-center",
        variant === "overlay" &&
          "fixed inset-0 z-[200] bg-[#f4f7fb]/92 backdrop-blur-sm",
        variant === "page" && "min-h-[50vh] w-full bg-[#f4f7fb] px-6 py-16",
        variant === "inline" && "min-h-40 w-full px-4 py-10",
        className,
      )}
    >
      <div className="relative flex size-20 items-center justify-center sm:size-24">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-[#2b7fff]/15"
        />
        <span
          aria-hidden
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#2b7fff] border-r-[#2b7fff]/40"
          style={{ animationDuration: "0.9s" }}
        />
        <span
          aria-hidden
          className="absolute inset-2 animate-pulse rounded-full bg-[#2b7fff]/8"
        />
        <BrandLogo variant="mark" className="relative z-10 size-10 sm:size-12" priority />
      </div>

      <div className="space-y-1.5">
        <p className="font-semibold text-base tracking-tight text-[#123a6b] sm:text-lg">
          Kadaima
        </p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>

      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="size-1.5 animate-bounce rounded-full bg-[#2b7fff] [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-[#2b7fff] [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-[#2b7fff]" />
      </div>
    </div>
  );
}
