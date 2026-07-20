"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClipboardList, HelpCircle, Timer } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ProfileMenu, type SiteAuthUser } from "@/components/site/profile-menu";
import { PublicSiteFooter } from "@/components/site/public-site-footer";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-redirect";
import { deleteClientCookie, getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

const SupportChatWidget = dynamic(
  () => import("@/components/site/support-chat-widget").then((m) => m.SupportChatWidget),
  { ssr: false },
);

/** Mount chat FAB after idle so its JS/PNG stay off the critical path. */
function DeferredSupportChat() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => setReady(true), { timeout: 3000 });
    } else {
      timer = setTimeout(() => setReady(true), 1500);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;
  return <SupportChatWidget />;
}

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
  const [authUser, setAuthUser] = useState<SiteAuthUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const syncAuth = async () => {
      const token = getClientCookie("session_token");
      if (!token) {
        if (!cancelled) setAuthUser(null);
        return;
      }
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          deleteClientCookie("session_token");
          if (!cancelled) setAuthUser(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setAuthUser({ name: data.name, email: data.email, team: data.team });
        }
      } catch {
        if (!cancelled) setAuthUser(null);
      }
    };

    void syncAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("focus", syncAuth);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("focus", syncAuth);
    };
  }, []);

  const resolvedActive =
    activeNav ??
    NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(`${n.href}/`)))
      ?.id ??
    "quiz";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#e8eef5] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-4 md:h-16 md:gap-4 md:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center">
            <BrandLogo className="h-7 w-auto sm:h-8 md:h-9" priority />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => {
              const isActive = resolvedActive === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "relative pb-1 text-sm font-medium transition-colors",
                    isActive ? "text-[#1563b8]" : "text-slate-500 hover:text-slate-800",
                    isActive &&
                      "after:absolute after:inset-x-0 after:-bottom-[15px] after:h-0.5 after:rounded-full after:bg-[#1563b8]",
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher value={locale} onChange={setLocale} />

            {authUser === undefined ? (
              <div className="flex items-center gap-1.5" role="status" aria-busy="true" aria-label="Loading account">
                <span className="hidden h-9 w-[4.5rem] animate-pulse rounded-full bg-slate-200/90 sm:inline-block" />
                <span className="inline-block h-9 w-9 animate-pulse rounded-full bg-slate-200/90 sm:w-[9.5rem]" />
              </div>
            ) : authUser ? (
              <ProfileMenu user={authUser} />
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-[#1563b8]/40 hover:text-[#1563b8] sm:px-3.5"
                >
                  {t("public.nav.login")}
                </Link>
                <Link
                  href="/student/register"
                  className="inline-flex h-9 items-center rounded-full bg-[#1563b8] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#114f94] sm:px-3.5"
                >
                  {t("public.nav.register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* flex-1 fills leftover viewport with the same tone as the footer — no pale empty slab */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-[#f4f7fb]">{children}</div>

      <PublicSiteFooter
        copyright={t("public.footerRights").replace("{year}", String(new Date().getFullYear()))}
        appStoresComingSoon={t("public.footer.appStoresComingSoon")}
        aboutSummary={t("public.footer.aboutSummary")}
        usefulLinksHeading={t("public.footer.usefulLinks")}
        exploreLinksHeading={t("public.footer.explore")}
        getAppHeading={t("public.footer.getTheApp")}
        infoEmail={t("public.footer.infoEmail")}
        whatsappDisplay={t("public.footer.whatsappShort")}
        whatsappE164="94775075179"
        emailLabel={t("public.footer.emailShort")}
        poweredByBefore={t("public.footer.poweredBy")}
        poweredByAfter={t("public.footer.techwingSolutions")}
        links={[
          { href: "/about", label: t("public.footer.about") },
          { href: "/contact", label: t("public.footer.contact") },
          { href: "/privacy-policy", label: t("public.footer.privacy") },
          { href: "/terms", label: t("public.footer.terms") },
        ]}
        exploreLinks={[
          { href: "/partner", label: t("public.footer.partner") },
          { href: "/teacher/register", label: t("public.footer.teacherProfile") },
          { href: "/faq", label: t("public.footer.faqs") },
          { href: "/referral", label: t("public.footer.referral") },
        ]}
      />

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
                  isActive ? "bg-[#1563b8] text-white shadow-sm" : "text-slate-500",
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <DeferredSupportChat />
    </div>
  );
}
