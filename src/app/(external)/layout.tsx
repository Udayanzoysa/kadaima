import type { ReactNode } from "react";

import { I18nProvider } from "@/hooks/use-i18n";

/** Shared i18n for home, profile, payments, contact, and legal pages (including loading.tsx). */
export default function ExternalLayout({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
