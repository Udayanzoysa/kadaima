import { ModuleForm } from "../../_components/module-form";

interface EditModulePageProps {
  params: Promise<{ id: string; moduleId: string }>;
}

export default async function EditModulePage({ params }: EditModulePageProps) {
  const { id, moduleId } = await params;
  return <ModuleForm courseId={id} moduleId={moduleId} />;
}
