/** Parses a fetch Response as JSON, tolerating empty/non-JSON bodies (e.g. from a dropped connection). */
export async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
