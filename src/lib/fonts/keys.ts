/** Font preference keys — kept free of `next/font` so public pages don't pull admin fonts. */
export const FONT_KEYS = [
  "geist",
  "inter",
  "notoSans",
  "nunitoSans",
  "figtree",
  "roboto",
  "raleway",
  "dmSans",
  "publicSans",
  "outfit",
  "geistMono",
  "geistPixelSquare",
  "jetBrainsMono",
  "notoSerif",
  "robotoSlab",
  "merriweather",
  "lora",
  "playfairDisplay",
] as const;

export type FontKey = (typeof FONT_KEYS)[number];
