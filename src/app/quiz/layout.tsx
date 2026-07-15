import type { ReactNode } from "react";

import { I18nProvider } from "@/hooks/use-i18n";

export default function QuizLayout({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
