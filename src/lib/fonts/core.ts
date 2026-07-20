import { Geist, Geist_Mono, Outfit } from "next/font/google";

/** Body UI font — swap without competing for LCP preload bandwidth. */
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  preload: false,
});

/** Public hero / headings — sole preloaded face for LCP. */
export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

export const coreFontVars = [geist.variable, geistMono.variable, outfit.variable].join(" ");