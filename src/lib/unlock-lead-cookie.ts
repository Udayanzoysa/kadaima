import { getClientCookie, setClientCookie } from "@/lib/cookie.client";

const UNLOCK_LEAD_COOKIE = "kadaima_unlock_lead";

export interface UnlockLeadCookie {
  studentName: string;
  school: string;
  mobileNumber: string;
  email?: string;
}

export function saveUnlockLeadCookie(data: UnlockLeadCookie) {
  const payload = encodeURIComponent(JSON.stringify(data));
  setClientCookie(UNLOCK_LEAD_COOKIE, payload, 30);
}

export function readUnlockLeadCookie(): UnlockLeadCookie | null {
  const raw = getClientCookie(UNLOCK_LEAD_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as UnlockLeadCookie;
  } catch {
    return null;
  }
}
