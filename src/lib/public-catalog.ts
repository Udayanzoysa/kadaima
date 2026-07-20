import type { LocalizedText } from "@/types/quiz";
import { localize } from "@/types/quiz";

export type CourseKind = "scholarship" | "ol" | "al" | "driving" | "other";

const COURSE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Strip HTML tags for card/SEO plain text. */
export function plainFromHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidCourseId(courseId: string): boolean {
  return COURSE_UUID_RE.test(courseId.trim());
}

/** Classify exam category from English course title. */
export function courseKindFromTitle(title: LocalizedText | string | null | undefined): CourseKind {
  const enTitle =
    typeof title === "object" && title && "en" in title
      ? String((title as LocalizedText).en ?? "")
      : String(title ?? "");
  const t = enTitle.toLowerCase();
  if (t.includes("scholarship")) return "scholarship";
  if (t.includes("ordinary") || t.includes("(o/l)") || /\bo\/l\b/.test(t)) return "ol";
  if (t.includes("advanced") || t.includes("(a/l)") || /\ba\/l\b/.test(t)) return "al";
  if (t.includes("driving") || t.includes("licence") || t.includes("license")) return "driving";
  return "other";
}

export function categoryRankFromKind(kind: CourseKind): number {
  if (kind === "scholarship") return 0;
  if (kind === "ol") return 1;
  if (kind === "al") return 2;
  if (kind === "driving") return 3;
  return 4;
}

export function shortCourseLabel(
  title: LocalizedText | string | null | undefined,
  locale: string,
): string {
  const kind = courseKindFromTitle(title);
  if (kind === "scholarship") {
    return locale === "si"
      ? "5 ශ්‍රේණි ශිෂ්‍යත්ව"
      : locale === "ta"
        ? "தரம் 5 புலமை"
        : "Grade 5 Scholarship";
  }
  if (kind === "ol") return "G.C.E. O/L";
  if (kind === "al") return "G.C.E. A/L";
  if (kind === "driving") {
    return locale === "si"
      ? "රියදුරු බලපත්‍ර"
      : locale === "ta"
        ? "ஓட்டுநர் உரிமம்"
        : "Driving Licence Exam";
  }
  const full = localize(
    (typeof title === "string" ? { en: title, si: "", ta: "" } : title) as LocalizedText,
    locale as "en" | "si" | "ta",
  );
  return full.length > 28 ? `${full.slice(0, 26)}…` : full;
}

export function courseSectionSubtitleKey(kind: CourseKind): string {
  if (kind === "scholarship") return "public.sectionSubtitleScholarship";
  if (kind === "ol") return "public.sectionSubtitleOl";
  if (kind === "al") return "public.sectionSubtitleAl";
  if (kind === "driving") return "public.sectionSubtitleDriving";
  return "public.categorySubtitle";
}

/** Build course See All href with optional module filter. */
export function coursePageHref(courseId: string, moduleId?: string | null): string {
  const id = courseId.trim();
  if (!id) return "/quiz";
  if (moduleId && moduleId !== "all") {
    return `/quiz/course/${id}?module=${encodeURIComponent(moduleId)}`;
  }
  return `/quiz/course/${id}`;
}

/** Filter quizzes by active module (student course page). */
export function filterQuizzesByModule<T extends { module?: { id: string } | null }>(
  quizzes: T[],
  moduleId: string | "all",
): T[] {
  if (moduleId === "all" || !moduleId) return quizzes;
  return quizzes.filter((q) => q.module?.id === moduleId);
}
