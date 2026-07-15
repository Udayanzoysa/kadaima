import { ModuleForm } from "../_components/module-form";

interface NewModulePageProps {
  params: Promise<{ id: string }>;
}

export default async function NewModulePage({ params }: NewModulePageProps) {
  const { id } = await params;
  return <ModuleForm courseId={id} />;
}
