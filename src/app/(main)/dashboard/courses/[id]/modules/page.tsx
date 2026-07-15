import { ManageModulesList } from "./_components/manage-modules-list";

interface CourseModulesPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseModulesPage({ params }: CourseModulesPageProps) {
  const { id } = await params;
  return <ManageModulesList courseId={id} />;
}
