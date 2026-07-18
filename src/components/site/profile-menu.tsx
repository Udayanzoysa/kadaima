"use client";

import Link from "next/link";

import { Banknote, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/hooks/use-i18n";
import { notifyAuthChanged } from "@/lib/auth-redirect";
import { deleteClientCookie } from "@/lib/cookie.client";

export interface SiteAuthUser {
  name: string;
  email: string;
  team?: string | null;
}

export function ProfileMenu({ user }: { user: SiteAuthUser }) {
  const { t } = useI18n();
  const isStudent = (user.team ?? "Student") === "Student";
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  const handleLogout = () => {
    deleteClientCookie("session_token");
    notifyAuthChanged();
    // Hard navigation clears client auth state so Welcome cannot stick around.
    window.location.assign("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[#1563b8] px-2.5 text-white shadow-sm transition hover:bg-[#114f94] sm:pr-3.5"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/35">
            <UserIcon className="size-3.5" strokeWidth={2.25} />
          </span>
          <span className="hidden max-w-[9rem] truncate text-xs font-semibold sm:inline">
            {t("public.nav.welcome").replace("{name}", firstName)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-48 rounded-xl p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer gap-2.5">
              <UserIcon className="size-4 text-slate-500" />
              {t("public.nav.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/payments" className="cursor-pointer gap-2.5">
              <Banknote className="size-4 text-slate-500" />
              {t("public.nav.payments")}
            </Link>
          </DropdownMenuItem>
          {!isStudent ? (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer gap-2.5">
                <LayoutDashboard className="size-4 text-slate-500" />
                {t("public.nav.dashboard")}
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer gap-2.5 text-red-600 focus:text-red-600"
        >
          <LogOut className="size-4" />
          {t("public.nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
