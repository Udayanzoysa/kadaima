import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

/**
 * Admin / auth / app chrome — preference store + tooltips stay off the public marketing bundle.
 */
export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, font } = PREFERENCE_DEFAULTS;

  return (
    <TooltipProvider>
      <PreferencesStoreProvider
        themeMode={theme_mode}
        themePreset={theme_preset}
        contentLayout={content_layout}
        navbarStyle={navbar_style}
        font={font}
      >
        {children}
      </PreferencesStoreProvider>
    </TooltipProvider>
  );
}
