import { I18nProvider } from "@/hooks/use-i18n";

import { InProgressList } from "./_components/in-progress-list";

export default function InProgressPage() {
  return (
    <I18nProvider>
      <InProgressList />
    </I18nProvider>
  );
}
