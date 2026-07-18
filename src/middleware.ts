import { type NextRequest, NextResponse } from "next/server";

/** Decode a JWT payload without verifying the signature (routing hint only — the API still enforces real authorization). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
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

const PUBLIC_PREFIXES = [
  "/auth",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/student",
  "/quiz",
  "/results",
  "/brand",
  "/t",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/_next",
  "/favicon.ico",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/teacher/register" || pathname.startsWith("/teacher/register/")) {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAuthPage(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/") ||
    pathname === "/student/register" ||
    pathname.startsWith("/student/register/") ||
    pathname === "/teacher/register" ||
    pathname.startsWith("/teacher/register/") ||
    pathname.startsWith("/auth/v1") ||
    pathname.startsWith("/auth/v2") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  );
}

/** /teacher app routes — exclude public teacher registration */
function isTeacherAppPath(pathname: string) {
  if (pathname === "/teacher/register" || pathname.startsWith("/teacher/register/")) {
    return false;
  }
  return pathname === "/teacher" || pathname.startsWith("/teacher/");
}

/** Personal account pages — any logged-in user, but not part of the /admin dashboard. */
function isAccountPath(pathname: string) {
  return pathname === "/profile" || pathname.startsWith("/profile/") ||
    pathname === "/payments" || pathname.startsWith("/payments/");
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  const { pathname } = req.nextUrl;

  // Logged-in users on auth pages → role home (students must not land on /admin)
  if (token && isAuthPage(pathname)) {
    const payload = decodeJwtPayload(token);
    const dest = payload?.team === "Student" ? "/" : "/admin/default";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Students don't get the /admin or /teacher dashboards — send them to quizzes home.
  if (token && (pathname.startsWith("/admin") || isTeacherAppPath(pathname))) {
    const payload = decodeJwtPayload(token);
    if (payload?.team === "Student") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  const isProtected =
    pathname.startsWith("/admin") ||
    isTeacherAppPath(pathname) ||
    pathname.startsWith("/dashboard") ||
    isAccountPath(pathname);

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!token && !isPublicPath(pathname) && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|media|brand).*)"],
};
