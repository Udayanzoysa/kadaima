import type { LocalizedText } from "@/types/quiz";
import { localize } from "@/types/quiz";

export type CatalogIndexModule = {
  id: string;
  title: LocalizedText | string;
  quizCount: number;
  searchText: string;
};

export type CatalogIndexCourse = {
  id: string;
  title: LocalizedText | string;
  quizCount: number;
  searchText: string;
  modules: CatalogIndexModule[];
};

export type CatalogIndexEntry = {
  type: "course" | "module";
  id: string;
  courseId: string;
  moduleId?: string;
  title: LocalizedText | string;
  quizCount: number;
  searchText: string;
};

export type CatalogIndex = {
  courses: CatalogIndexCourse[];
  entries: CatalogIndexEntry[];
};

/** Fast substring match against pre-normalized searchText (en/si/ta). */
export function searchCatalogIndex(
  entries: CatalogIndexEntry[],
  query: string,
  limit = 12,
): CatalogIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ entry: CatalogIndexEntry; score: number }> = [];
  for (const entry of entries) {
    const hay = entry.searchText || "";
    const idx = hay.indexOf(q);
    if (idx < 0) continue;
    // Prefer prefix / course matches for ranking.
    let score = idx === 0 ? 0 : 10;
    if (entry.type === "course") score -= 5;
    scored.push({ entry, score });
  }
  scored.sort((a, b) => a.score - b.score || b.entry.quizCount - a.entry.quizCount);
  return scored.slice(0, limit).map((s) => s.entry);
}

export function labelForEntry(entry: CatalogIndexEntry, locale: string) {
  return localize(entry.title as LocalizedText, locale as "en" | "si" | "ta");
}
