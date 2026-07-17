"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  MapPin,
  Phone,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicQuizCard } from "@/components/quiz/public-quiz-card";
import { KadaimaLoader } from "@/components/site/kadaima-loader";
import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import {
  ensureGuestSessionId,
  getOrCreateGuestLead,
  saveGuestLead,
} from "@/lib/guest-session";
import { cn } from "@/lib/utils";
import { localize, mediaUrl, type LocalizedText } from "@/types/quiz";
import { siWhatsapp } from "simple-icons";

const NAVY = "#005a7d";
const BLUE = "#1e88e5";
const PAGE_SIZE = 6;

const SECTION_IDS = ["hero", "classes", "quizzes", "about", "contact"] as const;
type SectionId = (typeof SECTION_IDS)[number];

interface PageLayout {
  sections: Array<{ id: SectionId; visible: boolean }>;
}

const DEFAULT_PAGE_LAYOUT: PageLayout = {
  sections: SECTION_IDS.map((id) => ({ id, visible: true })),
};

function resolvePageLayout(
  raw: { sections: Array<{ id: string; visible: boolean }> } | null | undefined,
): PageLayout {
  if (!raw?.sections?.length) return DEFAULT_PAGE_LAYOUT;
  const seen = new Set<string>();
  const sections: Array<{ id: SectionId; visible: boolean }> = [];
  for (const s of raw.sections) {
    if (!SECTION_IDS.includes(s.id as SectionId) || seen.has(s.id)) continue;
    seen.add(s.id);
    sections.push({ id: s.id as SectionId, visible: Boolean(s.visible) });
  }
  for (const id of SECTION_IDS) {
    if (!seen.has(id)) sections.push({ id, visible: true });
  }
  return { sections };
}

interface TeacherProfile {
  slug: string;
  displayName: string;
  title: string | null;
  description: string | null;
  aboutText?: string | null;
  contactText?: string | null;
  contactPhone?: string | null;
  contactWhatsappUrl?: string | null;
  contactAddress?: string | null;
  sideBannerUrl: string | null;
  pageLayout?: {
    sections: Array<{ id: string; visible: boolean }>;
  } | null;
  banners: Array<{
    id: string;
    imageUrl: string;
    linkUrl: string | null;
    title: string | null;
    subtitle?: string | null;
    ctaLabel?: string | null;
  }>;
  classes: Array<{
    id: string;
    title: string;
    description: string | null;
    scheduleTime?: string | null;
    location?: string | null;
    classDate?: string | null;
    feeLabel?: string | null;
    whatsappGroupUrl?: string | null;
  }>;
  posters?: Array<{
    id: string;
    imageUrl: string;
    linkUrl: string | null;
    title: string | null;
    placement: "TOP" | "MIDDLE" | "FOOTER" | "SIDE" | "RIGHT";
  }>;
}

function PosterStrip({
  posters,
  variant = "wide",
}: {
  posters: NonNullable<TeacherProfile["posters"]>;
  /** wide = full-width promo; side = tall narrow column banner */
  variant?: "wide" | "side";
}) {
  if (!posters.length) return null;
  const isSide = variant === "side";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3",
        !isSide && "mx-auto max-w-6xl px-3 sm:px-4 md:px-6",
      )}
    >
      {posters.map((p) => {
        const src = mediaUrl(p.imageUrl, APP_CONFIG.apiUrl);
        if (!src) return null;
        const frame = (
          <div
            className={cn(
              "overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80",
              isSide && "w-full",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={p.title || "Banner"}
              className={cn(
                "w-full",
                isSide
                  ? // Tall narrow sidebar poster (portrait)
                    "aspect-[3/4] h-auto max-h-[min(75vh,760px)] object-cover object-center"
                  : "max-h-48 object-cover sm:max-h-56 md:max-h-64",
              )}
            />
          </div>
        );
        return p.linkUrl ? (
          <a
            key={p.id}
            href={p.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="block transition hover:opacity-95"
          >
            {frame}
          </a>
        ) : (
          <div key={p.id}>{frame}</div>
        );
      })}
    </div>
  );
}

interface TeacherPageQuiz {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  coverImageUrl?: string | null;
  durationMinutes: number;
  requiresUnlock?: boolean;
  unlocked?: boolean;
  priceLkr?: number | null;
  _count: { questions: number; attempts?: number };
  course: { id: string; title: LocalizedText | string };
}

function plainFromHtml(html: string | null | undefined) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function initialLetter(text: string) {
  const t = text.trim();
  return t ? t[0]!.toUpperCase() : "Q";
}

function LetterThumb({
  src,
  letter,
  className,
  letterClassName,
}: {
  src: string | null | undefined;
  letter: string;
  className?: string;
  letterClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-[#e8f3fc]", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center font-semibold tracking-tight",
            letterClassName,
          )}
          style={{ color: NAVY }}
          aria-hidden
        >
          {letter}
        </div>
      )}
    </div>
  );
}

