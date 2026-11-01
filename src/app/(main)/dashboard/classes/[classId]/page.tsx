import { use } from "react";

import { ClassDetailView } from "../_components/class-detail-view";

export default function ClassBatchDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  return <ClassDetailView classId={classId} />;
}

