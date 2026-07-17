"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { KadaimaLoader } from "@/components/site/kadaima-loader";
import { getTranslation, type Locale } from "@/lib/i18n";
import { useGlobalLoaderStore } from "@/stores/global-loader-store";

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

function loadingLabel(fallback = "Kadaima is loading…") {
  const translated = getTranslation(readLocale(), "public.loadingSite");
  return translated === "public.loadingSite" ? fallback : translated;
}

/**
 * Full-site Kadaima loader:
 * - First paint / hard refresh until the page is ready
 * - Client-side navigations (all routes)
 * - Imperative tasks via showGlobalLoader / withGlobalLoader (login, uploads, fetches)
 */
export function GlobalSiteLoader() {
  const pathname = usePathname();
  const count = useGlobalLoaderStore((s) => s.count);
  const storeLabel = useGlobalLoaderStore((s) => s.label);
  const [navigating, setNavigating] = useState(false);
  const [booting, setBooting] = useState(true);
  const navShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navSafetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNavTimers = () => {
    if (navShowTimer.current) clearTimeout(navShowTimer.current);
    if (navSafetyTimer.current) clearTimeout(navSafetyTimer.current);
    navShowTimer.current = null;
    navSafetyTimer.current = null;
  };

  const hideNav = () => {
    clearNavTimers();
    setNavigating(false);
  };

  const showNav = () => {
    clearNavTimers();
    navShowTimer.current = setTimeout(() => {
      setNavigating(true);
      navSafetyTimer.current = setTimeout(hideNav, 12_000);
    }, 120);
  };

  // Initial hard-load splash until the document finishes loading
  useEffect(() => {
    const finishBoot = () => setBooting(false);

    if (document.readyState === "complete") {
      const t = window.setTimeout(finishBoot, 320);
      return () => window.clearTimeout(t);
    }

    const onLoad = () => finishBoot();
    window.addEventListener("load", onLoad);
    const safety = window.setTimeout(finishBoot, 8_000);

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(safety);
    };
  }, []);

  // Hide navigation overlay when the route settles
  useEffect(() => {
    hideNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle on pathname only
  }, [pathname]);

  // Intercept same-origin link clicks site-wide
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

      const samePath =
        url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePath) return;

      showNav();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearNavTimers();
    };
  }, [pathname]);

  const visible = booting || navigating || count > 0;
  if (!visible) return null;

  const label = count > 0 ? storeLabel : loadingLabel();

  return <KadaimaLoader variant="overlay" label={label} />;
}
