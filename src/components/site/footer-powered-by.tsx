import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

const TECHWING_FACEBOOK = "https://web.facebook.com/techwingLK";

export function FooterPoweredBy({
  labelBefore = "Powered by",
  labelAfter = "Techwing Solutions",
  className,
}: {
  labelBefore?: string;
  labelAfter?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-slate-600",
        className,
      )}
    >
      <span>{labelBefore}</span>
      <Heart className="size-3.5 fill-rose-500 text-rose-500" aria-hidden />
      <a
        href={TECHWING_FACEBOOK}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md px-1 py-0.5 font-semibold text-slate-700 underline-offset-2 transition hover:bg-[#eef6ff] hover:text-[#1563b8] hover:underline"
      >
        {labelAfter}
      </a>
    </p>
  );
}
