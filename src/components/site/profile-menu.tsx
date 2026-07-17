"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronDown, CreditCard, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { deleteClientCookie } from "@/lib/cookie.client";
import { getInitials } from "@/lib/utils";

export interface SiteAuthUser {
  name: string;
  email: string;
  team?: string | null;
}

export function ProfileMenu({ user }: { user: SiteAuthUser }) {
  const router = useRouter();
  const { t } = useI18n();
  const isStudent = (user.team ?? "Student") === "Student";

  const handleLogout = () => {
    deleteClientCookie("session_token");
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 shadow-sm transition hover:border-[#2b7fff]/40 sm:pr-3"
        >
          <Avatar size="sm" className="size-6">
            <AvatarFallback className="bg-[#eef6ff] text-[10px] font-semibold text-[#2b7fff]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-1.5 text-left">
            <Avatar size="sm" className="size-8">
              <AvatarFallback className="bg-[#eef6ff] text-xs font-semibold text-[#2b7fff]">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 leading-tight">
              <span className="truncate text-sm font-semibold text-slate-900">{user.name}</span>
              <span className="truncate text-xs text-slate-500">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <UserIcon />
              {t("public.nav.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/payments" className="cursor-pointer">
              <CreditCard />
              {t("public.nav.payments")}
            </Link>
          </DropdownMenuItem>
          {!isStudent ? (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <LayoutDashboard />
                {t("public.nav.dashboard")}
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut />
          {t("public.nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
