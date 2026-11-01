"use client";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/hooks/use-i18n";

export function DashboardLanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return <LanguageSwitcher value={locale} onChange={setLocale} />;
}

