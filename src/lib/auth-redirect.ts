/** Decode JWT payload without verifying (client routing hint only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** Where to send a user after sign-in based on their team claim. */
export function postLoginPath(accessToken: string, fallback = "/"): string {
  const team = decodeJwtPayload(accessToken)?.team;
  if (team === "Student") return "/";
  if (team === "Teacher") return "/admin/default";
  if (typeof team === "string" && team.length > 0) return "/admin/default";
  return fallback;
}

export const AUTH_CHANGED_EVENT = "kadaima-auth-changed";

export function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
