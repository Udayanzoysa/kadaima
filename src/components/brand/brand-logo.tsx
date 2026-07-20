import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
};

/** Server-safe brand mark — no client JS required. */
export function BrandLogo({ variant = "full", className, priority }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/brand/kadaima-mark.png"
        alt="Kadaima"
        width={283}
        height={290}
        sizes="32px"
        className={cn("size-8 object-contain", className)}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src="/brand/kadaima-logo.png"
      alt="Kadaima"
      width={966}
      height={290}
      sizes="(max-width: 768px) 120px, 150px"
      className={cn("h-8 w-auto object-contain", className)}
      priority={priority}
    />
  );
}
