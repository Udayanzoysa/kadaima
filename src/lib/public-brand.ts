/**
 * Canonical Kadaima public-site palette.
 * Aligned with Master Plan tokens & high-fidelity design specs:
 * Brand blue: #1769D2 (hover: #1152AA)
 * Background: #F6F9FD, Surface: #FFFFFF, Border: #DFE7F1
 * Dark text: #12243E, Secondary text: #607089
 * Success: #13845A, Warning: #A45B00, Error: #BE2344
 */
export const PUBLIC_BRAND = {
  pageBg: "#F6F9FD",
  /** Primary interactive actions, links, active nav — #1769D2 */
  brand: "#1769D2",
  brandHover: "#1152AA",
  /** Bright accent highlights */
  brandBright: "#3b9eff",
  soft: "#EEF4FC",
  softBorder: "#DFE7F1",
  softDeep: "#D5E4F7",
  textPrimary: "#12243E",
  textSecondary: "#607089",
  success: "#13845A",
  warning: "#A45B00",
  error: "#BE2344",
  ink: "#12243E",
  gradientFrom: "#0b2a4a",
  gradientVia: "#1a4a7a",
  gradientTo: "#3b9eff",
} as const;

/** Navy → sky banner used on home, catalog CTA, and quiz detail. */
export const PUBLIC_HERO_GRADIENT_CLASS =
  "bg-gradient-to-r from-[#0b2a4a] via-[#1a4a7a] to-[#3b9eff] shadow-[0_20px_50px_-24px_rgba(11,42,74,0.55)]";

export const PUBLIC_HERO_GLOW_CLASS =
  "pointer-events-none absolute bottom-0 right-0 hidden h-full w-1/2 bg-[radial-gradient(ellipse_at_80%_50%,_rgba(255,255,255,0.16),_transparent_55%)] md:block";

