"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  GripVertical,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";
import { hideGlobalLoader, showGlobalLoader } from "@/stores/global-loader-store";
import { mediaUrl, type LocalizedText } from "@/types/quiz";

const SETTINGS_TABS = [
  { id: "branding", label: "Branding" },
  { id: "carousel", label: "Carousel" },
  { id: "classes", label: "Classes" },
  { id: "quizzes", label: "Quizzes" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "asks", label: "Student asks" },
  { id: "layout", label: "Layout" },
] as const;

type InquiryStatus = "NEW" | "READ" | "ARCHIVED";

interface InquiryItem {
  id: string;
  studentName: string;
  mobileNumber: string;
  email: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

const SECTION_IDS = ["hero", "classes", "quizzes", "about", "contact"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero carousel",
  classes: "Upcoming Class",
  quizzes: "Quizzes",
  about: "About",
  contact: "Contact",
};

const DEFAULT_PAGE_LAYOUT: PageLayout = {
  sections: SECTION_IDS.map((id) => ({ id, visible: true })),
};

function formatTimeLabel(value: string) {
  if (!value) return "";
  const [hoursRaw, minutes = "00"] = value.split(":");
  const hours = Number(hoursRaw);
  if (Number.isNaN(hours)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

function formatScheduleLabel(start: string, end: string) {
  if (!start && !end) return null;
  if (start && end) return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
  return formatTimeLabel(start || end);
}

function formatFeeLabel(amount: string) {
  const cleaned = amount.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  if (!cleaned) return null;
  const [whole, fraction] = cleaned.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = fraction !== undefined ? `${withCommas}.${fraction.slice(0, 2)}` : withCommas;
  return `LKR ${formatted}`;
}

function normalizePageLayout(raw: PageLayout | null | undefined): PageLayout {
  if (!raw?.sections?.length) return { ...DEFAULT_PAGE_LAYOUT, sections: [...DEFAULT_PAGE_LAYOUT.sections] };
  const seen = new Set<string>();
  const sections: PageSection[] = [];
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

function ClassDatePicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-empty={!value}
          className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
        >
          {value ? format(value, "MMM d, yyyy") : <span>Pick a date</span>}
          <CalendarIcon className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(selected) => {
            onChange(selected);
            setOpen(false);
          }}
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  );
}

interface PageSection {
  id: SectionId;
  visible: boolean;
}

interface PageLayout {
  sections: PageSection[];
}

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  scheduleTime?: string | null;
  location?: string | null;
  classDate?: string | null;
  feeLabel?: string | null;
  whatsappGroupUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface MyQuiz {
  id: string;
  title: LocalizedText | string;
  status: string;
  coverImageUrl: string | null;
}

type QuizVisibility = "ALL" | "SELECTED";

type PosterPlacement = "TOP" | "MIDDLE" | "FOOTER" | "SIDE" | "RIGHT";

interface PosterItem {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  placement: PosterPlacement;
  sortOrder: number;
  isActive: boolean;
}

interface Profile {
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
  isPublic: boolean;
  quizVisibility: QuizVisibility;
  selectedQuizIds: string[];
  pageLayout?: PageLayout | null;
  myQuizzes: MyQuiz[];
  banners: Banner[];
  classes: ClassItem[];
  posters?: PosterItem[];
}

const PLACEMENT_LABELS: Record<PosterPlacement, string> = {
  TOP: "Top (below header)",
  MIDDLE: "Middle (in content)",
  FOOTER: "Footer (above site footer)",
  SIDE: "Left side",
  RIGHT: "Right side",
};

const PLACEMENT_RESOLUTION: Record<PosterPlacement, string> = {
  TOP: "1200 × 320 px (≈ 15:4) — wide strip",
  MIDDLE: "1200 × 400 px (≈ 3:1) — wide content banner",
  FOOTER: "1200 × 280 px (≈ 4:1) — wide strip",
  SIDE: "480 × 720 px (3:4 portrait) — tall left column",
  RIGHT: "480 × 720 px (3:4 portrait) — tall right column",
};

function quizTitle(title: LocalizedText | string) {
  if (typeof title === "string") return title;
  return title.en || title.si || title.ta || "Untitled quiz";
}

function authHeaders(json = true) {
  const token = getClientCookie("session_token");
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export function TeacherPageSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("branding");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [contactText, setContactText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsappUrl, setContactWhatsappUrl] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [quizVisibility, setQuizVisibility] = useState<QuizVisibility>("ALL");
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [pageLayout, setPageLayout] = useState<PageLayout>(DEFAULT_PAGE_LAYOUT);
  const [posterPlacement, setPosterPlacement] = useState<PosterPlacement>("MIDDLE");
  const [posterTitle, setPosterTitle] = useState("");
  const [posterLink, setPosterLink] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [classStartTime, setClassStartTime] = useState("");
  const [classEndTime, setClassEndTime] = useState("");
  const [classLocation, setClassLocation] = useState("");
  const [classDate, setClassDate] = useState<Date | undefined>(undefined);
  const [classFee, setClassFee] = useState("");
  const [classWhatsapp, setClassWhatsapp] = useState("");
  const [bannerCta, setBannerCta] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const applyProfile = (data: Profile) => {
    setProfile(data);
    setSlug(data.slug);
    setDisplayName(data.displayName);
    setTitle(data.title || "");
    setDescription(data.description || "");
    setAboutText(data.aboutText || "");
    setContactText(data.contactText || "");
    setContactPhone(data.contactPhone || "");
    setContactWhatsappUrl(data.contactWhatsappUrl || "");
    setContactAddress(data.contactAddress || "");
    setIsPublic(data.isPublic);
    setQuizVisibility(data.quizVisibility || "ALL");
    setSelectedQuizIds(data.selectedQuizIds || []);
    setPageLayout(normalizePageLayout(data.pageLayout));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/profile`, {
        headers: authHeaders(false),
      });
      if (!res.ok) throw new Error("Failed to load teacher page settings");
      const data: Profile = await res.json();
      applyProfile(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadInquiries = useCallback(async () => {
    setLoadingInquiries(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/inquiries`, {
        headers: authHeaders(false),
      });
      if (!res.ok) throw new Error("Failed to load student asks");
      const data: InquiryItem[] = await res.json();
      setInquiries(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load asks");
    } finally {
      setLoadingInquiries(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "asks") void loadInquiries();
  }, [activeTab, loadInquiries]);

