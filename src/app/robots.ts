import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const host = (() => {
    try {
      return new URL(siteUrl).host;
    } catch {
      return undefined;
    }
  })();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/auth",
          "/api",
          "/profile",
          "/quiz/in-progress",
          "/quiz/my-attempts",
          "/payments/payhere",
          "/results/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    ...(host ? { host } : {}),
  };
}
