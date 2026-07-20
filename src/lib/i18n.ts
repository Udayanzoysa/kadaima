import en from "@/locales/en.json";

export type Locale = "en" | "si" | "ta";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල" },
  { code: "ta", label: "தமிழ்" },
];

type Dictionary = typeof en;

/** English ships with the main bundle; si/ta load on demand. */
const resources: Partial<Record<Locale, Dictionary>> = { en };

const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Dictionary }>> = {
  si: () => import("@/locales/si.json"),
  ta: () => import("@/locales/ta.json"),
};

const pending = new Map<Locale, Promise<Dictionary>>();

export async function loadLocaleDictionary(locale: Locale): Promise<Dictionary> {
  const cached = resources[locale];
  if (cached) return cached;

  const existing = pending.get(locale);
  if (existing) return existing;

  if (locale === "en") return en;

  const promise = loaders[locale]().then((mod) => {
    resources[locale] = mod.default;
    pending.delete(locale);
    return mod.default;
  });
  pending.set(locale, promise);
  return promise;
}

export function getTranslation(locale: Locale, key: string): string {
  const keys = key.split(".");
  let value: unknown = resources[locale] ?? resources.en;

  for (const k of keys) {
    if (value && typeof value === "object" && k in (value as object)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Fallback to English when the active locale dictionary is still loading.
      if (locale !== "en") {
        return getTranslation("en", key);
      }
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}
