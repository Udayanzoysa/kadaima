"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BookOpenCheck, ClipboardList, Globe, HelpCircle, Timer } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Quiz", href: "/", icon: HelpCircle },
  { label: "In Progress", href: "/quiz/in-progress", icon: Timer },
  { label: "My Attempts", href: "/quiz/my-attempts", icon: ClipboardList },
] as const;

export function PublicQuizShell({
  children,
  activeNav,
}: {
  children: React.ReactNode;
  activeNav?: string;
}) {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const localeMeta = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const resolvedActive =
    activeNav ??
    NAV.find((n) =>
      n.href === "/"
        ? pathname === "/"
        : pathname === n.href || pathname.startsWith(`${n.href}/`),
    )?.label ?? "Quiz";

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f4f7fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/brand/kadaima-logo.png"
              alt="Kadaima"
              width={140}
              height={36}
              className="h-8 w-auto md:h-9"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => {
              const isActive = resolvedActive === item.label;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "relative pb-1 text-sm font-medium transition-colors",
                    isActive ? "text-[#2b7fff]" : "text-slate-500 hover:text-slate-800",
                    isActive &&
                      "after:absolute after:inset-x-0 after:-bottom-[15px] after:h-0.5 after:rounded-full after:bg-[#2b7fff]",
                  )}
                >
                  {item.label}
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
            <Link
              href="/auth/v1/login"
              className="flex size-9 items-center justify-center rounded-full bg-[#2b7fff] text-xs font-bold text-white shadow-sm"
              aria-label="Account"
            >
              JD
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col pb-20 md:pb-0">{children}</div>

      <footer className="relative z-10 mt-auto hidden border-t border-slate-200 bg-white md:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2 font-medium text-slate-600">
            <BookOpenCheck className="size-4 text-[#2b7fff]" />
            Kadaima
          </span>
          <span>© {new Date().getFullYear()} Kadaima. All rights reserved.</span>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedActive === item.label;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition",
                  isActive ? "bg-[#2b7fff] text-white shadow-sm" : "text-slate-500",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