  const updateInquiryStatus = async (id: string, status: InquiryStatus) => {
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/inquiries/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Could not update ask");
      return;
    }
    const updated: InquiryItem = await res.json();
    setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
    toast.success(status === "READ" ? "Marked as read" : "Ask archived");
  };

  const toggleQuiz = (quizId: string, checked: boolean) => {
    setSelectedQuizIds((prev) =>
      checked ? [...new Set([...prev, quizId])] : prev.filter((id) => id !== quizId),
    );
  };

  const putProfile = async (body: Record<string, unknown>) => {
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/profile`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        Array.isArray(data.message) ? data.message.join(", ") : data.message || "Save failed",
      );
    }
    applyProfile(data);
    return data as Profile;
  };

  const saveAll = async () => {
    if (!slug.trim() || !displayName.trim()) {
      toast.error("Slug and display name are required.");
      setActiveTab("branding");
      return;
    }
    if (quizVisibility === "SELECTED" && selectedQuizIds.length === 0) {
      toast.error("Select at least one quiz, or choose “All my quizzes”.");
      setActiveTab("quizzes");
      return;
    }
    setSaving(true);
    try {
      const data = await putProfile({
        slug,
        displayName,
        isPublic,
        title,
        description,
        aboutText: aboutText.trim() || null,
        contactText: contactText.trim() || null,
        contactPhone: contactPhone.trim() || null,
        contactWhatsappUrl: contactWhatsappUrl.trim() || null,
        contactAddress: contactAddress.trim() || null,
        quizVisibility,
        selectedQuizIds,
        pageLayout,
      });
      toast.success(
        data.isPublic
          ? "All changes saved — your public page is live"
          : "All changes saved (page not published yet)",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, onUrl: (url: string) => void | Promise<void>) => {
    setUploading(true);
    setUploadingName(file.name);
    showGlobalLoader(`Uploading “${file.name}”… don’t close this page`);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getClientCookie("session_token")}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message || "Upload failed");
      await onUrl(data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadingName(null);
      hideGlobalLoader();
    }
  };

  const addBannerFromFile = async (file: File) => {
    await uploadImage(file, async (url) => {
      const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/banners`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          imageUrl: url,
          sortOrder: profile?.banners.length ?? 0,
          ctaLabel: bannerCta.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not add banner");
      }
      setBannerCta("");
      await load();
    });
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm("Remove this banner?")) return;
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/banners/${id}`, {
      method: "DELETE",
      headers: authHeaders(false),
    });
    if (!res.ok) {
      toast.error("Could not delete banner");
      return;
    }
    toast.success("Banner removed");
    await load();
  };

  const reorderBanners = async (ids: string[]) => {
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/banners/reorder`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      toast.error("Could not reorder banners");
      return;
    }
    const data = await res.json();
    applyProfile(data);
  };

  const moveBanner = (id: string, dir: -1 | 1) => {
    const list = profile?.banners ?? [];
    const idx = list.findIndex((b) => b.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= list.length) return;
    const ids = list.map((b) => b.id);
    [ids[idx], ids[next]] = [ids[next]!, ids[idx]!];
    void reorderBanners(ids);
  };

  const addClass = async () => {
    if (!classTitle.trim()) {
      toast.error("Class title is required");
      return;
    }
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/classes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title: classTitle.trim(),
        description: classDescription.trim() || null,
        scheduleTime: formatScheduleLabel(classStartTime, classEndTime),
        location: classLocation.trim() || null,
        classDate: classDate ? format(classDate, "MMM d, yyyy") : null,
        feeLabel: formatFeeLabel(classFee),
        whatsappGroupUrl: classWhatsapp.trim() || null,
        sortOrder: profile?.classes.length ?? 0,
      }),
    });
    if (!res.ok) {
      toast.error("Could not add class");
      return;
    }
    setClassTitle("");
    setClassDescription("");
    setClassStartTime("");
    setClassEndTime("");
    setClassLocation("");
    setClassDate(undefined);
    setClassFee("");
    setClassWhatsapp("");
    toast.success("Class added");
    await load();
  };

  const deleteClass = async (id: string) => {
    if (!window.confirm("Remove this class?")) return;
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/classes/${id}`, {
      method: "DELETE",
      headers: authHeaders(false),
    });
    if (!res.ok) {
      toast.error("Could not delete class");
      return;
    }
    toast.success("Class removed");
    await load();
  };

  const reorderClasses = async (ids: string[]) => {
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/classes/reorder`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      toast.error("Could not reorder classes");
      return;
    }
    const data = await res.json();
    applyProfile(data);
  };

  const moveClass = (id: string, dir: -1 | 1) => {
    const list = profile?.classes ?? [];
    const idx = list.findIndex((c) => c.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= list.length) return;
    const ids = list.map((c) => c.id);
    [ids[idx], ids[next]] = [ids[next]!, ids[idx]!];
    void reorderClasses(ids);
  };

  const moveSection = (id: SectionId, dir: -1 | 1) => {
    setPageLayout((prev) => {
      const sections = [...prev.sections];
      const idx = sections.findIndex((s) => s.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= sections.length) return prev;
      [sections[idx], sections[next]] = [sections[next]!, sections[idx]!];
      return { sections };
    });
  };

  const toggleSectionVisible = (id: SectionId, visible: boolean) => {
    setPageLayout((prev) => ({
      sections: prev.sections.map((s) => (s.id === id ? { ...s, visible } : s)),
    }));
  };

  const addPosterFromFile = async (file: File) => {
    await uploadImage(file, async (url) => {
      const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/posters`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          imageUrl: url,
          placement: posterPlacement,
          title: posterTitle.trim() || null,
          linkUrl: posterLink.trim() || null,
          sortOrder: profile?.posters?.length ?? 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not add poster");
      }
      setPosterTitle("");
      setPosterLink("");
      toast.success("Poster banner added");
      await load();
    });
  };

  const deletePoster = async (id: string) => {
    if (!window.confirm("Remove this poster banner?")) return;
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/posters/${id}`, {
      method: "DELETE",
      headers: authHeaders(false),
    });
    if (!res.ok) {
      toast.error("Could not delete poster");
      return;
    }
    toast.success("Poster removed");
    await load();
  };

  const reorderPosters = async (ids: string[]) => {
    const res = await fetch(`${APP_CONFIG.apiUrl}/teachers/me/posters/reorder`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      toast.error("Could not reorder posters");
      return;
    }
    const data = await res.json();
    applyProfile(data);
  };

  const movePoster = (id: string, dir: -1 | 1) => {
    const list = profile?.posters ?? [];
    const idx = list.findIndex((p) => p.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= list.length) return;
    const ids = list.map((p) => p.id);
    [ids[idx], ids[next]] = [ids[next]!, ids[idx]!];
    void reorderPosters(ids);
  };

  const progressItems = useMemo(
    () => [
      {
        id: "branding",
        label: "Branding (name & URL)",
        tab: "branding" as SettingsTabId,
        done: Boolean(slug.trim() && displayName.trim()),
      },
      {
        id: "published",
        label: "Page published",
        tab: "branding" as SettingsTabId,
        done: isPublic,
      },
      {
        id: "hero",
        label: "Hero title & description",
        tab: "carousel" as SettingsTabId,
        done: Boolean(title.trim() && description.trim()),
      },
      {
        id: "banners",
        label: "Carousel image",
        tab: "carousel" as SettingsTabId,
        done: (profile?.banners.length ?? 0) > 0,
      },
      {
        id: "classes",
        label: "Upcoming class",
        tab: "classes" as SettingsTabId,
        done: (profile?.classes.length ?? 0) > 0,
      },
      {
        id: "quizzes",
        label: "Quizzes ready",
        tab: "quizzes" as SettingsTabId,
        done:
          quizVisibility === "ALL" ||
          (quizVisibility === "SELECTED" && selectedQuizIds.length > 0),
      },
      {
        id: "about",
        label: "About section",
        tab: "about" as SettingsTabId,
        done: Boolean(aboutText.trim()),
      },
      {
        id: "contact",
        label: "Contact section",
        tab: "contact" as SettingsTabId,
        done: Boolean(
          contactPhone.trim() ||
            contactWhatsappUrl.trim() ||
            contactAddress.trim() ||
            contactText.trim(),
        ),
      },
      {
        id: "posters",
        label: "Poster banner",
        tab: "layout" as SettingsTabId,
        done: (profile?.posters?.length ?? 0) > 0,
      },
    ],
    [
      slug,
      displayName,
      isPublic,
      title,
      description,
      profile?.banners.length,
      profile?.classes.length,
      profile?.posters?.length,
      quizVisibility,
      selectedQuizIds.length,
      aboutText,
      contactText,
      contactPhone,
      contactWhatsappUrl,
      contactAddress,
    ],
  );

  const doneCount = progressItems.filter((i) => i.done).length;
  const progressPercent = Math.round((doneCount / progressItems.length) * 100);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  const publicPath = `/t/${slug || profile?.slug || ""}`;
  const posters = profile?.posters ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Customize my page</h1>
          <p className="text-muted-foreground text-sm">
            Switch tabs to edit each part. Preview at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{publicPath}</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={publicPath} target="_blank">
              <ExternalLink className="size-4" />
              Open page
            </Link>
          </Button>
          <Button disabled={saving || uploading} onClick={() => void saveAll()}>
            {saving || uploading ? <Spinner className="size-4" /> : null}
            {uploading ? "Uploading…" : "Save all changes"}
          </Button>
        </div>
      </div>

      {uploading ? (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-2 z-30 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
        >
          <Spinner className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div className="min-w-0 space-y-0.5 text-sm leading-relaxed">
            <p className="font-semibold">Uploading file — please don’t close this page</p>
            <p className="truncate text-amber-900/80">
              {uploadingName
                ? `Updating “${uploadingName}”. Keep this tab open until it finishes.`
                : "Your file is still uploading. Keep this tab open until it finishes."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950">
        <Info className="mt-0.5 size-5 shrink-0 text-sky-600" />
        <div className="space-y-1 text-sm leading-relaxed">
          <p className="font-medium">Make your public page stand out</p>
          <p className="text-sky-900/80">
            Complete every section below — branding, carousel, classes, quizzes, About, and Contact —
            so your page looks more attractive to students and parents. A complete, published page
            also helps Google find and list your name when people search for you online.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-1">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle className="text-base">Page completion</CardTitle>
              <CardDescription>
                {doneCount} of {progressItems.length} items filled — keep going to improve your page.
              </CardDescription>
            </div>
            <span className="font-semibold text-sm tabular-nums">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {progressItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(item.tab)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    item.done
                      ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {item.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="size-4 shrink-0" />
                  )}
                  <span className="min-w-0 truncate font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as SettingsTabId)}
        className="gap-4"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList variant="line" className="h-auto w-max min-w-full justify-start gap-0">
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-1">
            <TabsContent value="branding" className="mt-0 space-y-4">
              <div>
                <CardTitle className="text-base">Branding</CardTitle>
                <CardDescription>
                  Public URL, display name, and publish status.
                </CardDescription>
              </div>
              <Field className="gap-1.5">
                <FieldLabel>Public URL slug</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/t/</span>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
                </div>
                <FieldDescription>Example: kasun → /t/kasun</FieldDescription>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>Display name</FieldLabel>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={(v) => setIsPublic(Boolean(v))}
                />
                <div>
                  <label htmlFor="is-public" className="cursor-pointer font-medium text-sm">
                    Publish public page
                  </label>
                  <p className="text-muted-foreground text-xs">
                    When off, /t/{slug || "…"} returns not found for visitors.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="carousel" className="mt-0 space-y-4">
              <div>
                <CardTitle className="text-base">Carousel banner</CardTitle>
                <CardDescription>
                  Hero title, supporting text, CTA, and carousel images.
                </CardDescription>
              </div>
              <Field className="gap-1.5">
                <FieldLabel>Hero title</FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Empowering Future Scholars"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mastering the Advanced Level syllabus…"
                />
              </Field>
              <div className="space-y-3 border-t border-border pt-4">
                <Field className="gap-1.5">
                  <FieldLabel>CTA label</FieldLabel>
                  <Input
                    value={bannerCta}
                    onChange={(e) => setBannerCta(e.target.value)}
                    placeholder="Browse Resources"
                  />
                </Field>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void addBannerFromFile(file).catch((err) => toast.error(String(err)));
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 text-xs">
                    <Spinner className="size-3.5 shrink-0 text-amber-700" />
                    <span>Uploading… don’t close this page while the file updates.</span>
                  </div>
                ) : null}
                <div className="space-y-2">
                  {(profile?.banners ?? []).map((b, i) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 rounded-lg border border-border p-2"
                    >
                      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(b.imageUrl, APP_CONFIG.apiUrl) || ""}
                        alt=""
                        className="size-14 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm">
                          {b.ctaLabel || "Banner image"}
                        </div>
                        <p className="truncate text-muted-foreground text-xs">{b.imageUrl}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={i === 0}
                          onClick={() => moveBanner(b.id, -1)}
                        >
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={i === (profile?.banners.length ?? 0) - 1}
                          onClick={() => moveBanner(b.id, 1)}
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void deleteBanner(b.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="classes" className="mt-0 space-y-4">
              <div>
                <CardTitle className="text-base">Upcoming Class</CardTitle>
                <CardDescription>
                  Accordion items — time, venue, date, fee, and WhatsApp group.
                </CardDescription>
              </div>
              <Field className="gap-1.5">
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={classTitle}
                  onChange={(e) => setClassTitle(e.target.value)}
                  placeholder="G.C.E. Advanced Level (A/L)"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  rows={2}
                  value={classDescription}
                  onChange={(e) => setClassDescription(e.target.value)}
                  placeholder="Theory, Revision, and Paper classes…"
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field className="gap-1.5 sm:col-span-2">
                  <FieldLabel>Schedule</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="time"
                      value={classStartTime}
                      onChange={(e) => setClassStartTime(e.target.value)}
                      aria-label="Start time"
                    />
                    <Input
                      type="time"
                      value={classEndTime}
                      onChange={(e) => setClassEndTime(e.target.value)}
                      aria-label="End time"
                    />
                  </div>
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel>Location</FieldLabel>
                  <Input
                    value={classLocation}
                    onChange={(e) => setClassLocation(e.target.value)}
                    placeholder="Colombo Main Hall"
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel>Date</FieldLabel>
                  <ClassDatePicker value={classDate} onChange={setClassDate} />
                </Field>
                <Field className="gap-1.5 sm:col-span-2">
                  <FieldLabel>Fee</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>LKR</InputGroupAddon>
                    <InputGroupInput
                      inputMode="decimal"
                      value={classFee}
                      onChange={(e) =>
                        setClassFee(
                          e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"),
                        )
                      }
                      placeholder="5,000"
                    />
                  </InputGroup>
                </Field>
                <Field className="gap-1.5 sm:col-span-2">
                  <FieldLabel>Join WhatsApp group</FieldLabel>
                  <Input
                    type="url"
                    value={classWhatsapp}
                    onChange={(e) => setClassWhatsapp(e.target.value)}
                    placeholder="https://chat.whatsapp.com/…"
                  />
                  <FieldDescription>Invite link shown on your public page.</FieldDescription>
                </Field>
              </div>
              <Button type="button" variant="outline" onClick={() => void addClass()}>
                <Plus className="size-4" />
                Add class
              </Button>
              <ul className="space-y-2">
                {(profile?.classes ?? []).map((c, i) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <GripVertical className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{c.title}</div>
                      {c.description ? (
                        <p className="text-muted-foreground text-xs">{c.description}</p>
                      ) : null}
                      <p className="mt-1 text-muted-foreground text-[11px]">
                        {[c.scheduleTime, c.location, c.classDate, c.feeLabel]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {c.whatsappGroupUrl ? (
                        <p className="mt-0.5 truncate text-[11px] text-emerald-600">
                          WhatsApp: {c.whatsappGroupUrl}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={i === 0}
                        onClick={() => moveClass(c.id, -1)}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={i === (profile?.classes.length ?? 0) - 1}
                        onClick={() => moveClass(c.id, 1)}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void deleteClass(c.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="quizzes" className="mt-0 space-y-4">
              <div>
                <CardTitle className="text-base">Quizzes</CardTitle>
                <CardDescription>
                  Choose whether visitors see all your quizzes, or only selected ones.
                </CardDescription>
              </div>
              <RadioGroup
                value={quizVisibility}
                onValueChange={(v) => setQuizVisibility(v as QuizVisibility)}
                className="gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ALL" id="quiz-vis-all" />
                  <Label htmlFor="quiz-vis-all" className="cursor-pointer font-normal">
                    All my quizzes
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="SELECTED" id="quiz-vis-selected" />
                  <Label htmlFor="quiz-vis-selected" className="cursor-pointer font-normal">
                    Select particular quizzes
                  </Label>
                </div>
              </RadioGroup>

              {quizVisibility === "SELECTED" ? (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {(profile?.myQuizzes ?? []).length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      You have no quizzes yet. Create a quiz first, then pick it here.
                    </p>
                  ) : (
                    (profile?.myQuizzes ?? []).map((q) => (
                      <div key={q.id} className="flex items-start gap-3">
                        <Checkbox
                          id={`quiz-${q.id}`}
                          checked={selectedQuizIds.includes(q.id)}
                          onCheckedChange={(v) => toggleQuiz(q.id, Boolean(v))}
                        />
                        <label htmlFor={`quiz-${q.id}`} className="cursor-pointer leading-tight">
                          <span className="font-medium text-sm">{quizTitle(q.title)}</span>
                          <span className="ml-2 text-muted-foreground text-xs">{q.status}</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="about" className="mt-0 space-y-4">
              <div>
                <CardTitle className="text-base">About</CardTitle>
                <CardDescription>
                  Text shown in the About section on your public page.
                </CardDescription>
              </div>
              <Field className="gap-1.5">
                <FieldLabel>About text</FieldLabel>
                <Textarea
                  rows={6}
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  placeholder={`${displayName || "Teacher"} shares practice quizzes and class resources on Kadaima.`}
                />
              </Field>
            </TabsContent>

            <TabsContent value="asks" className="mt-0 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Student asks</CardTitle>
                  <CardDescription>
                    Inquiries students send from your public Contact form.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loadingInquiries}
                  onClick={() => void loadInquiries()}
                >
                  {loadingInquiries ? <Spinner className="size-4" /> : null}
                  Refresh
                </Button>
              </div>
              {loadingInquiries && inquiries.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Spinner className="size-4" />
                  Loading asks…
                </div>
              ) : inquiries.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground text-sm">
                  No student asks yet. When someone submits the Contact form on your public page,
                  it will show up here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {inquiries.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        item.status === "NEW"
                          ? "border-sky-200 bg-sky-50/60"
                          : "border-border bg-background",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{item.studentName}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.mobileNumber}
                            {item.email ? ` · ${item.email}` : ""}
                            {" · "}
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-medium text-[11px]",
                            item.status === "NEW" && "bg-sky-100 text-sky-800",
                            item.status === "READ" && "bg-muted text-muted-foreground",
                            item.status === "ARCHIVED" && "bg-amber-50 text-amber-800",
                          )}
                        >
                          {item.status === "NEW"
                            ? "New ask"
                            : item.status === "READ"
                              ? "Read"
                              : "Archived"}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                        {item.message}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.status === "NEW" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void updateInquiryStatus(item.id, "READ")}
                          >
                            Mark as read
                          </Button>
                        ) : null}
                        {item.status !== "ARCHIVED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void updateInquiryStatus(item.id, "ARCHIVED")}
                          >
                            Archive
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void updateInquiryStatus(item.id, "READ")}
                          >
                            Restore
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a href={`tel:${item.mobileNumber}`}>Call</a>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="contact" className="mt-0 space-y-4">
              <div>
                <CardTitle className="text-base">Contact</CardTitle>
                <CardDescription>
                  Phone, WhatsApp, class location, and a short message for students.
                </CardDescription>
              </div>
              <Field className="gap-1.5">
                <FieldLabel>Mobile number</FieldLabel>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>WhatsApp link</FieldLabel>
                <Input
                  type="url"
                  value={contactWhatsappUrl}
                  onChange={(e) => setContactWhatsappUrl(e.target.value)}
                  placeholder="https://wa.me/94771234567"
                />
                <FieldDescription>
                  Personal chat or group invite link (opens WhatsApp on your public page).
                </FieldDescription>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>Class location / address</FieldLabel>
                <Textarea
                  rows={3}
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="No. 12, Main Street, Colombo"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>Message</FieldLabel>
                <Textarea
                  rows={4}
                  value={contactText}
                  onChange={(e) => setContactText(e.target.value)}
                  placeholder="Reach out for class enrollment details. Browse quizzes above to get started."
                />
              </Field>
            </TabsContent>

            <TabsContent value="layout" className="mt-0 space-y-5">
              <div>
                <CardTitle className="text-base">Layout & posters</CardTitle>
                <CardDescription>
                  Section order, visibility, and dynamic poster banners.
                </CardDescription>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-sm">Page sections</p>
                <ul className="space-y-2">
                  {pageLayout.sections.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
                    >
                      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                      <Checkbox
                        id={`section-${s.id}`}
                        checked={s.visible}
                        onCheckedChange={(v) => toggleSectionVisible(s.id, Boolean(v))}
                      />
                      <label
                        htmlFor={`section-${s.id}`}
                        className="min-w-0 flex-1 cursor-pointer font-medium text-xs"
                      >
                        {SECTION_LABELS[s.id]}
                      </label>
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={i === 0}
                          onClick={() => moveSection(s.id, -1)}
                        >
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={i === pageLayout.sections.length - 1}
                          onClick={() => moveSection(s.id, 1)}
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPageLayout(normalizePageLayout(null))}
                >
                  Reset layout
                </Button>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <p className="font-medium text-sm">Add poster banner</p>
                  <p className="text-muted-foreground text-xs">
                    Upload a promo image and choose where it appears on the page.
                  </p>
                </div>
                <Field className="gap-1.5">
                  <FieldLabel>Placement</FieldLabel>
                  <RadioGroup
                    value={posterPlacement}
                    onValueChange={(v) => setPosterPlacement(v as PosterPlacement)}
                    className="gap-2"
                  >
                    {(["TOP", "MIDDLE", "FOOTER", "SIDE", "RIGHT"] as const).map((p) => (
                      <div key={p} className="flex items-start gap-2">
                        <RadioGroupItem value={p} id={`place-${p}`} className="mt-0.5" />
                        <Label
                          htmlFor={`place-${p}`}
                          className="cursor-pointer font-normal text-xs leading-snug"
                        >
                          <span className="font-medium">{PLACEMENT_LABELS[p]}</span>
                          <span className="mt-0.5 block text-muted-foreground">
                            {PLACEMENT_RESOLUTION[p]}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </Field>
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground text-xs">Recommended resolutions</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    <li>
                      <span className="font-medium text-foreground">Left / Right:</span> 480×720
                      (3:4) — JPG/PNG/WebP, under 1.5 MB
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Top / Middle / Footer:</span>{" "}
                      1200×320–400
                    </li>
                  </ul>
                </div>
                <Field className="gap-1.5">
                  <FieldLabel>Title (optional)</FieldLabel>
                  <Input
                    value={posterTitle}
                    onChange={(e) => setPosterTitle(e.target.value)}
                    placeholder="Holiday special"
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel>Link URL (optional)</FieldLabel>
                  <Input
                    type="url"
                    value={posterLink}
                    onChange={(e) => setPosterLink(e.target.value)}
                    placeholder="https://…"
                  />
                </Field>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void addPosterFromFile(file).catch((err) => toast.error(String(err)));
                    }
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 text-xs">
                    <Spinner className="size-3.5 shrink-0 text-amber-700" />
                    <span>
                      Uploading{uploadingName ? ` “${uploadingName}”` : ""}… don’t close this page
                      while the file updates.
                    </span>
                  </div>
                ) : null}
                <ul className="space-y-2">
                  {posters.length === 0 ? (
                    <li className="text-muted-foreground text-xs">No poster banners yet.</li>
                  ) : (
                    posters.map((p, i) => (
                      <li
                        key={p.id}
                        className="flex items-start gap-2 rounded-lg border border-border p-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaUrl(p.imageUrl, APP_CONFIG.apiUrl) || ""}
                          alt=""
                          className="size-12 shrink-0 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-xs">
                            {p.title || "Poster banner"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {PLACEMENT_LABELS[p.placement] || p.placement}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={i === 0}
                            onClick={() => movePoster(p.id, -1)}
                          >
                            <ChevronUp className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={i === posters.length - 1}
                            onClick={() => movePoster(p.id, 1)}
                          >
                            <ChevronDown className="size-3.5" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void deletePoster(p.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </TabsContent>

            {activeTab !== "asks" ? (
              <div className="flex justify-end border-t border-border pt-4">
                <Button disabled={saving || uploading} onClick={() => void saveAll()}>
                  {saving || uploading ? <Spinner className="size-4" /> : null}
                  {uploading ? "Uploading…" : "Save all changes"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
