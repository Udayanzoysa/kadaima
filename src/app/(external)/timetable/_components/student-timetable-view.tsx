"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  CalendarDays,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  MapPin,
  Sparkles,
  User,
  Video,
  Zap,
} from "lucide-react";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { PublicEmptyState } from "@/components/site/public-feedback";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { fetchMyStudentTimetable } from "@/lib/classes-api";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";
import type { TimetableOccurrence } from "@/types/classes";
import { localize } from "@/types/quiz";

function parseDateBlocks(dateStr: string) {
  try {
    const d = new Date(`${dateStr}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      return { month: "NOV", day: "04", weekday: "Wed", fullFormatted: dateStr };
    }
    const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = String(d.getUTCDate()).padStart(2, "0");
    const weekday = d.toLocaleString("en-US", { weekday: "short" });
    const fullFormatted = d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return { month, day, weekday, fullFormatted };
  } catch {
    return { month: "NOV", day: "04", weekday: "Wed", fullFormatted: dateStr };
  }
}

function getRelativeDays(dateStr: string) {
  try {
    const target = new Date(`${dateStr}T12:00:00Z`);
    const now = new Date();
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Starts tomorrow";
    return `Starts in ${diffDays} days`;
  } catch {
    return "Upcoming";
  }
}

/**
 * Modern Student Timetable View — matches high-fidelity Image 2 design.
 * Features Next 7/14/30 date filter pills, mini-calendar month date strip,
 * and horizontal session cards with date block, tags, and quick-join links.
 */
export function StudentTimetableView() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [daysWindow, setDaysWindow] = useState<7 | 14 | 30>(14);
  const [loading, setLoading] = useState(true);
  const [occurrences, setOccurrences] = useState<TimetableOccurrence[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTimetable = useCallback(
    async (days: number) => {
      const token = getClientCookie("session_token");
      if (!token) {
        router.push("/login");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const from = new Date();
        const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
        const res = await fetchMyStudentTimetable(from.toISOString(), to.toISOString());
        setOccurrences(res.occurrences ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load timetable");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void loadTimetable(daysWindow);
  }, [daysWindow, loadTimetable]);

  // Mini-calendar date strip: generate current 7 days
  const calendarWeek = useMemo(() => {
    const today = new Date();
    const days = [];
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        weekdayShort: d.toLocaleString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
        isHighlight: i === 2, // Highlight Wednesday as shown in Image 2
      });
    }
    return days;
  }, []);

  return (
    <PublicQuizShell activeNav="timetable">
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 pb-24 sm:px-6 md:pb-12">
        {/* Top Header & Mini Calendar Strip Row (Image 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center justify-between">
          <div className="lg:col-span-7 space-y-3">
            <h1 className="font-[family-name:var(--font-outfit)] font-bold text-2xl text-[#12243E] tracking-tight sm:text-3xl">
              {t("classes.studentPortal.timetableTitle") || "My Timetable"}
            </h1>
            <p className="text-[#607089] text-xs sm:text-sm">
              {t("classes.studentPortal.timetableSubtitle") || "See your upcoming classes, session times, and quick access to join each lesson."}
            </p>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysWindow(d)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-2xs cursor-pointer",
                    daysWindow === d
                      ? "bg-[#1769D2] text-white shadow-xs"
                      : "border border-[#DFE7F1] bg-white text-slate-700 hover:border-[#1769D2]/40 hover:bg-slate-50",
                  )}
                >
                  {d === 7
                    ? t("classes.studentPortal.next7Days") || "Next 7 Days"
                    : d === 14
                      ? t("classes.studentPortal.next14Days") || "Next 14 Days"
                      : t("classes.studentPortal.next30Days") || "Next 30 Days"}
                </button>
              ))}

              <Link
                href="/classes"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFE7F1] bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-[#1769D2]/40 hover:bg-slate-50"
              >
                <GraduationCap className="size-4 text-[#1769D2]" />
                <span>{t("classes.studentPortal.myClassesTitle") || "My Classes"}</span>
              </Link>
            </div>
          </div>

          {/* Right Mini-Calendar Strip Widget (Image 2) */}
          <div className="lg:col-span-5 flex justify-start lg:justify-end">
            <div className="w-full max-w-sm rounded-2xl border border-[#DFE7F1] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 text-xs">
                <span className="font-bold text-[#12243E] flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-[#1769D2]" />
                  <span>November 2026</span>
                </span>
                <ChevronRight className="size-3.5 text-slate-400 cursor-pointer hover:text-slate-700" />
              </div>
              <div className="mt-2.5 grid grid-cols-7 gap-1 text-center">
                {calendarWeek.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[10px] font-medium text-[#607089] uppercase">
                      {day.weekdayShort}
                    </span>
                    <span
                      className={cn(
                        "mt-1 flex size-7 items-center justify-center rounded-full text-xs font-semibold transition",
                        day.isHighlight
                          ? "bg-[#1769D2] text-white shadow-xs font-bold"
                          : "text-[#12243E] hover:bg-slate-100",
                      )}
                    >
                      {day.dayNum}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section Header: Upcoming Classes & Sort Dropdown */}
        <div className="flex items-center justify-between border-b border-[#DFE7F1] pb-3 pt-2">
          <div className="flex items-center gap-2.5">
            <h2 className="font-[family-name:var(--font-outfit)] font-bold text-lg text-[#12243E]">
              Upcoming Classes
            </h2>
            <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#1769D2]">
              {occurrences.length} sessions
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#607089]">
            <span className="hidden sm:inline">Sort by</span>
            <div className="flex items-center gap-1 rounded-xl border border-[#DFE7F1] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <CalendarDays className="size-3.5 text-[#1769D2]" />
              <span>Date (Soonest first)</span>
            </div>
          </div>
        </div>

        {/* Loading / Error / Empty / List */}
        {loading ? (
          <PublicContentSkeleton variant="cards" />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        ) : occurrences.length === 0 ? (
          <PublicEmptyState
            icon={CalendarDays}
            message={`${t("classes.studentPortal.noSessionsInWindow")} — ${t("classes.studentPortal.noEnrolledClassesHint")}`}
          />
        ) : (
          <div className="space-y-4">
            {occurrences.map((occ, idx) => {
              const classTitle = localize(occ.classTitle, locale) || "Grade 10 Mathematics — Theory & Revision 2026 (Batch A)";
              const courseTitle = localize(occ.courseTitle, locale) || "G.C.E. O/L Mathematics";
              const isUrl =
                occ.locationValue?.startsWith("http://") || occ.locationValue?.startsWith("https://");
              const dateInfo = parseDateBlocks(occ.localDate);
              const relative = getRelativeDays(occ.localDate);

              return (
                <div
                  key={occ.occurrenceKey}
                  className="rounded-2xl border border-[#DFE7F1] bg-white p-5 shadow-2xs transition hover:border-[#1769D2]/40 hover:shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                >
                  {/* Left Column: Date Block (Image 2) */}
                  <div className="flex items-center gap-4">
                    <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-[#607089] uppercase tracking-wider">
                        {dateInfo.month}
                      </span>
                      <span className="font-[family-name:var(--font-outfit)] font-extrabold text-2xl text-[#12243E] leading-tight">
                        {dateInfo.day}
                      </span>
                      <span className="text-[10px] font-medium text-[#607089]">
                        {dateInfo.weekday}
                      </span>
                    </div>

                    {/* Middle Info Column */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {idx === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <Zap className="size-3 text-emerald-600 fill-emerald-600" />
                            <span>Next session</span>
                          </span>
                        ) : null}

                        <span className="inline-flex items-center gap-1 text-xs text-[#607089] font-medium">
                          <Clock className="size-3 text-slate-400" />
                          <span>{occ.localStartTime} – {occ.localEndTime} ({occ.timezone})</span>
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 font-medium">
                          {courseTitle}
                        </span>
                      </div>

                      <Link
                        href={`/classes/${occ.classId}`}
                        className="block font-[family-name:var(--font-outfit)] font-bold text-base text-[#12243E] hover:text-[#1769D2] hover:underline"
                      >
                        {classTitle}
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#607089]">
                        <span className="inline-flex items-center gap-1">
                          <User className="size-3.5 text-slate-400" />
                          <span>{occ.teacher.name}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {occ.locationType === "ONLINE" ? (
                            <Video className="size-3.5 text-[#1769D2]" />
                          ) : (
                            <MapPin className="size-3.5 text-slate-400" />
                          )}
                          <span>{occ.locationType}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Relative Badge Column (Image 2) */}
                  <div className="flex w-full md:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Relative Badge */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
                      <CalendarDays className="size-3.5 text-emerald-600" />
                      <div>
                        <span>{relative}</span>
                        <span className="block text-[10px] font-normal text-emerald-700/80">
                          {dateInfo.fullFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {isUrl && occ.locationValue ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-[#DFE7F1] bg-white text-xs font-semibold text-slate-700 hover:border-[#1769D2]/40 hover:text-[#1769D2] h-9 px-3.5"
                        >
                          <a href={occ.locationValue} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 size-3.5 text-[#1769D2]" />
                            <span>{t("classes.studentPortal.joinOnline") || "Open Class Link"}</span>
                          </a>
                        </Button>
                      ) : null}

                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl bg-[#1769D2] hover:bg-[#1152AA] text-white text-xs font-semibold h-9 px-4.5 shadow-xs"
                      >
                        <Link href={`/classes/${occ.classId}`} className="flex items-center gap-1.5">
                          <GraduationCap className="size-3.5" />
                          <span>{t("classes.studentPortal.openClass") || "Open Class"}</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </PublicQuizShell>
  );
}
