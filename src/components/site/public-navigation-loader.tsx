"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { KadaimaLoader } from "@/components/site/kadaima-loader";
import { getTranslation, type Locale } from "@/lib/i18n";
import { isPublicSitePath } from "@/lib/public-site";

const LOCALE_STORAGE_KEY = "kadaima_locale";

function readLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "si" || stored === "ta") return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

/**
 * Shows the branded Kadaima loader during client-side navigations on the public site.
 */
export function PublicNavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("Kadaima is loading…");
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    showTimer.current = null;
    safetyTimer.current = null;
  };

  const hide = () => {
    clearTimers();
    setVisible(false);
  };

  const show = () => {
    clearTimers();
    setLabel(getTranslation(readLocale(), "public.loadingSite"));
    // Avoid flash on instant cached navigations
    showTimer.current = setTimeout(() => {
      setVisible(true);
      safetyTimer.current = setTimeout(hide, 12_000);
    }, 140);
  };

  useEffect(() => {
    hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hide when route settles
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (!isPublicSitePath(url.pathname)) return;
      if (!isPublicSitePath(window.location.pathname)) return;

      const samePath =
        url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePath) return;

      show();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebind when path changes for same-path checks
  }, [pathname]);

  if (!visible || !isPublicSitePath(pathname)) return null;

  return <KadaimaLoader variant="overlay" label={label} />;
}
