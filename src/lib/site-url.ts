const PRODUCTION_SITE = "https://www.kadaima.com";

function toOrigin(value: string): string | null {
  try {
    const withProtocol = value.startsWith("http") ? value : `https://${value}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

/**
 * Canonical public site origin (no trailing slash).
 * Must be the real domain for sitemap/robots/OG — never a Vercel preview host on production.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    const origin = toOrigin(fromEnv);
    if (origin) return origin;
  }

  // Custom domain configured on the Vercel project (preferred over *.vercel.app)
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    const origin = toOrigin(productionHost);
    if (origin) return origin;
  }

  // Production deploys must never advertise the unique deployment URL in sitemaps.
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_SITE;
  }

  // Preview / local only
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const origin = toOrigin(vercel);
    if (origin) return origin;
  }

  return PRODUCTION_SITE;
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
