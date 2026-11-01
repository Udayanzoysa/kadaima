"use client";

import Link from "next/link";
import { CreditCard, CalendarDays, ChevronDown, GraduationCap, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  avatarUrl?: string | null;
}

export function ProfileMenu({ user }: { user: SiteAuthUser }) {
  const { t } = useI18n();
  const isStudent = (user.team ?? "Student") === "Student";
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const initial = firstName.charAt(0).toUpperCase();

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
          className="inline-flex h-9 items-center gap-2 rounded-full px-2 py-1 text-slate-800 transition hover:bg-slate-100/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/40"
          aria-label={`${user.name} account menu`}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="size-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-[#1769D2] to-[#3B82F6] text-xs font-semibold text-white shadow-2xs ring-1 ring-[#1769D2]/20">
              {initial}
            </span>
          )}
          <span className="hidden max-w-[8rem] truncate text-sm font-medium text-slate-800 sm:inline">
            {firstName}
          </span>
          <ChevronDown className="size-3.5 text-slate-500 opacity-80" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl p-2 shadow-xl shadow-slate-200/60 border-slate-100">
        <DropdownMenuLabel className="px-2.5 py-2 font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none text-slate-900">{user.name}</p>
            <p className="text-xs leading-none text-slate-500 truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm text-slate-700 hover:bg-[#EBF3FE] hover:text-[#1769D2]">
              <UserIcon className="size-4 text-slate-500" />
              {t("public.nav.myAccount") || t("public.nav.profile") || "My Account"}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/classes" className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm text-slate-700 hover:bg-[#EBF3FE] hover:text-[#1769D2]">
              <GraduationCap className="size-4 text-slate-500" />
              {t("public.nav.myClasses")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/timetable" className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm text-slate-700 hover:bg-[#EBF3FE] hover:text-[#1769D2]">
              <CalendarDays className="size-4 text-slate-500" />
              {t("public.nav.timetable")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/payments" className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm text-slate-700 hover:bg-[#EBF3FE] hover:text-[#1769D2]">
              <CreditCard className="size-4 text-slate-500" />
              {t("public.nav.paymentsAndReceipts") || t("public.nav.payments")}
            </Link>
          </DropdownMenuItem>
          {!isStudent ? (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm text-slate-700 hover:bg-[#EBF3FE] hover:text-[#1769D2]">
                <LayoutDashboard className="size-4 text-slate-500" />
                {t("public.nav.dashboard")}
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          <LogOut className="size-4" />
          {t("public.nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
