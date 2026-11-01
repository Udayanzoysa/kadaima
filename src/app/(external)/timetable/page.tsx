import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { StudentTimetableView } from "./_components/student-timetable-view";

export const metadata: Metadata = buildPageMetadata({
  title: "My Class Timetable",
  description: "View upcoming class sessions across your enrolled classes.",
  path: "/timetable",
  noIndex: true,
});

export default function StudentTimetablePage() {
  return <StudentTimetableView />;
}

