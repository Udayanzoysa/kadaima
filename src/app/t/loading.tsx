import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";

/** Teacher pages use a marketing shell — keep brand visible while loading. */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#f4f7fb]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo className="h-8 w-auto" priority />
          </Link>
        </div>
      </header>
      <PublicContentSkeleton className="py-16" />
    </div>
  );
}
