/**
 * Canonical Kadaima public-site palette.
 * Source of truth: home hero (`PublicHomeHero`) + shell CTAs.
 */
export const PUBLIC_BRAND = {
  pageBg: "#f4f7fb",
  /** Primary actions, links, active nav — WCAG-friendly on white. */
  brand: "#1563b8",
  brandHover: "#114f94",
  /** Bright end of hero gradient / highlights. */
  brandBright: "#3b9eff",
  soft: "#eef6ff",
  softBorder: "#bcd8ff",
  softDeep: "#dcebff",
  ink: "#123a6b",
  gradientFrom: "#0b2a4a",
  gradientVia: "#1a4a7a",
  gradientTo: "#3b9eff",
} as const;

/** Navy → sky banner used on home, catalog CTA, and quiz detail. */
export const PUBLIC_HERO_GRADIENT_CLASS =
  "bg-gradient-to-r from-[#0b2a4a] via-[#1a4a7a] to-[#3b9eff] shadow-[0_20px_50px_-24px_rgba(11,42,74,0.55)]";

export const PUBLIC_HERO_GLOW_CLASS =
  "pointer-events-none absolute bottom-0 right-0 hidden h-full w-1/2 bg-[radial-gradient(ellipse_at_80%_50%,_rgba(255,255,255,0.16),_transparent_55%)] md:block";
