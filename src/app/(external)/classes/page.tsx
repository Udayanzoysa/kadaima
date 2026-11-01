import { Suspense } from "react";
import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

import { StudentClassesView } from "./_components/student-classes-view";

export const metadata: Metadata = buildPageMetadata({
  title: "My Classes",
  description: "View your enrolled classes, teachers, and upcoming schedule.",
  path: "/classes",
  noIndex: true,
});

export default function StudentClassesPage() {
  return (
    <Suspense fallback={null}>
      <StudentClassesView />
    </Suspense>
  );
}