function ContactSection({
  slug,
  phone,
  whatsapp,
  address,
  message,
}: {
  slug: string;
  phone: string;
  whatsapp: string;
  address: string;
  message: string;
}) {
  const [studentName, setStudentName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const lead = getOrCreateGuestLead();
    if (!lead) return;
    if (lead.studentName) setStudentName(lead.studentName);
    if (lead.mobileNumber) setMobileNumber(lead.mobileNumber);
    if (lead.email) setEmail(lead.email);
  }, []);

  const submitInquiry = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const name = studentName.trim();
    const mobile = mobileNumber.trim().replace(/\s+/g, "");
    const body = inquiryMessage.trim();
    if (name.length < 2) {
      setFormError("Please enter your name.");
      return;
    }
    if (!/^07\d{8}$/.test(mobile)) {
      setFormError("Enter a valid mobile number (07XXXXXXXX).");
      return;
    }
    if (body.length < 5) {
      setFormError("Please write a short message for the teacher.");
      return;
    }

    setSending(true);
    try {
      const guestSessionId = ensureGuestSessionId();
      const existing = getOrCreateGuestLead();
      saveGuestLead({
        guestSessionId,
        studentName: name,
        school: existing?.school || "—",
        mobileNumber: mobile,
        email: email.trim() || undefined,
      });

      let userId = "";
      const token = getClientCookie("session_token");
      if (token) {
        try {
          const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
          );
          userId = payload?.sub || "";
        } catch {
          /* ignore */
        }
      }

      const res = await fetch(
        `${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}/inquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: name,
            mobileNumber: mobile,
            email: email.trim() || undefined,
            message: body,
            guestSessionId,
            userId: userId || undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Could not send inquiry",
        );
      }
      setSent(true);
      setInquiryMessage("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send inquiry");
    } finally {
      setSending(false);
    }
  };

  const infoItems = [
    phone
      ? {
          key: "phone",
          icon: <Phone className="size-4" />,
          label: "Mobile",
          content: (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="text-slate-600 underline-offset-2 hover:underline"
            >
              {phone}
            </a>
          ),
          tone: "navy" as const,
        }
      : null,
    whatsapp
      ? {
          key: "whatsapp",
          icon: <SimpleIcon icon={siWhatsapp} className="size-4 fill-current" />,
          label: "WhatsApp",
          content: (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline-offset-2 hover:underline"
            >
              Chat on WhatsApp
            </a>
          ),
          tone: "green" as const,
        }
      : null,
    address
      ? {
          key: "address",
          icon: <MapPin className="size-4" />,
          label: "Class location",
          content: <p className="whitespace-pre-wrap text-slate-600">{address}</p>,
          tone: "navy" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: ReactNode;
    label: string;
    content: ReactNode;
    tone: "navy" | "green";
  }>;

  return (
    <section
      id="contact"
      className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 md:scroll-mt-24 md:p-6"
    >
      <h3 className="font-semibold text-base tracking-tight sm:text-lg" style={{ color: NAVY }}>
        Contact
      </h3>

      {infoItems.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {infoItems.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-sm"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                  item.tone === "green" && "bg-emerald-50 text-emerald-600",
                )}
                style={
                  item.tone === "navy"
                    ? { backgroundColor: `${NAVY}14`, color: NAVY }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{item.label}</p>
                <div className="mt-0.5">{item.content}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {message ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
          {message}
        </p>
      ) : null}

      <div className="mt-5 border-t border-slate-100 pt-5">
        <h4 className="font-semibold text-sm" style={{ color: NAVY }}>
          Ask the teacher
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Send an inquiry for class details, fees, or enrollment — the teacher will see your ask.
        </p>

        {sent ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Your message was sent. The teacher will get back to you soon.
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={(e) => void submitInquiry(e)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-medium text-xs text-slate-700">Your name</label>
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Saman Perera"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-xs text-slate-700">Mobile</label>
                <Input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="0771234567"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-xs text-slate-700">Email (optional)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-xs text-slate-700">Your question</label>
              <Textarea
                rows={4}
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                placeholder="I would like more details about your classes…"
                required
              />
            </div>
            {formError ? <p className="text-xs text-red-600">{formError}</p> : null}
            <Button type="submit" variant="brand" disabled={sending}>
              {sending ? <Spinner className="size-4" /> : null}
              Send inquiry
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export function TeacherLandingPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [quizzes, setQuizzes] = useState<TeacherPageQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeNav, setActiveNav] = useState("attempts");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const guestSessionId = ensureGuestSessionId();
    const token = getClientCookie("session_token");
    let userId = "";
    if (token) {
      try {
        const part = token.split(".")[1] || "";
        const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        userId = payload?.sub || "";
      } catch {
        /* ignore */
      }
    }

    const qs = new URLSearchParams();
    if (guestSessionId) qs.set("guestSessionId", guestSessionId);
    if (userId) qs.set("userId", userId);

    Promise.all([
      fetch(`${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}`).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Teacher page not found");
        }
        return res.json() as Promise<TeacherProfile>;
      }),
      fetch(
        `${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}/quizzes?${qs.toString()}`,
      ).then(async (res) => {
        if (!res.ok) return [] as TeacherPageQuiz[];
        return res.json() as Promise<TeacherPageQuiz[]>;
      }),
    ])
      .then(([p, q]) => {
        if (cancelled) return;
        setProfile(p);
        setQuizzes(q);
        setOpenClassId(p.classes[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load page");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const banners = profile?.banners ?? [];
  const activeBanner = banners[bannerIndex] ?? null;
  const bannerSrc = activeBanner
    ? mediaUrl(activeBanner.imageUrl, APP_CONFIG.apiUrl)
    : null;

  useEffect(() => {
    setBannerFailed(false);
  }, [bannerIndex, activeBanner?.id]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = window.setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [banners.length]);

  const totalPages = Math.max(1, Math.ceil(quizzes.length / PAGE_SIZE));
  const pageQuizzes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return quizzes.slice(start, start + PAGE_SIZE);
  }, [quizzes, page]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  if (loading) {
    return (
      <KadaimaLoader
        variant="page"
        label={t("public.loadingSite")}
        className="min-h-dvh"
      />
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#eef3f7] px-6 text-center">
        <h1 className="font-semibold text-2xl text-slate-900">Page not available</h1>
        <p className="max-w-md text-sm text-slate-500">
          {error || "This teacher page is not published yet."}
        </p>
        <Button asChild variant="brand">
          <Link href="/">Back to Kadaima</Link>
        </Button>
      </div>
    );
  }

  const layout = resolvePageLayout(profile.pageLayout);
  const show = (id: SectionId) =>
    layout.sections.find((s) => s.id === id)?.visible !== false;
  const showClasses = show("classes");
  const leftPosters = (profile.posters ?? []).filter((p) => p.placement === "SIDE");
  const rightPosters = (profile.posters ?? []).filter((p) => p.placement === "RIGHT");
  const showLeftColumn = showClasses || leftPosters.length > 0;
  const showRightColumn = rightPosters.length > 0;
  const mainSectionOrder = layout.sections
    .filter((s) => s.visible && s.id !== "classes")
    .map((s) => s.id);

  const navItems = [
    { id: "attempts", label: "My Attempts", href: "/quiz/my-attempts" },
    { id: "progress", label: "In Progress", href: "/quiz/in-progress" },
    ...(show("about") ? [{ id: "about", label: "About", href: "#about" }] : []),
    ...(show("contact") ? [{ id: "contact", label: "Contact", href: "#contact" }] : []),
  ] as const;

  const heroTitle = profile.title || activeBanner?.title || "Empowering Future Scholars";
  const heroSubtitle =
    profile.description ||
    activeBanner?.subtitle ||
    "Mastering your syllabus requires more than reading textbooks—it requires consistent practice and strategic revision.";

  const leftColumn = showLeftColumn ? (
    <div className="order-2 flex h-fit flex-col gap-4 md:order-1 md:sticky md:top-[4.5rem]">
      {leftPosters.length ? <PosterStrip posters={leftPosters} variant="side" /> : null}
      {showClasses ? (
        <aside className="rounded-2xl border border-[#cfe3f3] bg-white p-3.5 shadow-sm sm:p-4">
          <h2
            className="mb-3 font-semibold text-base tracking-tight sm:text-lg"
            style={{ color: BLUE }}
          >
            Upcoming Class
          </h2>
          {profile.classes.length === 0 ? (
            <p className="text-sm leading-relaxed text-slate-500">No classes listed yet.</p>
          ) : (
            <div className="space-y-2.5">
              {profile.classes.map((c) => {
                const open = openClassId === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "overflow-hidden rounded-xl border transition",
                      open ? "border-transparent" : "border-[#b7d4ef]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenClassId(open ? null : c.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold tracking-tight transition sm:px-3.5 sm:py-3",
                        open ? "text-white" : "bg-white hover:bg-[#f3f9ff]",
                      )}
                      style={open ? { background: BLUE, color: "#fff" } : { color: BLUE }}
                    >
                      <span className="min-w-0 leading-snug">{c.title}</span>
                      <ChevronDown
                        className={cn("size-4 shrink-0 transition", open && "rotate-180")}
                      />
                    </button>
                    {open ? (
                      <div className="space-y-2.5 border border-t-0 border-[#d7e8f7] bg-white px-3 py-3 sm:px-3.5">
                        {c.description ? (
                          <p className="text-sm leading-relaxed text-slate-500">{c.description}</p>
                        ) : null}
                        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 md:grid-cols-1">
                          {c.scheduleTime ? (
                            <MetaPill icon={Clock3} text={c.scheduleTime} />
                          ) : null}
                          {c.location ? <MetaPill icon={MapPin} text={c.location} /> : null}
                          {c.classDate ? (
                            <MetaPill icon={CalendarDays} text={c.classDate} />
                          ) : null}
                          {c.feeLabel ? <MetaPill icon={Tag} text={c.feeLabel} /> : null}
                        </div>
                        {c.whatsappGroupUrl ? (
                          <a
                            href={c.whatsappGroupUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1ebe57]"
                          >
                            <SimpleIcon icon={siWhatsapp} className="size-4 fill-white" />
                            Join WhatsApp group
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      ) : null}
    </div>
  ) : null;

  const heroBlock = (
    <div className="relative overflow-hidden rounded-xl bg-slate-800 shadow-md sm:rounded-2xl">
      <div className="relative aspect-[4/3] min-h-[200px] sm:aspect-[16/9] sm:min-h-[240px] md:aspect-[21/9] md:min-h-[260px] lg:min-h-[280px]">
        {bannerSrc && !bannerFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerSrc}
            alt={activeBanner?.title || "Banner"}
            className="absolute inset-0 size-full object-cover"
            onError={() => setBannerFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0a4a66] to-[#1e88e5]">
            <span className="font-semibold text-6xl tracking-tight text-white/25 sm:text-7xl md:text-8xl">
              {initialLetter(activeBanner?.title || profile.displayName || profile.title || "K")}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/20 sm:bg-gradient-to-r sm:from-black/70 sm:via-black/45 sm:to-black/25" />
        <div className="absolute inset-0 flex flex-col justify-end px-4 py-5 sm:justify-center sm:px-8 sm:py-8 md:px-12 md:py-10">
          <h3 className="max-w-xl font-semibold text-xl leading-tight tracking-tight text-white sm:text-2xl md:text-3xl lg:text-4xl">
            {heroTitle}
          </h3>
          <p className="mt-2 line-clamp-3 max-w-lg text-xs leading-relaxed text-white/90 sm:mt-3 sm:line-clamp-4 sm:text-sm md:text-base">
            {heroSubtitle}
          </p>
          <div className="mt-3 sm:mt-5">
            {activeBanner?.linkUrl ? (
              <a
                href={activeBanner.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold tracking-tight text-white shadow-sm transition hover:opacity-90 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                style={{ background: BLUE }}
              >
                {activeBanner.ctaLabel || "Browse Resources"}
                <ChevronRight className="size-3.5 sm:size-4" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  document.getElementById("quizzes")?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold tracking-tight text-white shadow-sm transition hover:opacity-90 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                style={{ background: BLUE }}
              >
                {activeBanner?.ctaLabel || "Browse Resources"}
                <ChevronRight className="size-3.5 sm:size-4" />
              </button>
            )}
          </div>
        </div>
        {banners.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 sm:left-3 sm:size-9"
              onClick={() => setBannerIndex((i) => (i - 1 + banners.length) % banners.length)}
            >
              <ChevronLeft className="size-4 sm:size-5" />
            </button>
            <button
              type="button"
              aria-label="Next banner"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 sm:right-3 sm:size-9"
              onClick={() => setBannerIndex((i) => (i + 1) % banners.length)}
            >
              <ChevronRight className="size-4 sm:size-5" />
            </button>
            <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5 sm:bottom-3">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Go to banner ${i + 1}`}
                  onClick={() => setBannerIndex(i)}
                  className={cn(
                    "size-1.5 rounded-full transition sm:size-2",
                    i === bannerIndex ? "bg-white" : "bg-white/45",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  const quizzesBlock = (
    <>
      <div id="quizzes" className="space-y-3">
        {pageQuizzes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 sm:px-6 sm:py-12">
            No published quizzes yet.
          </div>
        ) : (
          pageQuizzes.map((quiz, i) => {
            const qTitle = localize(quiz.title, locale);
            const desc =
              plainFromHtml(localize(quiz.description, locale)) ||
              localize(quiz.course.title as LocalizedText, locale) ||
              "Practice questions curated for focused revision.";
            const locked = Boolean(quiz.requiresUnlock) && quiz.unlocked !== true;
            return (
              <PublicQuizCard
                key={quiz.id}
                title={qTitle}
                description={desc}
                durationMinutes={quiz.durationMinutes}
                questionCount={quiz._count.questions}
                iconIndex={i}
                isNew={i === 0}
                locked={locked}
                onPrimary={() => router.push(`/quiz/${quiz.id}`)}
              />
            );
          })
        )}
      </div>
      {quizzes.length > PAGE_SIZE ? (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      ) : null}
    </>
  );

  const aboutCopy =
    profile.aboutText?.trim() ||
    profile.description?.trim() ||
    `${profile.displayName} shares practice quizzes and class resources on Kadaima.`;

  const contactPhone = profile.contactPhone?.trim() || "";
  const contactWhatsapp = profile.contactWhatsappUrl?.trim() || "";
  const contactAddress = profile.contactAddress?.trim() || "";
  const contactCopy =
    profile.contactText?.trim() ||
    (!contactPhone && !contactWhatsapp && !contactAddress
      ? "Reach out through your school or institute for class enrollment details. Browse quizzes above to get started."
      : "");

  const aboutBlock = (
    <section
      id="about"
      className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 md:scroll-mt-24 md:p-6"
    >
      <h3 className="font-semibold text-base tracking-tight sm:text-lg" style={{ color: NAVY }}>
        About {profile.displayName}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{aboutCopy}</p>
    </section>
  );

  const contactBlock = (
    <ContactSection
      slug={slug}
      phone={contactPhone}
      whatsapp={contactWhatsapp}
      address={contactAddress}
      message={contactCopy}
    />
  );

  const mainBlocks: Record<Exclude<SectionId, "classes">, ReactNode> = {
    hero: heroBlock,
    quizzes: quizzesBlock,
    about: aboutBlock,
    contact: contactBlock,
  };

  const allPosters = profile.posters ?? [];
  const topPosters = allPosters.filter((p) => p.placement === "TOP");
  const middlePosters = allPosters.filter((p) => p.placement === "MIDDLE");
  const footerPosters = allPosters.filter((p) => p.placement === "FOOTER");

  const orderedMain = mainSectionOrder.flatMap((id, index) => {
    const nodes: ReactNode[] = [
      <div key={id}>{mainBlocks[id as Exclude<SectionId, "classes">]}</div>,
    ];
    // Insert middle posters after hero, or after the first section if hero is hidden
    const afterHero = id === "hero";
    const afterFirst = index === 0 && !mainSectionOrder.includes("hero");
    if ((afterHero || afterFirst) && middlePosters.length) {
      nodes.push(
        <div key="middle-posters" className="pt-1">
          <PosterStrip posters={middlePosters} />
        </div>,
      );
    }
    return nodes;
  });

  return (
    <div className="flex min-h-dvh flex-col bg-[#eef3f7] font-sans text-slate-900 antialiased">
      <header className="sticky top-0 z-30 shadow-md" style={{ background: NAVY }}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 md:h-16 md:gap-4 md:px-6">
          <p className="min-w-0 flex-1 truncate font-semibold text-sm tracking-tight text-white sm:text-base md:max-w-[220px] md:flex-none md:text-lg lg:max-w-xs">
            {profile.displayName}
          </p>

          <nav className="hidden items-center gap-4 lg:gap-7 md:flex">
            {navItems.map((item) => {
              const active = activeNav === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setActiveNav(item.id)}
                  className={cn(
                    "relative whitespace-nowrap pb-1 text-xs font-medium tracking-tight text-white/90 transition hover:text-white lg:text-sm",
                    active &&
                      "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/70 px-2.5 py-1.5 text-sm font-medium tracking-tight text-white transition hover:bg-white/10 sm:px-3"
          >
            <Home className="size-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      {topPosters.length ? (
        <div className="pt-4 sm:pt-5">
          <PosterStrip posters={topPosters} />
        </div>
      ) : null}

      <main
        className={cn(
          "mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-3 py-4 sm:gap-5 sm:px-4 sm:py-5 md:gap-5 md:px-6 md:py-6 lg:gap-6 lg:py-7",
          showLeftColumn &&
            showRightColumn &&
            "md:grid-cols-[200px_minmax(0,1fr)_200px] lg:grid-cols-[240px_minmax(0,1fr)_240px]",
          showLeftColumn &&
            !showRightColumn &&
            "md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]",
          !showLeftColumn &&
            showRightColumn &&
            "md:grid-cols-[minmax(0,1fr)_240px] lg:grid-cols-[minmax(0,1fr)_280px]",
        )}
      >
        {leftColumn}
        <section
          className={cn(
            "min-w-0 space-y-4 sm:space-y-5",
            (showLeftColumn || showRightColumn) && "order-1 md:order-2",
          )}
        >
          {orderedMain}
        </section>
        {showRightColumn ? (
          <div className="order-3 flex h-fit flex-col gap-4 md:sticky md:top-[4.5rem]">
            <PosterStrip posters={rightPosters} variant="side" />
          </div>
        ) : null}
      </main>

      {footerPosters.length ? (
        <div className="pb-2 pt-2">
          <PosterStrip posters={footerPosters} />
        </div>
      ) : null}

      <footer className="mt-6 border-t border-slate-200 bg-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:mt-8 md:pb-0">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-3 px-3 py-5 sm:px-4 sm:py-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4 md:px-6 md:py-5">
          <Link href="/" className="flex justify-center md:justify-start">
            <BrandLogo className="h-8 w-auto sm:h-9 md:h-10" />
          </Link>
          <p className="text-center text-xs font-medium text-slate-500 sm:text-sm">
            © {new Date().getFullYear()} Kadaima Education. All rights reserved.
          </p>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium tracking-tight sm:gap-x-5 sm:text-sm md:justify-end"
            style={{ color: NAVY }}
          >
            <Link href="/privacy-policy" className="transition hover:opacity-80">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:opacity-80">
              Terms of Service
            </Link>
            <Link href="#contact" className="transition hover:opacity-80">
              Contact Support
            </Link>
          </nav>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur sm:px-2 sm:pt-2 md:hidden">
        <div
          className="mx-auto grid max-w-md gap-0.5 sm:gap-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setActiveNav(item.id)}
              className={cn(
                "rounded-lg px-0.5 py-2 text-center text-[9px] font-medium leading-tight sm:px-1 sm:text-[10px]",
                activeNav === item.id ? "text-white" : "text-slate-500",
              )}
              style={activeNav === item.id ? { background: NAVY } : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function MetaPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full bg-[#eaf4fc] px-2.5 py-1.5 text-[11px] font-medium tracking-tight text-[#0b5f86] sm:px-3 sm:text-xs">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#d5ebfa] text-[#0b5f86] sm:size-6">
        <Icon className="size-3 sm:size-3.5" />
      </span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-white disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "flex size-9 items-center justify-center rounded-md text-sm font-semibold transition",
            p === page ? "text-white shadow-sm" : "text-slate-600 hover:bg-white",
          )}
          style={p === page ? { background: BLUE } : undefined}
        >
          {p}
        </button>
      ))}
      {totalPages > 5 ? <span className="px-1 text-slate-400">…</span> : null}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-white disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
