import type { ReactNode } from "react";

import type { Metadata, Viewport } from "next";

import { DeferredAppChrome } from "@/components/site/deferred-app-chrome";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { APP_CONFIG } from "@/config/app-config";
import { coreFontVars } from "@/lib/fonts/core";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { DEFAULT_SITE_SEO, getSiteSeo } from "@/lib/site-seo";
import { getSiteUrl } from "@/lib/site-url";
import { ThemeBootScript } from "@/scripts/theme-boot";

import "./globals.css";

const apiOrigin = (() => {
  try {
    return new URL(APP_CONFIG.apiUrl).origin;
  } catch {
    return null;
  }
})();

/** Mobile-friendly viewport — width, scale, and notch/safe-area support. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b2a4a" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();
  const title = seo.metaTitle?.trim() || DEFAULT_SITE_SEO.metaTitle;
  const description = seo.metaDescription?.trim() || DEFAULT_SITE_SEO.metaDescription;
  const siteUrl = getSiteUrl();
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${seo.siteName || APP_CONFIG.name}`,
    },
    description,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...(googleVerification
      ? { verification: { google: googleVerification } }
      : {}),
    icons: {
      icon: [
        { url: "/favicon.ico?v=3", sizes: "any" },
        { url: "/favicon.png?v=3", type: "image/png", sizes: "32x32" },
        { url: "/brand/kadaima-mark.png?v=3", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png?v=3", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      siteName: seo.siteName || APP_CONFIG.name,
      type: "website",
      url: siteUrl,
      locale: "en_LK",
      ...(seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
    twitter: {
      card: seo.ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(seo.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  const seo = await getSiteSeo();

  return (
    <html
      lang="en"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        {apiOrigin ? (
          <>
            <link rel="dns-prefetch" href={apiOrigin} />
            <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
          </>
        ) : null}
        {seo.googleAnalyticsId ? (
          <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        ) : null}
        {/* Linked here (not via metadata) so it stays out of the LCP critical chain. */}
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${coreFontVars} min-h-screen overflow-x-hidden antialiased`}>
        {/* beforeInteractive — admin theme flash prevention; public keeps light defaults */}
        <ThemeBootScript />
        <GoogleAnalytics measurementId={seo.googleAnalyticsId} />
        {children}
        <DeferredAppChrome />
      </body>
    </html>
  );
}
