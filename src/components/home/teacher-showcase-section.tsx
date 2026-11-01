"use client";

import Link from "next/link";
import { ArrowRight, Award, BarChart3, ShieldCheck, UserPlus, Users } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import type { FeaturedTeacher } from "@/types/featured-teacher";

import { TeacherCarousel } from "./teacher-carousel";

export function TeacherShowcaseSection({
  teachers,
}: {
  teachers: FeaturedTeacher[];
}) {
  const { t } = useI18n();

  return (
    <section
      aria-labelledby="teacher-showcase-heading"
      className="relative mb-6 overflow-hidden rounded-3xl border border-[#D8E6F8] bg-linear-to-r from-[#EBF3FE] via-[#F2F7FF] to-[#E3EFFF] p-5 shadow-xs sm:mb-8 sm:p-8 md:p-10"
    >
      {/* Decorative soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-64 rounded-full bg-[#1769D2]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 -left-10 size-48 rounded-full bg-blue-300/15 blur-2xl"
      />

      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-12">
        {/* Left Column: CTA & Benefits (~40%) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1 text-[11px] font-bold tracking-wide text-[#1769D2] shadow-2xs ring-1 ring-[#1769D2]/20 backdrop-blur-xs">
            <Users className="size-3 text-[#1769D2]" />
            <span>{t("teachersSection.badge") || "For Teachers"}</span>
          </div>

          <h2
            id="teacher-showcase-heading"
            className="font-[family-name:var(--font-outfit)] font-extrabold text-2xl leading-[1.2] text-[#12243E] sm:text-3xl lg:text-[2rem]"
          >
            {t("teachersSection.title") ? (
              t("teachersSection.title").includes("Expand Your Teaching") ? (
                <>
                  {t("teachersSection.title").split("Expand Your Teaching")[0]}
                  <span className="text-[#1769D2]">Expand Your Teaching</span>
                  {t("teachersSection.title").split("Expand Your Teaching")[1]}
                </>
              ) : (
                t("teachersSection.title")
              )
            ) : (
              <>
                Join with Us &amp; <span className="text-[#1769D2]">Expand Your Teaching</span>
              </>
            )}
          </h2>

          <p className="max-w-md text-sm leading-relaxed text-[#5A6D88]">
            {t("teachersSection.subtitle") ||
              "Share your knowledge, reach more students across Sri Lanka, and grow your teaching journey with Kadaima."}
          </p>

          {/* 3 Value Pillars / Benefits */}
          <div className="grid grid-cols-3 gap-2 py-2 text-center sm:gap-3">
            <div className="flex flex-col items-center">
              <div className="mb-1.5 flex size-9 items-center justify-center rounded-xl bg-white/85 text-[#1769D2] shadow-2xs ring-1 ring-[#1769D2]/15">
                <Users className="size-4.5" />
              </div>
              <span className="font-semibold text-[11px] text-[#12243E] leading-tight sm:text-xs">
                {t("teachersSection.benefit1") || "Wider Student Reach"}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-1.5 flex size-9 items-center justify-center rounded-xl bg-white/85 text-[#1769D2] shadow-2xs ring-1 ring-[#1769D2]/15">
                <BarChart3 className="size-4.5" />
              </div>
              <span className="font-semibold text-[11px] text-[#12243E] leading-tight sm:text-xs">
                {t("teachersSection.benefit2") || "Teaching Growth"}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-1.5 flex size-9 items-center justify-center rounded-xl bg-white/85 text-[#1769D2] shadow-2xs ring-1 ring-[#1769D2]/15">
                <ShieldCheck className="size-4.5" />
              </div>
              <span className="font-semibold text-[11px] text-[#12243E] leading-tight sm:text-xs">
                {t("teachersSection.benefit3") || "Trusted Platform"}
              </span>
            </div>
          </div>

          {/* Primary Join Button */}
          <div className="pt-1">
            <Link
              href="/teacher/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 py-3 font-semibold text-sm text-white shadow-md transition hover:bg-[#1152AA] hover:shadow-lg active:scale-98 sm:w-auto"
            >
              <UserPlus className="size-4 shrink-0" />
              <span>{t("teachersSection.joinCta") || "Join as a Teacher"}</span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Right Column: Featured Teachers Carousel (~60%) */}
        <div className="min-w-0 lg:col-span-7">
          <TeacherCarousel teachers={teachers} />
        </div>
      </div>
    </section>
  );
}

