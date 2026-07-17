"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClipboardList, Globe, HelpCircle, Timer } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ProfileMenu, type SiteAuthUser } from "@/components/site/profile-menu";
import { SupportChatWidget } from "@/components/site/support-chat-widget";
import { useI18n } from "@/hooks/use-i18n";
import { APP_CONFIG } from "@/config/app-config";
import { deleteClientCookie, getClientCookie } from "@/lib/cookie.client";
import { LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "quiz", labelKey: "public.nav.quiz", href: "/", icon: HelpCircle },
  { id: "in-progress", labelKey: "public.nav.inProgress", href: "/quiz/in-progress", icon: Timer },
  { id: "my-attempts", labelKey: "public.nav.myAttempts", href: "/quiz/my-attempts", icon: ClipboardList },
] as const;

export function PublicQuizShell({
  children,
  activeNav,
}: {
  children: React.ReactNode;
  activeNav?: (typeof NAV)[number]["id"];
}) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const localeMeta = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  const [authUser, setAuthUser] = useState<SiteAuthUser | null | undefined>(undefined);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      setAuthUser(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          deleteClientCookie("session_token");
          setAuthUser(null);
          return;
        }
        const data = await res.json();
        setAuthUser({ name: data.name, email: data.email, team: data.team });
      } catch {
        setAuthUser(null);
      }
    })();
  }, []);

  const resolvedActive =
    activeNav ??
    NAV.find((n) =>
      n.href === "/"
        ? pathname === "/"
        : pathname === n.href || pathname.startsWith(`${n.href}/`),
    )?.id ??
    "quiz";

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f4f7fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo className="h-8 w-auto md:h-9" priority />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => {
              const isActive = resolvedActive === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "relative pb-1 text-sm font-medium transition-colors",
                    isActive ? "text-[#2b7fff]" : "text-slate-500 hover:text-slate-800",
                    isActive &&
                      "after:absolute after:inset-x-0 after:-bottom-[15px] after:h-0.5 after:rounded-full after:bg-[#2b7fff]",
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition hover:border-[#2b7fff]/40 hover:text-[#2b7fff]"
              onClick={() => {
                const idx = LOCALES.findIndex((l) => l.code === locale);
                setLocale(LOCALES[(idx + 1) % LOCALES.length].code);
              }}
            >
              <Globe className="size-3.5" />
              <span className="max-w-[4.5rem] truncate">{localeMeta.label}</span>
            </button>

            {authUser ? (
              <ProfileMenu user={authUser} />
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-[#2b7fff]/40 hover:text-[#2b7fff] sm:px-3.5"
                >
                  {t("public.nav.login")}
                </Link>
                <Link
                  href="/student/register"
                  className="inline-flex h-9 items-center rounded-full bg-[#2b7fff] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1f6fe6] sm:px-3.5"
                >
                  {t("public.nav.register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col pb-20 md:pb-0">{children}</div>

      <footer className="relative z-10 mt-auto border-t border-slate-200 bg-white pb-[max(4.5rem,env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:gap-6 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <BrandLogo className="h-6 w-auto" />
            <span className="text-slate-400">
              {t("public.footerRights").replace("{year}", String(new Date().getFullYear()))}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/about" className="transition hover:text-[#2b7fff]">
              {t("public.footer.about")}
            </Link>
            <Link href="/contact" className="transition hover:text-[#2b7fff]">
              {t("public.footer.contact")}
            </Link>
            <Link href="/privacy-policy" className="transition hover:text-[#2b7fff]">
              {t("public.footer.privacy")}
            </Link>
            <Link href="/terms" className="transition hover:text-[#2b7fff]">
              {t("public.footer.terms")}
            </Link>
          </nav>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedActive === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition",
                  isActive ? "bg-[#2b7fff] text-white shadow-sm" : "text-slate-500",
                )}
              >
                <Icon className="size-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>

      <SupportChatWidget />
    </div>
  );
}
