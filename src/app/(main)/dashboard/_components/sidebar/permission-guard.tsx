"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

export interface UserPermission {
  action: string;
  subject: string;
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

export function PermissionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      router.push("/login");
      return;
    }

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
      .then(
        ([allowedMenu, allowedPermissions]: [
          Array<{ name: string; path: string; icon: string }>,
          UserPermission[],
        ]) => {
          setPermissions(allowedPermissions);
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

          // Quiz/question/course management — teachers + super admin
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
            if (!canManageQuizzes) {
              router.replace("/unauthorized");
              setLoading(false);
              return;
            }
            setAllowed(true);
            setLoading(false);
            return;
          }

          // Student take/result — students + super admin (teachers use manage UI)
          const isStudentQuizRoute =
            pathname === "/admin/quizzes" ||
            /^\/admin\/quizzes\/[^/]+\/(take|result)$/.test(pathname) ||
            /^\/teacher\/quizzes\/[^/]+\/(take|result)$/.test(pathname);

          if (isStudentQuizRoute) {
            if (!isSuperAdmin && canManageQuizzes) {
              router.replace("/admin/quizzes/manage");
              setLoading(false);
              return;
            }
            setAllowed(true);
            setLoading(false);
            return;
          }

          // Users / Roles / Payments / Settings — super admin only (CASL manage all)
          const isAdminOnlyRoute =
            pathname.startsWith("/admin/users") ||
            pathname.startsWith("/admin/roles") ||
            pathname.startsWith("/admin/payments") ||
            pathname.startsWith("/admin/settings");

          if (isAdminOnlyRoute) {
            if (!isSuperAdmin) {
              router.replace("/unauthorized");
              setLoading(false);
              return;
            }
            setAllowed(true);
            setLoading(false);
            return;
          }

          if (alwaysAllowed.includes(pathname)) {
            setAllowed(true);
            setLoading(false);
            return;
          }

          const subpath = pathname.replace(/^\/(admin|teacher)/, "");
          const rootSubpath = "/" + subpath.split("/")[1];
          const isPathAllowed = allowedPaths.includes(subpath) || allowedPaths.includes(rootSubpath);

          if (!isPathAllowed) {
            router.replace("/unauthorized");
          } else {
            setAllowed(true);
          }
          setLoading(false);
        },
      )
      .catch((err) => {
        console.error("Auth guard error:", err);
        router.replace("/unauthorized");
        setLoading(false);
      });
  }, [pathname, router]);

  const hasPermission = (action: string, subject: string): boolean =>
    hasPerm(permissions, action, subject);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
        <span className="ml-2 text-muted-foreground text-sm">Verifying access permissions...</span>
      </div>
    );
  }

  if (!allowed) return null;

  return <PermissionContext.Provider value={{ permissions, hasPermission }}>{children}</PermissionContext.Provider>;
}
