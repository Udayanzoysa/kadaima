"use client";

import { useEffect, useRef, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  CreditCard,
  Flag,
  Globe,
  GraduationCap,
  Layers,
  LogOut,
  Menu,
  PlayCircle,
  Search,
  Trophy,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand/brand-logo";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ProfileMenu, type SiteAuthUser } from "@/components/site/profile-menu";
import { PublicSiteFooter } from "@/components/site/public-site-footer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export type PublicNavId = "quiz" | "classes" | "timetable" | "leaderboard" | "in-progress" | "my-attempts" | "payments";

export function PublicQuizShell({
  children,
  activeNav,
  brandSlot,
}: {
  children: React.ReactNode;
  activeNav?: PublicNavId;
  brandSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [authUser, setAuthUser] = useState<SiteAuthUser | null | undefined>(undefined);

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(true);
  const [mobileLearningOpen, setMobileLearningOpen] = useState(false);
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Desktop dropdown open states
  const [exploreMenuOpen, setExploreMenuOpen] = useState(false);
  const [learningMenuOpen, setLearningMenuOpen] = useState(false);
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    void pathname;
    setMobileMenuOpen(false);
  }, [pathname]);

  // Auth sync
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

  // Active section detection
  const isExploreActive =
    activeNav === "quiz" || pathname === "/" || pathname.startsWith("/quiz/course") || pathname.startsWith("/quiz/");
  const isLearningActive =
    activeNav === "classes" ||
    activeNav === "timetable" ||
    activeNav === "in-progress" ||
    activeNav === "my-attempts" ||
    activeNav === "payments" ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/timetable") ||
    pathname.startsWith("/quiz/in-progress") ||
    pathname.startsWith("/quiz/my-attempts") ||
    pathname.startsWith("/payments");
  const isCommunityActive = activeNav === "leaderboard" || pathname.startsWith("/leaderboard");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      if (pathname === "/") {
        const target = document.getElementById("quizzes-by-course");
        target?.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push("/#quizzes-by-course");
      }
      return;
    }
    router.push(`/?q=${encodeURIComponent(q)}#quizzes-by-course`);
  };

  const handleNotificationClick = () => {
    toast.info("You're all caught up! No unread notifications.", {
      description: "Class announcements, quiz deadlines, and receipts will appear here.",
    });
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#F6F9FD] text-[#12243E]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[#DFE7F1] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-4 md:px-6">
          {/* Left: Brand Logo & Main Nav */}
          <div className="flex items-center gap-3 lg:gap-6">
            {brandSlot ? (
              <div className="flex min-w-0 shrink-0 items-center">{brandSlot}</div>
            ) : (
              <Link href="/" className="flex min-w-0 shrink-0 items-center">
                <BrandLogo className="h-7 w-auto sm:h-8 md:h-9" priority />
              </Link>
            )}

            {/* Desktop Navigation Dropdowns */}
            <nav className="hidden items-center gap-1.5 md:flex" aria-label="Main Navigation">
              {/* Explore Dropdown */}
              <DropdownMenu open={exploreMenuOpen} onOpenChange={setExploreMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/40",
                      isExploreActive || exploreMenuOpen
                        ? "bg-[#EBF3FE] font-semibold text-[#1769D2]"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <span>{t("public.nav.explore") || "Explore"}</span>
                    <ChevronDown
                      className={cn("size-3.5 transition-transform duration-200", exploreMenuOpen && "rotate-180")}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-64 rounded-2xl border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/60"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/#quizzes-by-course"
                      className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers className="size-4 text-[#1769D2]" />
                        <span>{t("public.nav.allQuizzes") || "All Quizzes"}</span>
                      </div>
                      <ChevronRight className="size-3.5 text-slate-400" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/#quizzes-by-course"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <GraduationCap className="size-4 text-slate-500" />
                      <span>{t("public.nav.grade5Scholarship") || "Grade 5 Scholarship"}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/#quizzes-by-course"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <BookOpen className="size-4 text-slate-500" />
                      <span>{t("public.nav.gceOL") || "G.C.E. O/L"}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/#quizzes-by-course"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <BookOpen className="size-4 text-slate-500" />
                      <span>{t("public.nav.gceAL") || "G.C.E. A/L"}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/#quizzes-by-course"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <Car className="size-4 text-slate-500" />
                      <span>{t("public.nav.drivingLicense") || "Driving License Exam"}</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* My Learning Dropdown */}
              <DropdownMenu open={learningMenuOpen} onOpenChange={setLearningMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/40",
                      isLearningActive || learningMenuOpen
                        ? "bg-[#EBF3FE] font-semibold text-[#1769D2]"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <span>{t("public.nav.myLearning") || "My Learning"}</span>
                    <ChevronDown
                      className={cn("size-3.5 transition-transform duration-200", learningMenuOpen && "rotate-180")}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-60 rounded-2xl border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/60"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/classes"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <Layers className="size-4 text-slate-500" />
                      <span>{t("public.nav.myClasses")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/timetable"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <CalendarDays className="size-4 text-slate-500" />
                      <span>{t("public.nav.timetable")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/quiz/in-progress"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <PlayCircle className="size-4 text-slate-500" />
                      <span>{t("public.nav.inProgress")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/quiz/my-attempts"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <ClipboardList className="size-4 text-slate-500" />
                      <span>{t("public.nav.myAttempts")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/payments"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <CreditCard className="size-4 text-slate-500" />
                      <span>{t("public.nav.paymentsAndReceipts") || "Payments & Receipts"}</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Community Dropdown */}
              <DropdownMenu open={communityMenuOpen} onOpenChange={setCommunityMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/40",
                      isCommunityActive || communityMenuOpen
                        ? "bg-[#EBF3FE] font-semibold text-[#1769D2]"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <span>{t("public.nav.community") || "Community"}</span>
                    <ChevronDown
                      className={cn("size-3.5 transition-transform duration-200", communityMenuOpen && "rotate-180")}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-56 rounded-2xl border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/60"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/leaderboard"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <Trophy className="size-4 text-slate-500" />
                      <span>{t("public.nav.leaderboard")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/leaderboard#challenges"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#EBF3FE] hover:text-[#1769D2]"
                    >
                      <Flag className="size-4 text-slate-500" />
                      <span>{t("public.nav.challenges") || "Challenges & Events"}</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Center-Right: Search Input + Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Search Input (Desktop) */}
            <search className="hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <div className="relative flex h-9.5 w-48 items-center rounded-full bg-[#F1F4F9] px-3.5 text-xs text-slate-700 transition-all focus-within:w-64 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1769D2]/30 lg:w-60 lg:focus-within:w-72">
                  <Search className="mr-2 size-4 shrink-0 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("public.nav.searchPlaceholder") || "Search quizzes, classes..."}
                    className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none sm:text-sm"
                  />
                  <kbd className="hidden select-none items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 shadow-2xs sm:inline-flex">
                    Ctrl K
                  </kbd>
                </div>
              </form>
            </search>

            {/* Desktop Only: Language Switcher, Notifications, User / Guest Auth */}
            <div className="hidden items-center gap-2 sm:gap-3 md:flex">
              {/* Language Switcher */}
              <LanguageSwitcher
                value={locale}
                onChange={setLocale}
                className="border-0 bg-transparent px-2.5 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-100 hover:text-slate-900"
              />

              {/* Notification Bell */}
              <button
                type="button"
                onClick={handleNotificationClick}
                className="relative inline-flex size-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/40"
                aria-label={t("public.nav.notifications") || "Notifications"}
              >
                <Bell className="size-4.5" />
                <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {/* User Profile Pill or Guest Auth */}
              {authUser === undefined ? (
                <div className="flex items-center gap-1.5" role="status" aria-busy="true" aria-label="Loading account">
                  <span className="inline-block size-8 animate-pulse rounded-full bg-slate-200" />
                  <span className="hidden h-4 w-16 animate-pulse rounded-full bg-slate-200 sm:inline-block" />
                </div>
              ) : authUser ? (
                <ProfileMenu user={authUser} />
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    href="/login"
                    className="inline-flex h-9 items-center rounded-full border border-[#DFE7F1] bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-[#1769D2]/40 hover:text-[#1769D2]"
                  >
                    {t("public.nav.login")}
                  </Link>
                  <Link
                    href="/student/register"
                    className="inline-flex h-9 items-center rounded-full bg-[#1769D2] px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#1152AA]"
                  >
                    {t("public.nav.register")}
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Only: Dropdown / Menu Icon Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex size-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 md:hidden focus-visible:outline-hidden active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="size-6 text-slate-800" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer / Sheet */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 cursor-default bg-black/40 backdrop-blur-xs transition-opacity duration-200"
          />
          <div className="relative z-10 flex h-full w-full max-w-[340px] flex-col justify-between bg-white p-5 shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Top Bar of Drawer: Brand Logo + Close Button */}
            <div className="flex items-center justify-between pb-3">
              {brandSlot ? (
                <div className="flex items-center">{brandSlot}</div>
              ) : (
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
                  <BrandLogo className="h-7 w-auto" priority />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex size-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Mobile Drawer Body */}
            <div className="flex-1 space-y-2 overflow-y-auto pt-2 pb-4">
              {/* 1. Explore Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileExploreOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between py-2.5 text-left font-semibold text-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="size-5 text-[#1769D2]" />
                    <span className="text-base">{t("public.nav.explore") || "Explore"}</span>
                  </div>
                  {mobileExploreOpen ? (
                    <ChevronUp className="size-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="size-4 text-slate-500" />
                  )}
                </button>

                {mobileExploreOpen && (
                  <div className="my-1 flex flex-col gap-3 rounded-2xl bg-[#EEF5FF] p-4">
                    <Link
                      href="/#quizzes-by-course"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.allQuizzes") || "All Quizzes"}
                    </Link>
                    <Link
                      href="/#quizzes-by-course"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.grade5Scholarship") || "Grade 5 Scholarship"}
                    </Link>
                    <Link
                      href="/#quizzes-by-course"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.gceOL") || "G.C.E. O/L"}
                    </Link>
                    <Link
                      href="/#quizzes-by-course"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.gceAL") || "G.C.E. A/L"}
                    </Link>
                    <Link
                      href="/#quizzes-by-course"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.drivingLicense") || "Driving License Exam"}
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. My Learning Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileLearningOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between py-2.5 text-left font-semibold text-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="size-5 text-[#1769D2]" />
                    <span className="text-base">{t("public.nav.myLearning") || "My Learning"}</span>
                  </div>
                  {mobileLearningOpen ? (
                    <ChevronUp className="size-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="size-4 text-slate-500" />
                  )}
                </button>

                {mobileLearningOpen && (
                  <div className="my-1 flex flex-col gap-3 rounded-2xl bg-[#EEF5FF] p-4">
                    <Link
                      href="/classes"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.myClasses")}
                    </Link>
                    <Link
                      href="/timetable"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.timetable")}
                    </Link>
                    <Link
                      href="/quiz/in-progress"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.inProgress")}
                    </Link>
                    <Link
                      href="/quiz/my-attempts"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.myAttempts")}
                    </Link>
                    <Link
                      href="/payments"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.paymentsAndReceipts") || "Payments & Receipts"}
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Community Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileCommunityOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between py-2.5 text-left font-semibold text-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="size-5 text-[#1769D2]" />
                    <span className="text-base">{t("public.nav.community") || "Community"}</span>
                  </div>
                  {mobileCommunityOpen ? (
                    <ChevronUp className="size-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="size-4 text-slate-500" />
                  )}
                </button>

                {mobileCommunityOpen && (
                  <div className="my-1 flex flex-col gap-3 rounded-2xl bg-[#EEF5FF] p-4">
                    <Link
                      href="/leaderboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.leaderboard")}
                    </Link>
                    <Link
                      href="/leaderboard#challenges"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium text-slate-800 transition hover:text-[#1769D2]"
                    >
                      {t("public.nav.challenges") || "Challenges & Events"}
                    </Link>
                  </div>
                )}
              </div>

              {/* Subtle Divider */}
              <div className="my-2 border-t border-slate-100" />

              {/* 4. Language Row */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Globe className="size-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-900">{t("public.nav.language") || "Language"}</span>
                </div>
                <LanguageSwitcher
                  value={locale}
                  onChange={setLocale}
                  className="border-0 bg-transparent px-2 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-100"
                />
              </div>

              {/* 5. Notifications Row */}
              <button
                type="button"
                onClick={handleNotificationClick}
                className="flex w-full items-center justify-between py-2 text-left"
              >
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-900">
                    {t("public.nav.notifications") || "Notifications"}
                  </span>
                </div>
                <span className="size-2 rounded-full bg-red-500" />
              </button>

              {/* 6. My Account Row */}
              {authUser ? (
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-between py-2 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <User className="size-4" />
                    </span>
                    <span className="text-sm font-medium text-slate-900 truncate max-w-[170px]">{authUser.name}</span>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </Link>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center rounded-full border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {t("public.nav.login")}
                  </Link>
                  <Link
                    href="/student/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center rounded-full bg-[#1769D2] py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1152AA]"
                  >
                    {t("public.nav.register")}
                  </Link>
                </div>
              )}
            </div>

            {/* Logout button at bottom of mobile drawer if logged in */}
            {authUser ? (
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    deleteClientCookie("session_token");
                    window.location.assign("/");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="size-4" />
                  <span>{t("public.nav.logout")}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-[#F6F9FD]">{children}</div>

      {/* Footer */}
      <PublicSiteFooter
        copyright={t("public.footerRights").replace("{year}", String(new Date().getFullYear()))}
        appStoresComingSoon={t("public.footer.appStoresComingSoon")}
        aboutSummary={t("public.footer.aboutSummary")}
        usefulLinksHeading={t("public.footer.usefulLinks")}
        exploreLinksHeading={t("public.footer.forStudents") || "For Students"}
        getAppHeading={t("public.footer.getTheApp")}
        infoEmail={t("public.footer.infoEmail")}
        whatsappDisplay={t("public.footer.whatsappShort")}
        whatsappE164="94775075179"
        emailLabel={t("public.footer.emailShort")}
        poweredByBefore={t("public.footer.poweredBy")}
        poweredByAfter={t("public.footer.techwingSolutions")}
        links={[
          { href: "/lms", label: "Classroom LMS" },
          { href: "/teachers", label: "Teachers" },
          { href: "/about", label: t("public.footer.about") },
          { href: "/contact", label: t("public.footer.contact") },
          { href: "/privacy-policy", label: t("public.footer.privacy") },
          { href: "/terms", label: t("public.footer.terms") },
        ]}
        exploreLinks={[
          { href: "/quiz", label: t("public.footer.exploreQuizzes") || "Explore Quizzes" },
          { href: "/faq", label: t("public.footer.faqs") || "FAQ" },
          { href: "/leaderboard", label: t("public.footer.leaderboard") || "Leaderboard" },
          { href: "/partner", label: "Partner With Us" },
        ]}
      />

      <DeferredSupportChat />
    </div>
  );
}
