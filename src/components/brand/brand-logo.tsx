"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ variant = "full", className, priority }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/brand/kadaima-mark.png"
        alt="Kadaima"
        width={40}
        height={40}
        className={cn("size-8 object-contain", className)}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src="/brand/kadaima-logo.png"
      alt="Kadaima"
      width={160}
      height={40}
      className={cn("h-8 w-auto object-contain", className)}
      priority={priority}
    />
  );
}
