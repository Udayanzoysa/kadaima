"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Phone,
  Sparkles,
  Trophy,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

/** Kadaima Scholar tokens from DESIGN.md — scoped to this marketing page. */
const DS = {
  bg: "#f8f9ff",
  soft: "#f0f9ff",
  softDeep: "#e5eeff",
  primary: "#006591",
  primaryBright: "#0ea5e9",
  ink: "#0b1c30",
  muted: "#3e4850",
} as const;

const HERO_IMG =
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80";
const FEATURE_IMG =
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80";

function LanguageMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-[family-name:var(--font-outfit)] text-sm font-bold leading-none tracking-tight",
        className,
      )}
      aria-hidden
    >
      あA
    </span>
  );
}

function DashboardMockup({
  alt,
  earningsLabel,
  earningsValue,
  viewsLabel,
  attemptsLabel,
}: {
  alt: string;
  earningsLabel: string;
  earningsValue: string;
  viewsLabel: string;
  attemptsLabel: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border bg-white shadow-[0_18px_40px_-20px_rgba(0,101,145,0.28)]"
      style={{ borderColor: `${DS.primaryBright}55` }}
      role="img"
      aria-label={alt}
    >
      <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[88px_1fr]">
        <aside className="space-y-3 border-r px-2 py-4" style={{ borderColor: DS.softDeep, background: DS.soft }}>
          <div className="mx-auto mb-4 flex size-8 items-center justify-center rounded-lg bg-[#006591] text-white">
            <LayoutDashboard className="size-4" aria-hidden />
          </div>
          {["Home", "Quizzes", "Earn", "Profile"].map((item, i) => (
            <div
              key={item}
              className={cn(
                "mx-auto h-2 w-10 rounded-full sm:w-12",
                i === 2 ? "bg-[#0ea5e9]" : "bg-[#d3e4fe]",
              )}
            />
          ))}
        </aside>
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30]">
                Teacher Dashboard
              </p>
              <p className="text-xs text-[#3e4850]/80">Revenue · Engagement</p>
            </div>
            <span className="rounded-full bg-[#e0f2fe] px-2.5 py-1 text-[10px] font-semibold text-[#006591]">
              Live
            </span>
          </div>

          <div
            className="mb-4 rounded-xl px-4 py-3"
            style={{ background: "linear-gradient(135deg,#006591,#0ea5e9)" }}
          >
            <p className="text-xs font-medium text-white/80">{earningsLabel}</p>
            <p className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {earningsValue}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#f0f9ff] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#3e4850]">{viewsLabel}</p>
              <p className="font-[family-name:var(--font-outfit)] text-lg font-bold text-[#006591]">1,248</p>
            </div>
            <div className="rounded-xl bg-[#f0f9ff] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#3e4850]">
                {attemptsLabel}
              </p>
              <p className="font-[family-name:var(--font-outfit)] text-lg font-bold text-[#006591]">486</p>
            </div>
          </div>

          <div className="relative h-28 overflow-hidden rounded-xl bg-[#f8f9ff] px-2 pt-4">
            <svg viewBox="0 0 240 80" className="h-full w-full" aria-hidden>
              <defs>
                <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d="M0 60 C30 55, 50 40, 80 42 C110 44, 130 20, 160 24 C190 28, 210 12, 240 16 L240 80 L0 80 Z"
                fill="url(#earnFill)"
              />
              <path
                d="M0 60 C30 55, 50 40, 80 42 C110 44, 130 20, 160 24 C190 28, 210 12, 240 16"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>
      </div>
      <span className="sr-only">{alt}</span>
    </div>
  );
}

