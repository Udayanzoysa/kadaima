import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/auth",
  "/quiz",
  "/results",
  "/brand",
  "/_next",
  "/favicon.ico",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  const { pathname } = req.nextUrl;

  // Logged-in users on auth pages → admin home
  if (
    token &&
    (pathname.startsWith("/auth/v1") ||
      pathname.startsWith("/auth/v2") ||
      pathname === "/auth" ||
      pathname.startsWith("/auth/"))
  ) {
    return NextResponse.redirect(new URL("/admin/default", req.url));
  }

  // Protect admin / teacher / (legacy) dashboard
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/dashboard");

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/auth/v1/login", req.url));
  }

  // Public home + quiz routes do not require auth
  if (!token && !isPublicPath(pathname) && isProtected) {
    return NextResponse.redirect(new URL("/auth/v1/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|media|brand).*)"],
};
