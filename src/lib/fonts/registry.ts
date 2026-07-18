import {
  DM_Sans,
  Figtree,
  Inter,
  JetBrains_Mono,
  Lora,
  Merriweather,
  Noto_Sans,
  Noto_Serif,
  Nunito_Sans,
  Playfair_Display,
  Public_Sans,
  Raleway,
  Roboto,
  Roboto_Slab,
} from "next/font/google";

import { GeistPixelSquare } from "geist/font/pixel";

import { geist, geistMono, outfit } from "./core";
import type { FontKey } from "./keys";

export type { FontKey } from "./keys";
export { FONT_KEYS } from "./keys";
export { coreFontVars } from "./core";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
  preload: false,
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
  preload: false,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
  preload: false,
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  preload: false,
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
  preload: false,
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
  preload: false,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-noto-serif",
  display: "swap",
  preload: false,
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
  display: "swap",
  preload: false,
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
  preload: false,
});

export const fontRegistry = {
  geist: {
    label: "Geist",
    font: geist,
  },
  inter: {
    label: "Inter",
    font: inter,
  },
  notoSans: {
    label: "Noto Sans",
    font: notoSans,
  },
  nunitoSans: {
    label: "Nunito Sans",
    font: nunitoSans,
  },
  figtree: {
    label: "Figtree",
    font: figtree,
  },
  roboto: {
    label: "Roboto",
    font: roboto,
  },
  raleway: {
    label: "Raleway",
    font: raleway,
  },
  dmSans: {
    label: "DM Sans",
    font: dmSans,
  },
  publicSans: {
    label: "Public Sans",
    font: publicSans,
  },
  outfit: {
    label: "Outfit",
    font: outfit,
  },
  geistMono: {
    label: "Geist Mono",
    font: geistMono,
  },
  geistPixelSquare: {
    label: "Geist Pixel Square",
    font: GeistPixelSquare,
  },
  jetBrainsMono: {
    label: "JetBrains Mono",
    font: jetBrainsMono,
  },
  notoSerif: {
    label: "Noto Serif",
    font: notoSerif,
  },
  robotoSlab: {
    label: "Roboto Slab",
    font: robotoSlab,
  },
  merriweather: {
    label: "Merriweather",
    font: merriweather,
  },
  lora: {
    label: "Lora",
    font: lora,
  },
  playfairDisplay: {
    label: "Playfair Display",
    font: playfairDisplay,
  },
} as const satisfies Record<FontKey, { label: string; font: { variable: string } }>;

/** Fonts loaded on every page (public LCP-critical set). */
const CORE_FONT_KEYS = ["geist", "geistMono", "outfit"] as const satisfies readonly FontKey[];

/** Extra admin theme fonts — loaded only under dashboard to cut public CSS/font cost. */
export const adminFontVars = (
  Object.entries(fontRegistry) as Array<[FontKey, (typeof fontRegistry)[FontKey]]>
)
  .filter(([key]) => !(CORE_FONT_KEYS as readonly string[]).includes(key))
  .map(([, f]) => f.font.variable)
  .join(" ");

/** @deprecated Prefer coreFontVars + adminFontVars; kept for compatibility. */
export { coreFontVars as fontVars } from "./core";

export const fontOptions = (Object.entries(fontRegistry) as Array<[FontKey, (typeof fontRegistry)[FontKey]]>).map(
  ([key, f]) => ({
    key,
    label: f.label,
    variable: f.font.variable,
  }),
);
