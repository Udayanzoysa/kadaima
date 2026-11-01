"use client";

import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import type { HomepageLocalized } from "@/lib/public-quizzes";
import { cn } from "@/lib/utils";

function pickLocalized(value: HomepageLocalized | null | undefined, locale: string): string {
  if (!value) return "";
  const loc = locale === "si" || locale === "ta" ? locale : "en";
  return (value[loc] || value.en || value.si || value.ta || "").trim();
}

export function PublicHomePromo({
  promo,
}: {
  promo: {
    enabled: boolean;
    badge: HomepageLocalized;
    title: HomepageLocalized;
    description: HomepageLocalized;
    ctaLabel: HomepageLocalized;
    ctaHref: string;
  };
}) {
  const { locale } = useI18n();
  if (!promo.enabled) return null;

  const badge = pickLocalized(promo.badge, locale);
  const title = pickLocalized(promo.title, locale);
  const description = pickLocalized(promo.description, locale);
  const ctaLabel = pickLocalized(promo.ctaLabel, locale);
  const href = promo.ctaHref?.trim() || "/partner";

  if (!title && !description) return null;

  return (
    <section
      className={cn(
        "mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#eef6ff] via-white to-[#f8fafc] p-5 shadow-sm sm:rounded-3xl sm:p-7",
      )}
    >
      {badge ? (
        <span className="inline-flex rounded-full bg-[#1563b8]/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#1563b8] ring-1 ring-[#1563b8]/15">
          {badge}
        </span>
      ) : null}
      {title ? (
        <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h2>
      ) : null}
      {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p> : null}
      {ctaLabel ? (
        <Link
          href={href}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#1563b8] px-5 text-sm font-semibold text-white transition hover:bg-[#114f94]"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </section>
  );
}