function PartnerInquiryForm() {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      toast.error(t("public.partnerPage.formError"));
      return;
    }
    const mailto = `mailto:partners@kadaima.lk?subject=${encodeURIComponent(
      `[Kadaima Partners] ${institution.trim() || "Partner inquiry"}`,
    )}&body=${encodeURIComponent(
      `Name: ${fullName.trim()}\nEmail: ${email.trim()}\nPhone: ${phone.trim() || "—"}\nInstitution: ${institution.trim() || "—"}\n\n${message.trim()}`,
    )}`;
    setSending(true);
    window.location.href = mailto;
    toast.success(t("public.partnerPage.formSuccess"));
    setTimeout(() => setSending(false), 800);
  };

  const fieldClass =
    "h-11 rounded-xl border-[#bec8d2] bg-white shadow-none focus-visible:border-[#0ea5e9] focus-visible:ring-[#0ea5e9]/20";

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full flex-col rounded-2xl border border-[#d3e4fe] bg-white p-5 shadow-[0_4px_12px_rgba(11,28,48,0.05)] sm:p-6"
    >
      <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-[#0b1c30]">
        {t("public.partnerPage.formTitle")}
      </h3>
      <div className="mt-5 grid flex-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="partner-name" className="text-[#3e4850]">
            {t("public.partnerPage.formName")}
          </Label>
          <Input
            id="partner-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="partner-email" className="text-[#3e4850]">
            {t("public.partnerPage.formEmail")}
          </Label>
          <Input
            id="partner-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="partner-phone" className="text-[#3e4850]">
            {t("public.partnerPage.formPhone")}
          </Label>
          <Input
            id="partner-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="partner-institution" className="text-[#3e4850]">
            {t("public.partnerPage.formInstitution")}
          </Label>
          <Input
            id="partner-institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex min-h-0 flex-col space-y-1.5 sm:col-span-2">
          <Label htmlFor="partner-message" className="text-[#3e4850]">
            {t("public.partnerPage.formMessage")}
          </Label>
          <Textarea
            id="partner-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-28 flex-1 rounded-xl border-[#bec8d2] bg-white shadow-none focus-visible:border-[#0ea5e9] focus-visible:ring-[#0ea5e9]/20"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={sending}
        className="mt-5 h-11 w-full shrink-0 rounded-xl bg-[#0ea5e9] font-semibold text-white hover:bg-[#0284c7]"
      >
        {t("public.partnerPage.formSubmit")}
      </Button>
      <p className="mt-3 text-center text-sm text-[#3e4850]">
        {t("public.partnerPage.formOrDemo")}{" "}
        <Link href="/contact?subject=teacher" className="font-semibold text-[#006591] underline-offset-2 hover:underline">
          {t("public.partnerPage.formDemoLink")}
        </Link>
      </p>
    </form>
  );
}

export function PartnerPageContent() {
  const { t, locale } = useI18n();

  useEffect(() => {
    const title = t("public.partnerPage.metaTitle");
    const description = t("public.partnerPage.metaDescription");
    document.title = `${title} | ${APP_CONFIG.name}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
  }, [locale, t]);

  const audience = [
    {
      icon: GraduationCap,
      title: t("public.partnerPage.audienceSchoolTitle"),
      desc: t("public.partnerPage.audienceSchoolDesc"),
      custom: false as const,
    },
    {
      icon: null,
      title: t("public.partnerPage.audienceLanguageTitle"),
      desc: t("public.partnerPage.audienceLanguageDesc"),
      custom: true as const,
    },
    {
      icon: Trophy,
      title: t("public.partnerPage.audienceCompetitiveTitle"),
      desc: t("public.partnerPage.audienceCompetitiveDesc"),
      custom: false as const,
    },
    {
      icon: Building2,
      title: t("public.partnerPage.audienceInstituteTitle"),
      desc: t("public.partnerPage.audienceInstituteDesc"),
      custom: false as const,
    },
  ];

  const features = [
    {
      title: t("public.partnerPage.featureQuizzesTitle"),
      desc: t("public.partnerPage.featureQuizzesDesc"),
    },
    {
      title: t("public.partnerPage.featureProfileTitle"),
      desc: t("public.partnerPage.featureProfileDesc"),
    },
    {
      title: t("public.partnerPage.featureAnalyticsTitle"),
      desc: t("public.partnerPage.featureAnalyticsDesc"),
    },
  ];

  const steps = [
    {
      n: "1",
      title: t("public.partnerPage.earnStep1Title"),
      desc: t("public.partnerPage.earnStep1Desc"),
    },
    {
      n: "2",
      title: t("public.partnerPage.earnStep2Title"),
      desc: t("public.partnerPage.earnStep2Desc"),
    },
    {
      n: "3",
      title: t("public.partnerPage.earnStep3Title"),
      desc: t("public.partnerPage.earnStep3Desc"),
    },
  ];

  const elevatePillars = [
    {
      title: t("public.partnerPage.elevateItem1"),
      desc: t("public.partnerPage.elevateItem1Desc"),
    },
    {
      title: t("public.partnerPage.elevateItem2"),
      desc: t("public.partnerPage.elevateItem2Desc"),
    },
    {
      title: t("public.partnerPage.elevateItem3"),
      desc: t("public.partnerPage.elevateItem3Desc"),
    },
  ];

  const elevateFeatures = [
    {
      icon: Lock,
      title: t("public.partnerPage.elevateFeature1Title"),
      desc: t("public.partnerPage.elevateFeature1Desc"),
    },
    {
      icon: Video,
      title: t("public.partnerPage.elevateFeature2Title"),
      desc: t("public.partnerPage.elevateFeature2Desc"),
    },
    {
      icon: BellRing,
      title: t("public.partnerPage.elevateFeature3Title"),
      desc: t("public.partnerPage.elevateFeature3Desc"),
    },
    {
      icon: Users,
      title: t("public.partnerPage.elevateFeature4Title"),
      desc: t("public.partnerPage.elevateFeature4Desc"),
    },
    {
      icon: CalendarCheck2,
      title: t("public.partnerPage.elevateFeature5Title"),
      desc: t("public.partnerPage.elevateFeature5Desc"),
    },
    {
      icon: Wallet,
      title: t("public.partnerPage.elevateFeature6Title"),
      desc: t("public.partnerPage.elevateFeature6Desc"),
    },
  ];

  return (
    <PublicQuizShell>
      <main className="w-full min-w-0 flex-1" style={{ backgroundColor: DS.bg, color: DS.ink }}>
        {/* Hero — light, spacious */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(14,165,233,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(0,101,145,0.08),_transparent_50%)]"
          />
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-16">
            <div className="space-y-5">
              <p
                className="font-[family-name:var(--font-outfit)] text-base italic font-medium tracking-wide sm:text-lg"
                style={{ color: DS.primaryBright }}
              >
                {t("public.partnerPage.heroEyebrow")}
              </p>
              <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                <span style={{ color: DS.primaryBright }}>
                  {t("public.partnerPage.heroTitleHighlight")}
                </span>{" "}
                <span style={{ color: DS.ink }}>{t("public.partnerPage.heroTitleAfter")}</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: DS.muted }}>
                {t("public.partnerPage.heroSubtitle")}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  asChild
                  className="h-11 rounded-xl bg-[#0ea5e9] px-5 font-semibold text-white hover:bg-[#0284c7]"
                >
                  <Link href="/teacher/register">
                    {t("public.partnerPage.ctaTeacher")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-[#0ea5e9] bg-transparent px-5 font-semibold text-[#006591] hover:bg-[#f0f9ff] hover:text-[#006591]"
                >
                  <Link href="/contact?subject=teacher">{t("public.partnerPage.ctaContact")}</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-3 rounded-[1.35rem] opacity-70 blur-2xl"
                style={{ background: "radial-gradient(circle at 40% 40%, #89ceff66, transparent 65%)" }}
                aria-hidden
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- remote marketing asset; not in next image allowlist */}
              <img
                src={HERO_IMG}
                alt={t("public.partnerPage.heroImageAlt")}
                width={960}
                height={720}
                loading="eager"
                decoding="async"
                className="relative aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_20px_50px_-24px_rgba(0,101,145,0.45)]"
              />
            </div>
          </div>
        </section>

        {/* Who this is for */}
        <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight sm:text-3xl">
              {t("public.partnerPage.audienceTitle")}
            </h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: DS.muted }}>
              {t("public.partnerPage.audienceIntro")}
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audience.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[#d3e4fe]/80 bg-white p-6 text-center shadow-[0_4px_12px_rgba(11,28,48,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,101,145,0.12)]"
              >
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#e0f2fe] text-[#006591]">
                  {item.custom ? (
                    <LanguageMark className="text-[#006591]" />
                  ) : item.icon ? (
                    <item.icon className="size-6" strokeWidth={1.75} aria-hidden />
                  ) : null}
                </div>
                <h3 className="font-[family-name:var(--font-outfit)] text-[15px] font-bold text-[#0b1c30]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3e4850]">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* What you can do */}
        <section className="border-y border-[#d3e4fe]" style={{ backgroundColor: DS.soft }}>
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 lg:order-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={FEATURE_IMG}
                alt={t("public.partnerPage.featuresImageAlt")}
                width={960}
                height={720}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_16px_40px_-20px_rgba(0,101,145,0.35)]"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight sm:text-3xl">
                {t("public.partnerPage.featuresTitle")}
              </h2>
              <p className="mt-3 text-base leading-relaxed" style={{ color: DS.muted }}>
                {t("public.partnerPage.featuresIntro")}
              </p>
              <ul className="mt-6 space-y-4">
                {features.map((feature) => (
                  <li key={feature.title} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#0ea5e9]" aria-hidden />
                    <div>
                      <h3 className="font-[family-name:var(--font-outfit)] text-[15px] font-bold text-[#0b1c30]">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#3e4850]">{feature.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl border border-[#89ceff]/60 bg-[#e0f2fe]/70 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-[family-name:var(--font-outfit)] text-[15px] font-bold text-[#0b1c30]">
                    {t("public.partnerPage.featureMaterialsTitle")}
                  </h3>
                  <span className="rounded-full bg-[#0ea5e9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {t("public.partnerPage.comingSoon")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#3e4850]">
                  {t("public.partnerPage.featureMaterialsDesc")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How you earn */}
        <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight sm:text-3xl">
              {t("public.partnerPage.earnTitle")}
            </h2>
            <p className="mt-2 font-[family-name:var(--font-outfit)] text-base font-semibold text-[#0ea5e9] sm:text-lg">
              {t("public.partnerPage.earnSystemTitle")}
            </p>
            <p className="mt-3 text-base leading-relaxed" style={{ color: DS.muted }}>
              {t("public.partnerPage.earnIntro")}
            </p>
          </div>

          {/* 60 / 40 split */}
          <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-[#89ceff]/60 bg-[#e0f2fe] p-5 text-center shadow-[0_4px_12px_rgba(11,28,48,0.05)]">
              <p className="font-[family-name:var(--font-outfit)] text-4xl font-bold tracking-tight text-[#006591]">
                {t("public.partnerPage.earnSplitTeacherValue")}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30]">
                {t("public.partnerPage.earnSplitTeacherLabel")}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#3e4850]">
                {t("public.partnerPage.earnSplitTeacherDesc")}
              </p>
            </article>
            <article className="rounded-2xl border border-[#d3e4fe] bg-white p-5 text-center shadow-[0_4px_12px_rgba(11,28,48,0.05)]">
              <p className="font-[family-name:var(--font-outfit)] text-4xl font-bold tracking-tight text-[#0b1c30]">
                {t("public.partnerPage.earnSplitPlatformValue")}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30]">
                {t("public.partnerPage.earnSplitPlatformLabel")}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#3e4850]">
                {t("public.partnerPage.earnSplitPlatformDesc")}
              </p>
            </article>
          </div>

          {/* Formula */}
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[#d3e4fe] bg-white p-5 shadow-[0_4px_12px_rgba(11,28,48,0.05)] sm:p-6">
            <h3 className="font-[family-name:var(--font-outfit)] text-base font-bold text-[#0b1c30]">
              {t("public.partnerPage.earnFormulaTitle")}
            </h3>
            <div className="mt-4 overflow-x-auto rounded-xl bg-[#f0f9ff] px-4 py-5 text-center">
              <p className="font-[family-name:var(--font-outfit)] text-sm font-semibold text-[#006591] sm:text-base">
                {t("public.partnerPage.earnFormulaYourIncome")}
              </p>
              <p className="my-2 text-lg font-bold text-[#0b1c30]" aria-hidden>
                =
              </p>
              <div className="inline-flex flex-col items-center gap-1">
                <p className="max-w-xs text-xs font-medium leading-snug text-[#006591] sm:text-sm">
                  {t("public.partnerPage.earnFormulaYourAttempts")}
                </p>
                <span className="h-px w-full min-w-[12rem] bg-[#89ceff]" aria-hidden />
                <p className="max-w-xs text-xs font-medium leading-snug text-[#3e4850] sm:text-sm">
                  {t("public.partnerPage.earnFormulaTotalAttempts")}
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#0b1c30]">
                × {t("public.partnerPage.earnFormulaPool")}
              </p>
            </div>
          </div>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Practical example */}
            <div className="space-y-4">
              <div>
                <h3 className="font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight text-[#0b1c30]">
                  {t("public.partnerPage.earnExampleTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3e4850]">
                  {t("public.partnerPage.earnExampleIntro")}
                </p>
              </div>

              <ul className="space-y-2.5 rounded-2xl border border-[#d3e4fe] bg-white p-4">
                {[
                  {
                    label: t("public.partnerPage.earnExampleTotalLabel"),
                    value: t("public.partnerPage.earnExampleTotalValue"),
                  },
                  {
                    label: t("public.partnerPage.earnExamplePoolLabel"),
                    value: t("public.partnerPage.earnExamplePoolValue"),
                  },
                  {
                    label: t("public.partnerPage.earnExampleCommissionLabel"),
                    value: t("public.partnerPage.earnExampleCommissionValue"),
                  },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#e5eeff] pb-2.5 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-[#3e4850]">{row.label}</span>
                    <span className="font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30]">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-[#89ceff]/50 bg-[#f0f9ff] p-4">
                <h4 className="font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30]">
                  {t("public.partnerPage.earnActivityTitle")}
                </h4>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex flex-wrap justify-between gap-2">
                    <span className="text-[#3e4850]">{t("public.partnerPage.earnActivityTotalLabel")}</span>
                    <span className="font-bold text-[#0b1c30]">
                      {t("public.partnerPage.earnActivityTotalValue")}
                    </span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-2">
                    <span className="text-[#3e4850]">{t("public.partnerPage.earnActivityYoursLabel")}</span>
                    <span className="font-bold text-[#006591]">
                      {t("public.partnerPage.earnActivityYoursValue")}
                    </span>
                  </li>
                </ul>
              </div>

              <div
                className="rounded-2xl px-5 py-4 text-white"
                style={{ background: "linear-gradient(135deg, #006591 0%, #0ea5e9 100%)" }}
              >
                <p className="text-xs font-medium text-white/80">
                  {t("public.partnerPage.earnCalcTitle")}
                </p>
                <p className="mt-1 font-[family-name:var(--font-outfit)] text-sm font-semibold sm:text-base">
                  {t("public.partnerPage.earnCalcEquation")}
                </p>
                <p className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight">
                  {t("public.partnerPage.earnCalcResultValue")}
                </p>
                <p className="text-xs text-white/75">{t("public.partnerPage.earnCalcResultLabel")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <DashboardMockup
                alt={t("public.partnerPage.dashboardImageAlt")}
                earningsLabel={t("public.partnerPage.dashboardEarningsLabel")}
                earningsValue={t("public.partnerPage.dashboardEarningsValue")}
                viewsLabel={t("public.partnerPage.dashboardViewsLabel")}
                attemptsLabel={t("public.partnerPage.dashboardAttemptsLabel")}
              />

              <ol className="relative space-y-0 rounded-2xl border border-[#d3e4fe] bg-white p-5">
                {steps.map((step, index) => (
                  <li key={step.n} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < steps.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute left-[15px] top-9 h-[calc(100%-1.25rem)] w-0.5 bg-[#89ceff]"
                      />
                    ) : null}
                    <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0ea5e9] font-[family-name:var(--font-outfit)] text-sm font-bold text-white">
                      {step.n}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="font-[family-name:var(--font-outfit)] text-[15px] font-bold text-[#0b1c30]">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#3e4850]">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Highlights */}
          <div className="mt-10 space-y-4">
            <article className="rounded-2xl border border-[#89ceff]/50 bg-[#e0f2fe]/60 p-5 sm:p-6">
              <h3 className="font-[family-name:var(--font-outfit)] text-base font-bold text-[#0b1c30]">
                {t("public.partnerPage.earnHighlightTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#0b1c30] sm:text-base">
                “{t("public.partnerPage.earnHighlightQuote")}”
              </p>
            </article>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-[#d3e4fe] bg-white p-5 shadow-[0_4px_12px_rgba(11,28,48,0.05)]">
                <h3 className="font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30] sm:text-base">
                  {t("public.partnerPage.earnFairTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3e4850]">
                  {t("public.partnerPage.earnFairDesc")}
                </p>
              </article>
              <article className="rounded-2xl border border-[#d3e4fe] bg-white p-5 shadow-[0_4px_12px_rgba(11,28,48,0.05)]">
                <h3 className="font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30] sm:text-base">
                  {t("public.partnerPage.earnGrowthTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3e4850]">
                  {t("public.partnerPage.earnGrowthDesc")}
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Mid-page CTA banner */}
        <section className="px-4 sm:px-6">
          <div
            className="mx-auto max-w-[1200px] rounded-2xl px-6 py-12 text-center sm:px-10 sm:py-14"
            style={{ background: "linear-gradient(135deg, #006591 0%, #0b4f73 55%, #213145 100%)" }}
          >
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t("public.partnerPage.bannerTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              {t("public.partnerPage.bannerSubtitle")}
            </p>
            <div className="mt-7 flex flex-col items-center gap-3">
              <Button
                asChild
                className="h-12 rounded-xl bg-white px-6 font-semibold text-[#006591] hover:bg-white/90"
              >
                <Link href="/teacher/register">
                  {t("public.partnerPage.ctaTeacher")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Link
                href="/contact?subject=teacher"
                className="text-sm font-medium text-white/90 underline underline-offset-4 hover:text-white"
              >
                {t("public.partnerPage.bannerContact")}
              </Link>
            </div>
          </div>
        </section>

        {/* Elevate + form */}
        <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight sm:text-3xl">
              {t("public.partnerPage.elevateTitle")}
            </h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: DS.muted }}>
              {t("public.partnerPage.elevateIntro")}
            </p>
            <p className="mt-3 rounded-xl border border-[#89ceff]/50 bg-[#e0f2fe]/70 px-4 py-3 text-sm font-medium leading-relaxed text-[#0b1c30]">
              {t("public.partnerPage.elevateCustomNote")}
            </p>
          </div>

          <div className="mt-8">
            <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-[#0b1c30] sm:text-xl">
              {t("public.partnerPage.elevatePillarsTitle")}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {elevatePillars.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[#d3e4fe] bg-white p-5 shadow-[0_4px_12px_rgba(11,28,48,0.05)]"
                >
                  <span className="mb-3 flex size-9 items-center justify-center rounded-full bg-[#e0f2fe] text-[#0ea5e9]">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <h4 className="font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30]">
                    {item.title}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#3e4850]">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-[#0b1c30] sm:text-xl">
              {t("public.partnerPage.elevateFeaturesTitle")}
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {elevateFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className="flex gap-3 rounded-2xl border border-[#d3e4fe] bg-white p-4 shadow-[0_4px_12px_rgba(11,28,48,0.05)] sm:p-5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#006591]">
                    <feature.icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-[family-name:var(--font-outfit)] text-sm font-bold text-[#0b1c30] sm:text-[15px]">
                      {feature.title}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-[#3e4850]">{feature.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex h-full flex-col justify-center rounded-2xl border border-[#89ceff]/40 bg-[#f0f9ff] p-6 sm:p-8">
              <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold leading-snug text-[#0b1c30] sm:text-xl">
                {t("public.partnerPage.elevateCtaTitle")}
              </h3>
              <Link
                href="/contact?subject=teacher"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-[#0ea5e9] px-4 py-2.5 font-[family-name:var(--font-outfit)] text-sm font-semibold text-white transition hover:bg-[#0284c7]"
              >
                <Phone className="size-4" aria-hidden />
                {t("public.partnerPage.elevateCtaContact")}
              </Link>
            </div>
            <PartnerInquiryForm />
          </div>
        </section>
      </main>
    </PublicQuizShell>
  );
}
