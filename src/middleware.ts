import { type NextRequest, NextResponse } from "next/server";

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

export function middleware(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  const { pathname } = req.nextUrl;

  // Logged-in users on auth pages → admin home
  if (token && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/admin/default", req.url));
  }

  const isProtected =
    pathname.startsWith("/admin") ||
    isTeacherAppPath(pathname) ||
    pathname.startsWith("/dashboard");

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
