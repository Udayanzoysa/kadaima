import { use } from "react";

import { ClassBatchForm } from "../../_components/class-batch-form";

export default function EditClassBatchPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  return <ClassBatchForm classId={classId} />;
}

