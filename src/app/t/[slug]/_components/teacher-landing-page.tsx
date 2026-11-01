"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileCheck,
  GraduationCap,
  HelpCircle,
  Layers,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Radio,
  Send,
  Sparkles,
  Star,
  Tag,
  User,
  UserPlus,
  Users,
  Video,
  X,
  BookOpen,
  ArrowRight,
} from "lucide-react";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { PublicCenteredError } from "@/components/site/public-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId } from "@/lib/guest-session";
import { cn } from "@/lib/utils";
import { localize, type LocalizedText } from "@/types/quiz";

export type TeacherTab = "overview" | "classes" | "timetable" | "quizzes" | "about";

interface TeacherStats {
  studentsCount: number;
  classesCount: number;
  quizzesCount: number;
  rating: number;
  reviewsCount: number;
}

interface TeacherClassItem {
  id: string;
  title: string;
  description: string | null;
  subject?: string;
  grade?: string;
  scheduleTime?: string | null;
  location?: string | null;
  classDate?: string | null;
  feeLabel?: string | null;
  isLive?: boolean;
  thumbnailTheme?: "dna" | "flasks" | "leaves" | "math" | "default";
  imageUrl?: string | null;
}

interface TeacherQuizItem {
  id: string;
  title: LocalizedText | string;
  description?: LocalizedText | string | null;
  courseTitle?: LocalizedText | string | null;
  subject?: string;
  grade?: string;
  questionsCount?: number;
  durationMinutes?: number;
}

interface TimetableItem {
  id: string;
  weekday: string;
  classTitle: string;
  timeRange: string;
  location?: string;
}

interface TeacherProfileData {
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
  subject?: string;
  brandingEnabled?: boolean;
  banners?: Array<{
    id: string;
    imageUrl: string;
    linkUrl: string | null;
    title: string | null;
    subtitle?: string | null;
    ctaLabel?: string | null;
  }>;
  stats?: TeacherStats;
  classes?: TeacherClassItem[];
  classroomClasses?: TeacherClassItem[];
  upcomingSessions?: Array<{
    id: string;
    startsAtUtc: string;
    endsAtUtc: string;
    localDate: string;
    timezone: string;
    status: string;
    title?: any;
    classBatch?: {
      id: string;
      grade?: string;
      subject?: string;
      title?: any;
    };
  }>;
}

