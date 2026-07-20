import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";

/** Match results page chrome so navigation doesn’t flash bare content. */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#f4f7fb]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 md:h-16 md:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo className="h-8 w-auto md:h-9" priority />
          </Link>
        </div>
      </header>
      <PublicContentSkeleton variant="detail" className="py-10" />
    </div>
  );
}
