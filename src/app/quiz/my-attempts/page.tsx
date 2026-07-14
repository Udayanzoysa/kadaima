import { I18nProvider } from "@/hooks/use-i18n";

import { MyAttemptsList } from "./_components/my-attempts-list";

export default function MyAttemptsPage() {
  return (
    <I18nProvider>
      <MyAttemptsList />
    </I18nProvider>
  );
}
