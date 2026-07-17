/** Paths that use the public Kadaima site chrome (not admin / teacher app). */
export function isPublicSitePath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/dashboard")) return false;
  if (pathname.startsWith("/mail")) return false;
  if (pathname.startsWith("/chat")) return false;
  if (pathname === "/unauthorized" || pathname.startsWith("/unauthorized/")) return false;

  // Teacher dashboard app — exclude public registration
  if (pathname === "/teacher" || pathname.startsWith("/teacher/")) {
    if (pathname === "/teacher/register" || pathname.startsWith("/teacher/register/")) {
      return true;
    }
    return false;
  }

  return true;
}
