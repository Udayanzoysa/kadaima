import type { ReactNode } from "react";
import { I18nProvider } from "@/hooks/use-i18n";

/** Shared i18n for public teacher landing pages /t/[slug] */
export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
