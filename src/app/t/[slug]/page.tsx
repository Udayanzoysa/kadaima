import { I18nProvider } from "@/hooks/use-i18n";

import { TeacherLandingPage } from "./_components/teacher-landing-page";

interface TeacherPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeacherPublicPage({ params }: TeacherPageProps) {
  const { slug } = await params;
  return (
    <I18nProvider>
      <TeacherLandingPage slug={slug} />
    </I18nProvider>
  );
}