// Fallback seed data matching the reference designs
const FALLBACK_PROFILES: Record<string, TeacherProfileData> = {
  "nimalka-perera": {
    slug: "nimalka-perera",
    displayName: "Ms. Nimalka Perera",
    title: "BSc (Hons) in Physics | Experienced Teacher",
    subject: "Science",
    description:
      "A passionate Science teacher with 8+ years of experience in O/L and A/L Science, focused on concept clarity, practical application and exam success.",
    aboutText:
      "Ms. Nimalka Perera is a seasoned science educator with over 8 years of classroom and online teaching experience across Sri Lanka. Holding a B.Sc. (Hons) in Physics, she specializes in breaking down complex physical and chemical concepts into visual, easily understandable principles for G.C.E. O/L and A/L students.",
    sideBannerUrl: "/media/teachers/nimalka-perera.webp",
    stats: {
      studentsCount: 4200,
      classesCount: 12,
      quizzesCount: 28,
      rating: 4.9,
      reviewsCount: 1230,
    },
    classes: [
      {
        id: "c-nimalka-1",
        title: "O/L Science - 2025 Revision",
        subject: "Science",
        grade: "O/L",
        description: "Intensive weekly revision covering Physics, Chemistry, and Biology syllabus units.",
        scheduleTime: "Tue, 14 Jan • 6:00 PM - 7:30 PM",
        location: "Online",
        isLive: true,
        thumbnailTheme: "dna",
        feeLabel: "LKR 2,500 / monthly",
      },
      {
        id: "c-nimalka-2",
        title: "A/L Science - Unit 01: Matter",
        subject: "Science",
        grade: "A/L",
        description: "Detailed atomic theory, chemical bonding, and states of matter with past paper drills.",
        scheduleTime: "Thu, 16 Jan • 7:00 PM - 8:30 PM",
        location: "Online",
        isLive: true,
        thumbnailTheme: "flasks",
        feeLabel: "LKR 3,000 / monthly",
      },
      {
        id: "c-nimalka-3",
        title: "O/L Science - Plant Processes",
        subject: "Science",
        grade: "O/L",
        description: "Comprehensive recorded masterclass on photosynthesis, transpiration, and plant nutrition.",
        scheduleTime: "On Demand",
        location: "Online",
        isLive: false,
        thumbnailTheme: "leaves",
        feeLabel: "LKR 2,000 / one-time",
      },
    ],
  },
  "nimal-silva": {
    slug: "nimal-silva",
    displayName: "Mr. Nimal Silva",
    title: "B.Sc. (Hons) in Mathematics | Senior Educator",
    subject: "Mathematics",
    description:
      "Senior National Mathematics Educator with 15+ years experience guiding students to island rankings in O/L and A/L Combined Mathematics.",
    aboutText:
      "Mr. Nimal Silva is renowned across Sri Lanka for simplifying higher mathematics through step-by-step problem dissection, formula derivations, and past paper mastery.",
    sideBannerUrl: "/media/teachers/nimal-silva.webp",
    stats: {
      studentsCount: 4200,
      classesCount: 12,
      quizzesCount: 28,
      rating: 4.9,
      reviewsCount: 1240,
    },
    classes: [
      {
        id: "c-nimal-1",
        title: "Grade 10 Mathematics — Theory & Revision 2026",
        subject: "Mathematics",
        grade: "Grade 10",
        description: "Comprehensive weekly interactive theory batch with exam paper discussions.",
        scheduleTime: "Sat, 09:00 - 11:00 AM",
        location: "Online",
        isLive: true,
        thumbnailTheme: "math",
        feeLabel: "LKR 2,500 / monthly",
      },
      {
        id: "c-nimal-2",
        title: "G.C.E. A/L Combined Mathematics 2026",
        subject: "Mathematics",
        grade: "A/L",
        description: "Advanced calculus, trigonometry, and coordinate geometry revision.",
        scheduleTime: "Sun, 08:00 - 11:00 AM",
        location: "Online",
        isLive: true,
        thumbnailTheme: "math",
        feeLabel: "LKR 3,500 / monthly",
      },
    ],
  },
  "kavindi-perera": {
    slug: "kavindi-perera",
    displayName: "Ms. Kavindi Perera",
    title: "B.Sc. in Science Education | Lead Science Instructor",
    subject: "Science",
    description:
      "Senior Science Teacher specializing in O/L Science syllabus with interactive visual experiments and concept clarity.",
    aboutText:
      "Ms. Kavindi Perera brings interactive and practical science education to students across Sri Lanka, turning complex science concepts into intuitive understanding.",
    sideBannerUrl: "/media/teachers/kavindi-perera.webp",
    stats: {
      studentsCount: 3800,
      classesCount: 10,
      quizzesCount: 22,
      rating: 4.8,
      reviewsCount: 980,
    },
    classes: [
      {
        id: "c-kavindi-1",
        title: "Grade 11 Science — Comprehensive Revision",
        subject: "Science",
        grade: "Grade 11",
        description: "Targeted revision sessions for Chemistry, Physics, and Biology modules.",
        scheduleTime: "Sun, 10:00 - 12:00 PM",
        location: "Online",
        isLive: true,
        thumbnailTheme: "dna",
        feeLabel: "LKR 2,500 / monthly",
      },
    ],
  },
  "ruwan-fernando": {
    slug: "ruwan-fernando",
    displayName: "Mr. Ruwan Fernando",
    title: "M.A. in English | Language & Literature Specialist",
    subject: "English",
    description:
      "Senior English Language & Literature Educator with 8+ years experience helping over 15,000 students excel in G.C.E. exams.",
    aboutText:
      "Mr. Ruwan Fernando empowers students with fluent English expression, exam answering structures, and deep appreciation for classical and modern literature.",
    sideBannerUrl: "/media/teachers/ruwan-fernando.webp",
    stats: {
      studentsCount: 5100,
      classesCount: 14,
      quizzesCount: 35,
      rating: 4.9,
      reviewsCount: 1560,
    },
    classes: [
      {
        id: "c-ruwan-1",
        title: "O/L English Language Masterclass",
        subject: "English",
        grade: "O/L",
        description: "Grammar, essay writing, comprehension, and past paper writing techniques.",
        scheduleTime: "Wed, 16:30 - 18:00",
        location: "Online",
        isLive: true,
        thumbnailTheme: "default",
        feeLabel: "LKR 2,000 / monthly",
      },
    ],
  },
};

const DEFAULT_QUIZZES: TeacherQuizItem[] = [
  {
    id: "q-default-1",
    title: {
      en: "O/L Science - Unit 01: Living Organisms",
      si: "සාමාන්‍ය පෙළ විද්‍යාව - පාඩම 01: ජීවීන්ගේ ලක්ෂණ",
      ta: "சா/த விஞ்ஞானம் - அலகு 01: உயிரினங்கள்",
    },
    subject: "Science",
    grade: "O/L",
    questionsCount: 20,
    durationMinutes: 30,
  },
  {
    id: "q-default-2",
    title: {
      en: "A/L Science - Unit 02: Chemical Reactions",
      si: "උසස් පෙළ විද්‍යාව - පාඩම 02: රසායනික ප්‍රතික්‍රියා",
      ta: "உ/த விஞ்ஞானம் - அலகு 02: இரசாயன தாக்கங்கள்",
    },
    subject: "Science",
    grade: "A/L",
    questionsCount: 25,
    durationMinutes: 45,
  },
  {
    id: "q-default-3",
    title: {
      en: "O/L Science - Plant Processes",
      si: "සාමාන්‍ය පෙළ විද්‍යාව - ශාක ක්‍රියාවලි",
      ta: "சா/த விஞ்ஞானம் - தாவர செயல்முறைகள்",
    },
    subject: "Science",
    grade: "O/L",
    questionsCount: 15,
    durationMinutes: 20,
  },
];

