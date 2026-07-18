import Script from "next/script";

/** Injects GA4 gtag.js when a measurement ID is configured. */
export function GoogleAnalytics({ measurementId }: { measurementId?: string | null }) {
  const id = measurementId?.trim();
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="lazyOnload"
      />
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
