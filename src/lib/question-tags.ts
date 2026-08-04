/**
 * Helpers for the question-bank tag API.
 * `GET /questions/tags` returns `{ tag, count }[]` (legacy callers may still
 * see a plain `string[]` during rolling deploys).
 */

export type QuestionTag = {
  tag: string;
  count: number;
};

export function parseTagList(data: unknown): QuestionTag[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (typeof item === "string") {
        const tag = item.trim();
        return tag ? { tag, count: 0 } : null;
      }
      if (item && typeof item === "object" && "tag" in item) {
        const tag = String((item as { tag: unknown }).tag ?? "").trim();
        if (!tag) return null;
        const countRaw = (item as { count?: unknown }).count;
        const count = typeof countRaw === "number" ? countRaw : Number(countRaw) || 0;
        return { tag, count };
      }
      return null;
    })
    .filter((item): item is QuestionTag => item != null);
}

export function tagNames(data: unknown): string[] {
  return parseTagList(data).map((t) => t.tag);
}