const DEFAULT_TIMETABLE: TimetableItem[] = [
  { id: "tt-1", weekday: "Mon", classTitle: "A/L Science - Unit 02", timeRange: "6:00 PM - 7:30 PM" },
  { id: "tt-2", weekday: "Tue", classTitle: "O/L Science - Revision", timeRange: "6:00 PM - 7:30 PM" },
  { id: "tt-3", weekday: "Thu", classTitle: "A/L Science - Unit 01", timeRange: "7:00 PM - 8:30 PM" },
  { id: "tt-4", weekday: "Sat", classTitle: "O/L Science - Paper Discussion", timeRange: "4:00 PM - 5:30 PM" },
];

export function TeacherLandingPage({
  slug,
  initialTeacher,
}: {
  slug: string;
  initialTeacher?: TeacherProfileData | null;
}) {
  const router = useRouter();
  const { locale, t: rawT } = useI18n();
  const t = (key: string, fallback?: string) => {
    const res = rawT(key);
    return res && res !== key ? res : fallback || key;
  };

  const fallback = FALLBACK_PROFILES[slug] || FALLBACK_PROFILES["nimalka-perera"];
  const initialData: TeacherProfileData | null = initialTeacher
    ? {
        ...fallback,
        ...initialTeacher,
        stats: {
          studentsCount: initialTeacher.stats?.studentsCount || fallback?.stats?.studentsCount || 4200,
          classesCount: initialTeacher.stats?.classesCount || fallback?.stats?.classesCount || 12,
          quizzesCount: initialTeacher.stats?.quizzesCount || fallback?.stats?.quizzesCount || 28,
          rating: initialTeacher.stats?.rating || fallback?.stats?.rating || 4.9,
          reviewsCount: initialTeacher.stats?.reviewsCount || fallback?.stats?.reviewsCount || 1230,
        },
      }
    : (fallback || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfileData | null>(initialData);
  const [quizzes, setQuizzes] = useState<TeacherQuizItem[]>(DEFAULT_QUIZZES);
  const [activeTab, setActiveTab] = useState<TeacherTab>("overview");

  // Enrollment Modal state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClassForEnroll, setSelectedClassForEnroll] = useState<TeacherClassItem | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    studentName: "",
    mobileNumber: "",
    email: "",
    note: "",
  });
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);
  const [enrollErrorMessage, setEnrollErrorMessage] = useState<string | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: "",
    contact: "",
    message: "",
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState<"idle" | "success" | "error">("idle");
  const [contactMessage, setContactMessage] = useState<string | null>(null);

  // Fetch teacher data
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      const fallback = FALLBACK_PROFILES[slug] || FALLBACK_PROFILES["nimalka-perera"];

      try {
        const guestSessionId = ensureGuestSessionId();
        const headers: Record<string, string> = {};
        if (guestSessionId) headers["x-guest-session-id"] = guestSessionId;
        const token = getClientCookie("auth_token") || getClientCookie("token");
        if (token) headers["authorization"] = `Bearer ${token}`;

        const [teacherRes, quizzesRes] = await Promise.all([
          fetch(`${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}`, {
            headers,
          }).catch(() => null),
          fetch(`${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}/quizzes`, {
            headers,
          }).catch(() => null),
        ]);

        if (isCancelled) return;

        if (teacherRes && teacherRes.ok) {
          const teacherData = await teacherRes.json();
          // Merge API data with fallbacks for stats & presentation if missing
          const merged: TeacherProfileData = {
            ...fallback,
            ...teacherData,
            stats: {
              studentsCount: teacherData.stats?.studentsCount || fallback?.stats?.studentsCount || 4200,
              classesCount: teacherData.stats?.classesCount || fallback?.stats?.classesCount || 12,
              quizzesCount: teacherData.stats?.quizzesCount || fallback?.stats?.quizzesCount || 28,
              rating: teacherData.stats?.rating || fallback?.stats?.rating || 4.9,
              reviewsCount: teacherData.stats?.reviewsCount || fallback?.stats?.reviewsCount || 1230,
            },
          };
          setTeacher(merged);
        } else if (fallback) {
          setTeacher(fallback);
        } else {
          setError("Teacher profile not found.");
        }

        if (quizzesRes && quizzesRes.ok) {
          const qData = await quizzesRes.json();
          const items = Array.isArray(qData) ? qData : qData.items || qData.quizzes || [];
          if (items.length > 0) {
            setQuizzes(
              items.map((q: any) => ({
                id: q.id,
                title: q.title,
                description: q.description,
                courseTitle: q.course?.title,
                subject: q.subject || "General",
                grade: q.grade || "O/L",
                questionsCount: q._count?.questions || q.questionsCount || 20,
                durationMinutes: q.durationMinutes || 30,
              }))
            );
          } else {
            setQuizzes(DEFAULT_QUIZZES);
          }
        } else {
          setQuizzes(DEFAULT_QUIZZES);
        }
      } catch (err: any) {
        if (!isCancelled) {
          if (fallback) {
            setTeacher(fallback);
            setQuizzes(DEFAULT_QUIZZES);
          } else {
            setError(err?.message || "Failed to load teacher profile.");
          }
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  // Combined class catalog
  const allClasses = useMemo<TeacherClassItem[]>(() => {
    if (!teacher) return [];
    const directClasses = (teacher.classes || []).map((c) => ({
      ...c,
      isLive: c.isLive ?? true,
      thumbnailTheme: c.thumbnailTheme || "dna",
    }));

    const classroomBatches = (teacher.classroomClasses || []).map((b, idx) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      scheduleTime: b.scheduleTime || "Scheduled Weekly",
      location: b.location || "Live Online",
      classDate: b.classDate || "Ongoing",
      feeLabel: b.feeLabel || null,
      isLive: true,
      thumbnailTheme: (idx % 2 === 0 ? "flasks" : "leaves") as any,
    }));

    const combined = [...directClasses, ...classroomBatches];
    return combined.length > 0 ? combined : (FALLBACK_PROFILES["nimalka-perera"].classes || []);
  }, [teacher]);

  // Combined timetable items
  const timetableItems = useMemo<TimetableItem[]>(() => {
    if (!teacher) return DEFAULT_TIMETABLE;
    if (teacher.upcomingSessions && teacher.upcomingSessions.length > 0) {
      return teacher.upcomingSessions.map((s) => {
        const d = new Date(s.startsAtUtc);
        const weekdayStr = d.toLocaleDateString("en-US", { weekday: "short" });
        const timeStr = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Colombo",
        });
        const endD = new Date(s.endsAtUtc);
        const endTimeStr = endD.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Colombo",
        });
        const title =
          (s.title as any)?.en ||
          (s.title as any)?.si ||
          (s.classBatch?.title as any)?.en ||
          (s.classBatch?.title as any)?.si ||
          "Interactive Lesson";
        return {
          id: s.id,
          weekday: weekdayStr,
          classTitle: title,
          timeRange: `${timeStr} - ${endTimeStr}`,
        };
      });
    }
    return DEFAULT_TIMETABLE;
  }, [teacher]);

  // Handlers
  const handleOpenEnrollModal = (cls?: TeacherClassItem) => {
    setSelectedClassForEnroll(cls || allClasses[0] || null);
    setEnrollSuccessMessage(null);
    setEnrollErrorMessage(null);
    setEnrollModalOpen(true);
  };

  const handleEnrollSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEnrollSubmitting(true);
    setEnrollErrorMessage(null);

    // Sri Lankan mobile regex 07XXXXXXXX
    const cleanPhone = enrollForm.mobileNumber.replace(/\s+/g, "");
    if (!/^07\d{8}$/.test(cleanPhone)) {
      setEnrollErrorMessage("Please enter a valid 10-digit Sri Lankan mobile number (e.g. 0771234567).");
      setEnrollSubmitting(false);
      return;
    }

    try {
      const guestSessionId = ensureGuestSessionId();
      const token = getClientCookie("auth_token") || getClientCookie("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (guestSessionId) headers["x-guest-session-id"] = guestSessionId;
      if (token) headers["authorization"] = `Bearer ${token}`;

      const res = await fetch(`${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}/enrollment-requests`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentName: enrollForm.studentName,
          mobileNumber: cleanPhone,
          email: enrollForm.email || undefined,
          classId: selectedClassForEnroll?.id || "general-inquiry",
          className: selectedClassForEnroll?.title || "General Enrollment",
          note: enrollForm.note || undefined,
          guestSessionId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit enrollment request.");
      }

      setEnrollSuccessMessage(
        data.message ||
          t(
            "teacherStorefront.enrollmentModal.successMessage",
            "Your enrollment request has been submitted! The teacher will contact you shortly."
          )
      );
    } catch (err: any) {
      setEnrollErrorMessage(err.message || "Failed to send request. Please try again.");
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactStatus("idle");
    setContactMessage(null);

    const isPhone = /^07\d{8}$/.test(contactForm.contact.replace(/\s+/g, ""));
    const isEmail = contactForm.contact.includes("@");

    if (!isPhone && !isEmail) {
      setContactStatus("error");
      setContactMessage("Please enter a valid email address or Sri Lankan phone number (07XXXXXXXX).");
      setContactSubmitting(false);
      return;
    }

    try {
      const guestSessionId = ensureGuestSessionId();
      const token = getClientCookie("auth_token") || getClientCookie("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (guestSessionId) headers["x-guest-session-id"] = guestSessionId;
      if (token) headers["authorization"] = `Bearer ${token}`;

      const res = await fetch(`${APP_CONFIG.apiUrl}/public/teachers/${encodeURIComponent(slug)}/inquiries`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentName: contactForm.name,
          mobileNumber: isPhone ? contactForm.contact.replace(/\s+/g, "") : "0770000000",
          email: isEmail ? contactForm.contact : undefined,
          message: contactForm.message,
          guestSessionId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not send inquiry.");
      }

      setContactStatus("success");
      setContactMessage(
        data.message ||
          t("teacherStorefront.messageSent", "Message sent! The teacher will reply to you soon.")
      );
      setContactForm({ name: "", contact: "", message: "" });
    } catch (err: any) {
      setContactStatus("error");
      setContactMessage(err.message || "Failed to send message. Please try again later.");
    } finally {
      setContactSubmitting(false);
    }
  };

  const scrollToContact = () => {
    setActiveTab("overview");
    setTimeout(() => {
      const el = document.getElementById("contact-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  if (loading) {
    return (
      <PublicQuizShell>
        <div className="mx-auto max-w-6xl px-4 py-12">
          <PublicContentSkeleton />
        </div>
      </PublicQuizShell>
    );
  }

  if (error || !teacher) {
    return (
      <PublicQuizShell>
        <div className="mx-auto max-w-4xl px-4 py-16">
          <PublicCenteredError message={error || "This educator profile is currently not available."} />
          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Return to Homepage
            </Link>
          </div>
        </div>
      </PublicQuizShell>
    );
  }

  // Brand slot for consistent navbar where teacher replaces Kadaima logo
  const teacherBrandSlot = (
    <Link href={`/t/${teacher.slug}`} className="flex items-center gap-2.5 group transition-opacity hover:opacity-90">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-blue-500/20 bg-blue-100 flex items-center justify-center">
        {teacher.sideBannerUrl ? (
          <Image src={teacher.sideBannerUrl} alt={teacher.displayName} fill className="object-cover" />
        ) : (
          <span className="font-bold text-xs text-blue-700">{teacher.displayName.charAt(0)}</span>
        )}
      </div>
      <div className="flex flex-col text-left leading-tight">
        <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
          {teacher.displayName}
        </span>
      </div>
    </Link>
  );

  const subjectPill = teacher.subject || "Science";
  const stats = teacher.stats || {
    studentsCount: 4200,
    classesCount: 12,
    quizzesCount: 28,
    rating: 4.9,
    reviewsCount: 1230,
  };

  return (
    <PublicQuizShell brandSlot={teacherBrandSlot}>
      <main className="min-h-screen bg-[#f8fbff]/70 pb-20 pt-4 sm:pt-6">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 md:px-6">

          {/* ======================================================== */}
          {/* TEACHER STOREFRONT HERO (Kadaima Redesign Reference)     */}
          {/* ======================================================== */}
          <section className="relative overflow-hidden rounded-3xl border border-blue-100/90 bg-gradient-to-r from-blue-50/90 via-sky-50/80 to-blue-100/70 p-6 shadow-sm sm:p-8 md:p-10">
            {/* Scientific Watermark Illustration on the Top Right */}
            <div
              className="pointer-events-none absolute right-4 top-2 select-none opacity-30 md:right-8 md:top-4"
              aria-hidden="true"
            >
              <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Stylized Atom */}
                <ellipse cx="160" cy="50" rx="35" ry="12" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="3 3" transform="rotate(-30 160 50)" />
                <ellipse cx="160" cy="50" rx="35" ry="12" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="3 3" transform="rotate(30 160 50)" />
                <ellipse cx="160" cy="50" rx="35" ry="12" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="3 3" transform="rotate(90 160 50)" />
                <circle cx="160" cy="50" r="4" fill="#1d4ed8" />

                {/* Stationery Cup & Pens */}
                <path d="M125 140 L135 175 L155 175 L165 140 Z" fill="#3b82f6" fillOpacity="0.15" stroke="#2563eb" strokeWidth="1.5" />
                <line x1="138" y1="140" x2="128" y2="105" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="146" y1="140" x2="146" y2="98" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="154" y1="140" x2="164" y2="108" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />

                {/* Stack of books */}
                <rect x="150" y="152" width="60" height="10" rx="2" fill="#bfdbfe" stroke="#1e40af" strokeWidth="1.2" />
                <rect x="145" y="163" width="70" height="11" rx="2" fill="#93c5fd" stroke="#1e40af" strokeWidth="1.2" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left Identity Block */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                {/* Profile Photo */}
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-4 ring-white/90">
                  {teacher.sideBannerUrl ? (
                    <Image
                      src={teacher.sideBannerUrl}
                      alt={teacher.displayName}
                      fill
                      priority
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-100 font-bold text-2xl text-blue-700">
                      {teacher.displayName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col">
                  {/* Name + Verified Badge */}
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                      {teacher.displayName}
                    </h1>
                    {/* Blue Verified Badge */}
                    <span title="Verified Kadaima Educator" className="inline-flex text-blue-600">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.6-5.6 1.4 1.4-7 7z" />
                      </svg>
                    </span>
                  </div>

                  {/* Title / Qualification */}
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {teacher.title || "Senior Educator & Exam Specialist"}
                  </p>

                  {/* Subject Badge */}
                  <div className="mt-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200/80 bg-fuchsia-50 px-3 py-0.5 text-xs font-semibold text-fuchsia-700">
                      <span>🔬</span>
                      <span>{subjectPill}</span>
                    </span>
                  </div>

                  {/* Short Bio */}
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                    {teacher.description ||
                      "A passionate educator focused on concept clarity, practical application and continuous exam success across Sri Lanka."}
                  </p>

                  {/* 4 Stats in a Clean Horizontal Row */}
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-700">
                    {/* Stat 1: Students */}
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>{stats.studentsCount.toLocaleString()}+ {t("teacherStorefront.students", "Students")}</span>
                    </div>

                    {/* Stat 2: Classes */}
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span>{stats.classesCount} {t("teacherStorefront.classes", "Classes")}</span>
                    </div>

                    {/* Stat 3: Quizzes */}
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-600" />
                      <span>{stats.quizzesCount} {t("teacherStorefront.quizzes", "Quizzes")}</span>
                    </div>

                    {/* Stat 4: Rating */}
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>
                        {stats.rating} ({stats.reviewsCount.toLocaleString()} {t("teacherStorefront.reviews", "Reviews")})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right CTA Action Buttons */}
              <div className="flex flex-row sm:flex-col lg:flex-row gap-3 pt-2 lg:pt-0 shrink-0">
                <Button
                  onClick={() => handleOpenEnrollModal()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{t("teacherStorefront.requestEnrollment", "Request Enrollment")}</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={scrollToContact}
                  className="inline-flex items-center gap-2 rounded-xl border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
                >
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>{t("teacherStorefront.contactTeacher", "Contact Teacher")}</span>
                </Button>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* IN-PAGE HORIZONTAL TAB NAVIGATION                        */}
          {/* ======================================================== */}
          <nav className="mt-8 flex items-center border-b border-slate-200/90 text-sm font-medium">
            <div className="flex gap-2 sm:gap-6 overflow-x-auto pb-px scrollbar-none">
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-semibold transition-colors shrink-0",
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                <span>🏠</span>
                <span>{t("teacherStorefront.tabs.overview", "Overview")}</span>
              </button>

              <button
                onClick={() => setActiveTab("classes")}
                className={cn(
                  "flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-semibold transition-colors shrink-0",
                  activeTab === "classes"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                <BookOpen className="h-4 w-4" />
                <span>{t("teacherStorefront.tabs.classes", "Classes")}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{allClasses.length}</span>
              </button>

              <button
                onClick={() => setActiveTab("timetable")}
                className={cn(
                  "flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-semibold transition-colors shrink-0",
                  activeTab === "timetable"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                <CalendarDays className="h-4 w-4" />
                <span>{t("teacherStorefront.tabs.timetable", "Timetable")}</span>
              </button>

              <button
                onClick={() => setActiveTab("quizzes")}
                className={cn(
                  "flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-semibold transition-colors shrink-0",
                  activeTab === "quizzes"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                <Layers className="h-4 w-4" />
                <span>{t("teacherStorefront.tabs.quizzes", "Quizzes")}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{quizzes.length}</span>
              </button>

              <button
                onClick={() => setActiveTab("about")}
                className={cn(
                  "flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-semibold transition-colors shrink-0",
                  activeTab === "about"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                <HelpCircle className="h-4 w-4" />
                <span>{t("teacherStorefront.tabs.about", "About")}</span>
              </button>
            </div>
          </nav>

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW (Composite 2-Column Storefront Layout)    */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT COLUMN: Upcoming Classes & Published Quizzes (7 cols) */}
              <div className="flex flex-col gap-6 lg:col-span-7">
                {/* CARD 1: UPCOMING CLASSES */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {t("teacherStorefront.upcomingClasses", "Upcoming Classes")}
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveTab("classes")}
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>{t("teacherStorefront.viewAllClasses", "View All Classes")}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {allClasses.slice(0, 3).map((cls) => (
                      <div
                        key={cls.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 p-3.5 transition-all hover:border-blue-200 hover:bg-blue-50/20"
                      >
                        {/* Class Info */}
                        <div className="flex items-center gap-3.5">
                          {/* Thumbnail */}
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                            {cls.thumbnailTheme === "dna" ? (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-bold">
                                🧬
                              </div>
                            ) : cls.thumbnailTheme === "flasks" ? (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-500 text-white font-bold">
                                ⚗️
                              </div>
                            ) : cls.thumbnailTheme === "leaves" ? (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-bold">
                                🍃
                              </div>
                            ) : cls.thumbnailTheme === "math" ? (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-purple-500 text-white font-bold">
                                📐
                              </div>
                            ) : (
                              <GraduationCap className="h-6 w-6 text-white" />
                            )}
                          </div>

                          <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                              {cls.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-slate-500">
                                {cls.grade || "O/L"} • {cls.subject || subjectPill}
                              </span>

                              {/* Live or Recorded Badge */}
                              {cls.isLive !== false ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  <span>{t("teacherStorefront.liveClass", "Live Class")}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                                  <span>▶</span>
                                  <span>{t("teacherStorefront.recorded", "Recorded")}</span>
                                </span>
                              )}
                            </div>

                            {/* Schedule Time */}
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                              <span>{cls.scheduleTime || t("teacherStorefront.onDemand", "On Demand")}</span>
                            </div>
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="shrink-0 self-end sm:self-center">
                          <Button
                            size="sm"
                            onClick={() => handleOpenEnrollModal(cls)}
                            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                          >
                            {t("teacherStorefront.requestEnrollment", "Request Enrollment")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARD 2: PUBLISHED QUIZZES */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-600" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {t("teacherStorefront.publishedQuizzes", "Published Quizzes")}
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveTab("quizzes")}
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>{t("teacherStorefront.viewAllQuizzes", "View All Quizzes")}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {quizzes.slice(0, 3).map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 p-3.5 transition-all hover:border-blue-200 hover:bg-blue-50/20"
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Purple Clipboard Icon Box */}
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-600 shadow-sm">
                            <FileCheck className="h-5 w-5" />
                          </div>

                          <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                              {localize(quiz.title, locale)}
                            </h3>
                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                              <span className="font-medium">{quiz.grade || "O/L"} • {quiz.subject || subjectPill}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                                <span>{quiz.questionsCount || 20} {t("teacherStorefront.questions", "Questions")}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 self-end sm:self-center">
                          <Link href={`/quiz/${quiz.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg border-blue-200 font-semibold text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                            >
                              {t("teacherStorefront.startQuiz", "Start Quiz")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Timetable & Contact Form (5 cols) */}
              <div className="flex flex-col gap-6 lg:col-span-5">
                {/* CARD 3: CLASS TIMETABLE */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-blue-600" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {t("teacherStorefront.classTimetable", "Class Timetable")}
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveTab("timetable")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>{t("teacherStorefront.viewFullTimetable", "View Full Timetable")}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex flex-col divide-y divide-slate-100">
                    {timetableItems.slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2.5 text-xs sm:text-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-block min-w-[42px] rounded-md bg-blue-50 px-2 py-1 text-center font-bold text-blue-700 text-xs">
                            {item.weekday}
                          </span>
                          <span className="font-semibold text-slate-800 line-clamp-1">{item.classTitle}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 font-medium text-xs shrink-0">
                          <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.timeRange}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARD 4: CONTACT THE TEACHER */}
                <div id="contact-section" className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 pb-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {t("teacherStorefront.contactTitle", "Contact the Teacher")}
                    </h2>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500 mb-4">
                    {t(
                      "teacherStorefront.contactSubtitle",
                      "Have a question about classes, enrollment or study materials? Send a message directly to the teacher."
                    )}
                  </p>

                  <form onSubmit={handleContactSubmit} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder={t("teacherStorefront.yourName", "Your name")}
                          className="pl-9 text-xs sm:text-sm rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          required
                          value={contactForm.contact}
                          onChange={(e) => setContactForm({ ...contactForm, contact: e.target.value })}
                          placeholder={t("teacherStorefront.yourEmail", "Your email or mobile")}
                          className="pl-9 text-xs sm:text-sm rounded-xl border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Textarea
                        required
                        rows={3}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder={t("teacherStorefront.yourMessage", "Type your message...")}
                        className="pl-9 text-xs sm:text-sm rounded-xl border-slate-200 resize-none"
                      />
                    </div>

                    {contactStatus === "success" && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{contactMessage}</span>
                      </div>
                    )}

                    {contactStatus === "error" && (
                      <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
                        <span>⚠️</span>
                        <span>{contactMessage}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={contactSubmitting}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
                    >
                      {contactSubmitting ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          <span>{t("teacherStorefront.sending", "Sending...")}</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>{t("teacherStorefront.sendMessage", "Send Message")}</span>
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CLASSES (Dedicated Catalog View)                  */}
          {/* ======================================================== */}
          {activeTab === "classes" && (
            <div className="mt-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {t("teacherStorefront.tabs.classes", "Classes")}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Browse all interactive theory and revision cohorts led by {teacher.displayName}.
                  </p>
                </div>
                <Button onClick={() => handleOpenEnrollModal()} className="rounded-xl bg-blue-600 font-semibold text-xs text-white">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Request Enrollment
                </Button>
              </div>

              {allClasses.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
                  {t("teacherStorefront.emptyClasses", "No classes currently scheduled for enrollment.")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {cls.grade || "O/L"} • {cls.subject || subjectPill}
                          </span>
                          {cls.isLive !== false ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>Live</span>
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              Recorded
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">{cls.title}</h3>
                        <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {cls.description || "Interactive syllabus modules, exam strategies, and model paper review."}
                        </p>

                        <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cls.scheduleTime || "Scheduled Weekly"}</span>
                          </div>
                          {cls.feeLabel && (
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 mt-1">
                              <span>💳</span>
                              <span>{cls.feeLabel}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-2">
                        <Button
                          onClick={() => handleOpenEnrollModal(cls)}
                          className="w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                          {t("teacherStorefront.requestEnrollment", "Request Enrollment")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: TIMETABLE (Weekly & Upcoming Schedule View)       */}
          {/* ======================================================== */}
          {activeTab === "timetable" && (
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {t("teacherStorefront.tabs.timetable", "Timetable")}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live online lesson schedule in Asia/Colombo time.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col divide-y divide-slate-100">
                  {timetableItems.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="inline-block min-w-[50px] rounded-lg bg-blue-50 py-1.5 text-center font-extrabold text-blue-700 text-sm">
                          {item.weekday}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">{item.classTitle}</h3>
                          <span className="text-xs text-slate-500">Live Interactive Class</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <Clock3 className="h-4 w-4 text-blue-600" />
                          <span>{item.timeRange}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleOpenEnrollModal()}
                          className="rounded-lg bg-blue-600 text-xs font-semibold text-white"
                        >
                          Enroll
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: QUIZZES (Catalog of Teacher Quizzes)              */}
          {/* ======================================================== */}
          {activeTab === "quizzes" && (
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {t("teacherStorefront.tabs.quizzes", "Quizzes")}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Practice tests and timed diagnostic assessments created by {teacher.displayName}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                          {quiz.grade || "O/L"} • {quiz.subject || subjectPill}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{quiz.durationMinutes || 30} {t("teacherStorefront.minutes", "min")}</span>
                        </div>
                      </div>

                      <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">
                        {localize(quiz.title, locale)}
                      </h3>
                      <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {quiz.description
                          ? localize(quiz.description, locale)
                          : "Timed questions with instant AI feedback and detailed explanation for every question."}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between mb-3 text-xs text-slate-500 font-medium">
                        <span>{quiz.questionsCount || 20} {t("teacherStorefront.questions", "Questions")}</span>
                        <span className="font-semibold text-emerald-600">Free Practice</span>
                      </div>
                      <Link href={`/quiz/${quiz.id}`} className="block w-full">
                        <Button className="w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                          {t("teacherStorefront.startQuiz", "Start Quiz")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: ABOUT (Detailed Educator Bio & Background)        */}
          {/* ======================================================== */}
          {activeTab === "about" && (
            <div className="mt-6 flex flex-col gap-6">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  About {teacher.displayName}
                </h2>
                <div className="mt-4 prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-4">
                  <p>{teacher.aboutText || teacher.description}</p>

                  <h3 className="text-base font-bold text-slate-900 pt-2">Qualifications & Background</h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
                    <li>{teacher.title || "Senior National Educator"}</li>
                    <li>Specialist in National G.C.E. Examination syllabi and revision papers.</li>
                    <li>Proven track record with students achieving island rankings and distinction scores.</li>
                  </ul>

                  <h3 className="text-base font-bold text-slate-900 pt-2">Teaching Methodology</h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Classes emphasize conceptual clarity, real-world practical examples, and systematic past paper answering techniques. Every lesson is complemented by online quizzes and instant evaluations to identify knowledge gaps early.
                  </p>

                  {/* Contact channels if provided */}
                  {(teacher.contactPhone || teacher.contactWhatsappUrl) && (
                    <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-4">
                      {teacher.contactPhone && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span>{teacher.contactPhone}</span>
                        </div>
                      )}
                      {teacher.contactWhatsappUrl && (
                        <a
                          href={teacher.contactWhatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <span>💬 WhatsApp Group</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* ENROLLMENT REQUEST MODAL                                 */}
        {/* ======================================================== */}
        {enrollModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* Close Button */}
              <button
                onClick={() => setEnrollModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2.5 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t("teacherStorefront.enrollmentModal.title", "Request Class Enrollment")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {teacher.displayName}
                  </p>
                </div>
              </div>

              {enrollSuccessMessage ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 font-bold text-slate-900 text-base">
                    {t("teacherStorefront.enrollmentModal.successTitle", "Enrollment Request Sent!")}
                  </h4>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                    {enrollSuccessMessage}
                  </p>
                  <Button
                    onClick={() => setEnrollModalOpen(false)}
                    className="mt-6 w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white"
                  >
                    {t("teacherStorefront.enrollmentModal.close", "Close")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleEnrollSubmit} className="mt-4 flex flex-col gap-3.5">
                  {/* Selected Class Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("teacherStorefront.enrollmentModal.selectedClass", "Selected Class")}
                    </label>
                    <select
                      value={selectedClassForEnroll?.id || ""}
                      onChange={(e) => {
                        const found = allClasses.find((c) => c.id === e.target.value);
                        setSelectedClassForEnroll(found || null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      {allClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.title} {cls.feeLabel ? `(${cls.feeLabel})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Student Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("teacherStorefront.enrollmentModal.studentName", "Student Full Name")} *
                    </label>
                    <Input
                      required
                      value={enrollForm.studentName}
                      onChange={(e) => setEnrollForm({ ...enrollForm, studentName: e.target.value })}
                      placeholder="e.g. Kasun Perera"
                      className="rounded-xl border-slate-200 text-xs sm:text-sm"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("teacherStorefront.enrollmentModal.mobileNumber", "Mobile Number (07XXXXXXXX)")} *
                    </label>
                    <Input
                      required
                      type="tel"
                      value={enrollForm.mobileNumber}
                      onChange={(e) => setEnrollForm({ ...enrollForm, mobileNumber: e.target.value })}
                      placeholder="0771234567"
                      className="rounded-xl border-slate-200 text-xs sm:text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("teacherStorefront.enrollmentModal.email", "Email Address (Optional)")}
                    </label>
                    <Input
                      type="email"
                      value={enrollForm.email}
                      onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                      placeholder="kasun@example.com"
                      className="rounded-xl border-slate-200 text-xs sm:text-sm"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("teacherStorefront.enrollmentModal.note", "Message or Note (Optional)")}
                    </label>
                    <Textarea
                      rows={2}
                      value={enrollForm.note}
                      onChange={(e) => setEnrollForm({ ...enrollForm, note: e.target.value })}
                      placeholder="Any specific questions about batch schedule or materials..."
                      className="rounded-xl border-slate-200 text-xs sm:text-sm resize-none"
                    />
                  </div>

                  {enrollErrorMessage && (
                    <div className="rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700">
                      {enrollErrorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={enrollSubmitting}
                    className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    {enrollSubmitting ? (
                      <>
                        <Spinner className="h-4 w-4 mr-2" />
                        <span>{t("teacherStorefront.enrollmentModal.submitting", "Submitting...")}</span>
                      </>
                    ) : (
                      <span>{t("teacherStorefront.enrollmentModal.submit", "Submit Request")}</span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </PublicQuizShell>
  );
}
