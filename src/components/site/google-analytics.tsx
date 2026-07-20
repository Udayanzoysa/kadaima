"use client";

import { useEffect, useState } from "react";

import Script from "next/script";

/**
 * Injects GA4 after the browser is idle so gtag does not inflate Total Blocking Time.
 */
export function GoogleAnalytics({ measurementId }: { measurementId?: string | null }) {
  const id = measurementId?.trim();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return;

    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => setReady(true), { timeout: 4000 });
    } else {
      timer = setTimeout(() => setReady(true), 2000);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [id]);

  if (!ready || !id || !/^G-[A-Z0-9]+$/i.test(id)) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="lazyOnload" />
      <Script id="gtag-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  );
}
