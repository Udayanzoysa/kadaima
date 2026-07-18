"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-redirect";
import { getClientCookie } from "@/lib/cookie.client";

export interface UserPermission {
  action: string;
  subject: string;
}

type MenuItem = { name: string; path: string; icon: string };

type CachedAuth = {
  menu: MenuItem[];
  permissions: UserPermission[];
};

/** Persist across in-dashboard navigations so we don’t re-flash a full-screen loader. */
let cachedAuth: CachedAuth | null = null;

export function clearPermissionCache() {
  cachedAuth = null;
}

const PermissionContext = createContext<{
  permissions: UserPermission[];
  hasPermission: (action: string, subject: string) => boolean;
}>({
  permissions: [],
  hasPermission: () => false,
});

export function usePermissions() {
  return useContext(PermissionContext);
}

function hasPerm(permissions: UserPermission[], action: string, subject: string) {
  if (permissions.some((p) => p.action === "manage" && p.subject === "all")) {
    return true;
  }
  return permissions.some(
    (p) =>
      p.subject.toLowerCase() === subject.toLowerCase() &&
      p.action.toLowerCase() === action.toLowerCase(),
  );
}

type PathDecision = { ok: true } | { ok: false; redirectTo: string };

function decidePath(
  pathname: string,
  allowedMenu: MenuItem[],
  allowedPermissions: UserPermission[],
): PathDecision {
  const allowedPaths = allowedMenu.map((item) => item.path);

  const isSuperAdmin = hasPerm(allowedPermissions, "manage", "all");
  const canManageQuizzes =
    isSuperAdmin ||
    hasPerm(allowedPermissions, "manage", "quizzes") ||
    hasPerm(allowedPermissions, "read", "quizzes");

  const alwaysAllowed = [
    "/admin",
    "/admin/default",
    "/admin/unauthorized",
    "/admin/profile",
    "/admin/coming-soon",
  ];

  const isQuizAdminRoute =
    pathname.startsWith("/admin/quizzes/manage") ||
    pathname.startsWith("/admin/quizzes/new") ||
    pathname.startsWith("/admin/courses") ||
    pathname.startsWith("/admin/teacher-page") ||
    pathname === "/admin/questions" ||
    pathname.startsWith("/admin/questions/") ||
    /^\/admin\/quizzes\/[^/]+\/edit$/.test(pathname) ||
    /^\/teacher\/quizzes\/[^/]+\/edit$/.test(pathname);

  if (isQuizAdminRoute) {
    return canManageQuizzes ? { ok: true } : { ok: false, redirectTo: "/unauthorized" };
  }

  const isStudentQuizRoute =
    pathname === "/admin/quizzes" ||
    /^\/admin\/quizzes\/[^/]+\/(take|result)$/.test(pathname) ||
    /^\/teacher\/quizzes\/[^/]+\/(take|result)$/.test(pathname);

  if (isStudentQuizRoute) {
    if (!isSuperAdmin && canManageQuizzes) {
      return { ok: false, redirectTo: "/admin/quizzes/manage" };
    }
    return { ok: true };
  }

  const isAdminOnlyRoute =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/payments") ||
    pathname.startsWith("/admin/settings") ||
    pathname.startsWith("/admin/logs");

  if (isAdminOnlyRoute) {
    return isSuperAdmin ? { ok: true } : { ok: false, redirectTo: "/unauthorized" };
  }

  if (alwaysAllowed.includes(pathname)) {
    return { ok: true };
  }

  const subpath = pathname.replace(/^\/(admin|teacher)/, "");
  const rootSubpath = "/" + subpath.split("/")[1];
  const isPathAllowed = allowedPaths.includes(subpath) || allowedPaths.includes(rootSubpath);

  return isPathAllowed ? { ok: true } : { ok: false, redirectTo: "/unauthorized" };
}

export function PermissionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [bootstrapping, setBootstrapping] = useState(() => !cachedAuth);
  const [allowed, setAllowed] = useState(false);
  const [permissions, setPermissions] = useState<UserPermission[]>(
    () => cachedAuth?.permissions ?? [],
  );

  useEffect(() => {
    const onAuthChanged = () => {
      clearPermissionCache();
      setBootstrapping(true);
      setAllowed(false);
      setPermissions([]);
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, []);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      clearPermissionCache();
      router.push("/login");
      return;
    }

    let cancelled = false;

    const apply = (menu: MenuItem[], perms: UserPermission[]) => {
      if (cancelled) return;
      cachedAuth = { menu, permissions: perms };
      setPermissions(perms);
      const decision = decidePath(pathname, menu, perms);
      if (!decision.ok) {
        setAllowed(false);
        setBootstrapping(false);
        router.replace(decision.redirectTo);
        return;
      }
      setAllowed(true);
      setBootstrapping(false);
    };

    if (cachedAuth) {
      apply(cachedAuth.menu, cachedAuth.permissions);
      return;
    }

    setBootstrapping(true);
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${APP_CONFIG.apiUrl}/dashboard/menu`, { headers }).then((res) => {
        if (!res.ok) throw new Error("Failed to verify menu access.");
        return res.json();
      }),
      fetch(`${APP_CONFIG.apiUrl}/dashboard/permissions`, { headers }).then((res) => {
        if (!res.ok) throw new Error("Failed to verify permissions.");
        return res.json();
      }),
    ])
      .then(([allowedMenu, allowedPermissions]: [MenuItem[], UserPermission[]]) => {
        apply(allowedMenu, allowedPermissions);
      })
      .catch((err) => {
        console.error("Auth guard error:", err);
        if (cancelled) return;
        clearPermissionCache();
        setBootstrapping(false);
        setAllowed(false);
        router.replace("/unauthorized");
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const hasPermission = (action: string, subject: string): boolean =>
    hasPerm(permissions, action, subject);

  if (bootstrapping) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6"
      >
        <Spinner className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verifying access…</p>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}
