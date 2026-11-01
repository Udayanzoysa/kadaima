"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, FlaskConical, GraduationCap, Star, Users } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import type { FeaturedTeacher } from "@/types/featured-teacher";

function subjectBadgeStyle(subject?: string | null) {
  const s = (subject || "").toLowerCase();
  if (s.includes("science")) {
    return {
      icon: FlaskConical,
      badgeClass: "bg-white/95 text-purple-600 ring-1 ring-purple-500/25",
      iconClass: "text-purple-600",
    };
  }
  if (s.includes("english")) {
    return {
      icon: BookOpen,
      badgeClass: "bg-white/95 text-teal-600 ring-1 ring-teal-500/25",
      iconClass: "text-teal-600",
    };
  }
  // Default: Mathematics / General
  return {
    icon: BookOpen,
    badgeClass: "bg-white/95 text-[#1769D2] ring-1 ring-[#1769D2]/25",
    iconClass: "text-[#1769D2]",
  };
}

export function TeacherCard({
  teacher,
  className,
}: {
  teacher: FeaturedTeacher;
  className?: string;
}) {
  const { t } = useI18n();
  const [imgError, setImgError] = useState(false);

  const badgeInfo = subjectBadgeStyle(teacher.subject);
  const SubjectIcon = badgeInfo.icon;
  const initial = teacher.name.charAt(0).toUpperCase();

  const formattedStudents = teacher.studentsCount
    ? teacher.studentsCount.toLocaleString()
    : null;
  const formattedReviews = teacher.reviewCount
    ? teacher.reviewCount.toLocaleString()
    : null;

  return (
    <Link
      href={`/t/${encodeURIComponent(teacher.slug)}`}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1769D2]/40 hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/50",
        className,
      )}
      aria-label={`${teacher.name} — ${teacher.designation || teacher.subject || "Teacher"}`}
    >
      <div>
        {/* Top Portrait Banner (4:3 aspect ratio) with Subject Badge */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-linear-to-tr from-slate-100 via-blue-50 to-slate-200">
          {teacher.photoUrl && !imgError ? (
            <Image
              src={teacher.photoUrl}
              alt={teacher.name}
              fill
              sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 280px"
              className="object-cover object-top transition duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center bg-linear-to-br from-[#EBF3FE] to-[#DCEAF8] text-[#1769D2]">
              <span className="flex size-14 items-center justify-center rounded-full bg-white/80 font-bold text-xl shadow-xs ring-1 ring-[#1769D2]/20">
                {initial}
              </span>
              <span className="mt-1 text-[11px] font-medium text-slate-500">
                {teacher.subject || "Educator"}
              </span>
            </div>
          )}

          {/* Subject Badge overlay on top-right */}
          {teacher.subject ? (
            <div
              className={cn(
                "absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs backdrop-blur-xs",
                badgeInfo.badgeClass,
              )}
            >
              <SubjectIcon className={cn("size-3", badgeInfo.iconClass)} />
              <span>{teacher.subject}</span>
            </div>
          ) : null}
        </div>

        {/* Teacher Details */}
        <div className="mt-3">
          <h3 className="truncate font-bold text-base text-[#12243E] transition-colors group-hover:text-[#1769D2]">
            {teacher.name}
          </h3>
          <p className="line-clamp-1 text-xs text-slate-500">
            {teacher.qualification || teacher.designation || teacher.subject}
          </p>

          {/* Highlights & Metrics */}
          <div className="mt-2.5 space-y-1 text-xs text-slate-600">
            {teacher.experienceYears ? (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="size-3.5 shrink-0 text-[#1769D2]" />
                <span>
                  {t("teachersSection.yearsTeaching")
                    ? t("teachersSection.yearsTeaching").replace("{years}", String(teacher.experienceYears))
                    : `${teacher.experienceYears}+ Years Teaching`}
                </span>
              </div>
            ) : null}

            {formattedStudents ? (
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 shrink-0 text-[#1769D2]" />
                <span>
                  {t("teachersSection.studentsCount")
                    ? t("teachersSection.studentsCount").replace("{count}", formattedStudents)
                    : `${formattedStudents}+ Students`}
                </span>
              </div>
            ) : null}

            {teacher.rating ? (
              <div className="flex items-center gap-1 font-semibold text-slate-800">
                <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                <span>{teacher.rating.toFixed(1)}</span>
                {formattedReviews ? (
                  <span className="font-normal text-slate-500">
                    {t("teachersSection.reviewsCount")
                      ? t("teachersSection.reviewsCount").replace("{count}", formattedReviews)
                      : `(${formattedReviews} Reviews)`}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

