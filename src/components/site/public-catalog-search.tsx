"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Search } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import {
  labelForEntry,
  searchCatalogIndex,
  type CatalogIndex,
  type CatalogIndexEntry,
} from "@/lib/catalog-search";
import { coursePageHref } from "@/lib/public-catalog";
import { cn } from "@/lib/utils";

/**
 * Shared course/module search for home catalog and course pages.
 * Selecting a hit navigates to the course See All page (optional module filter).
 */
export function PublicCatalogSearch({
  className,
  inputClassName,
  onSelect,
  autoFocus = false,
}: {
  className?: string;
  inputClassName?: string;
  /** Override default navigation — e.g. home in-page filter. */
  onSelect?: (entry: CatalogIndexEntry) => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [catalogIndex, setCatalogIndex] = useState<CatalogIndex | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/catalog-index`);
        if (!res.ok) return;
        const data = (await res.json()) as CatalogIndex;
        if (!cancelled) setCatalogIndex(data);
      } catch {
        /* search stays empty until index loads */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const searchHits = useMemo(
    () => searchCatalogIndex(catalogIndex?.entries ?? [], debouncedQuery, 10),
    [catalogIndex, debouncedQuery],
  );

  const applyHit = (entry: CatalogIndexEntry) => {
    setSearchOpen(false);
    setSearchQuery(labelForEntry(entry, locale));
    if (onSelect) {
      onSelect(entry);
      return;
    }
    router.push(
      coursePageHref(
        entry.courseId,
        entry.type === "module" ? entry.moduleId : undefined,
      ),
    );
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setSearchOpen(false), 150);
        }}
        placeholder={t("public.searchCourses")}
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200/90 bg-white pr-3 pl-9 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#1563b8] focus:ring-2 focus:ring-[#1563b8]/20",
          inputClassName,
        )}
        autoComplete="off"
        autoFocus={autoFocus}
        aria-label={t("public.searchCourses")}
      />
      {searchOpen && debouncedQuery.length > 0 ? (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {searchHits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">{t("public.searchNoResults")}</p>
          ) : (
            searchHits.map((hit) => (
              <button
                key={`${hit.type}-${hit.id}`}
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#eef6ff]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyHit(hit)}
              >
                <span
                  className={cn(
                    "mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    hit.type === "course"
                      ? "bg-[#1563b8]/10 text-[#1563b8]"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {hit.type === "course" ? t("public.searchTypeCourse") : t("public.searchTypeModule")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">
                    {labelForEntry(hit, locale)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {t("public.quizCountShort").replace("{count}", String(hit.quizCount))}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
