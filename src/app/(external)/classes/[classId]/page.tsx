import { use } from "react";

import { StudentClassDetail } from "./_components/student-class-detail";

export default function StudentClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  return <StudentClassDetail classId={classId} />;
}

