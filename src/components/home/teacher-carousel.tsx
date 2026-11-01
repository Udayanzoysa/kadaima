"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import type { FeaturedTeacher } from "@/types/featured-teacher";

import { TeacherCard } from "./teacher-card";

export function TeacherCarousel({
  teachers,
  className,
}: {
  teachers: FeaturedTeacher[];
  className?: string;
}) {
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(teachers.length > 1);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

    // Calculate active slide index based on scroll position
    const cardWidth = el.firstElementChild?.clientWidth ?? clientWidth;
    const gap = 16;
    const index = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.max(0, Math.min(index, teachers.length - 1)));
  }, [teachers.length]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollToIndex = (index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const cards = el.children;
    if (!cards[index]) return;

    const targetCard = cards[index] as HTMLElement;
    el.scrollTo({
      left: targetCard.offsetLeft - el.offsetLeft,
      behavior: "smooth",
    });
  };

  const handlePrev = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 220;
    el.scrollBy({ left: -(cardWidth + 16), behavior: "smooth" });
  };

  const handleNext = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 220;
    el.scrollBy({ left: cardWidth + 16, behavior: "smooth" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  if (teachers.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#DFE7F1] bg-white/70 p-6 text-center">
        <p className="font-semibold text-base text-[#12243E]">
          {t("teachersSection.meetTeachersSoon") || "Meet our certified teachers soon"}
        </p>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          {t("teachersSection.emptySubtitle") ||
            "Our verified teacher community is growing rapidly across Sri Lanka."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex w-full flex-col", className)}
      onKeyDown={handleKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Teachers Carousel"
    >
      {/* Cards container with floating arrows */}
      <div className="relative flex items-center">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canScrollLeft}
          className={cn(
            "absolute -left-3.5 z-20 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all sm:-left-4 hover:bg-slate-50 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/50",
            !canScrollLeft && "pointer-events-none opacity-0 sm:opacity-30",
          )}
          aria-label={t("teachersSection.previousTeacher") || "Previous teacher"}
        >
          <ChevronLeft className="size-4.5" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex w-full gap-3.5 overflow-x-auto scroll-smooth py-1 px-1 sm:gap-4 snap-x snap-mandatory"
          tabIndex={0}
          role="group"
          aria-label="Teachers list"
        >
          {teachers.map((teacher, idx) => (
            <div
              key={teacher.id || teacher.slug || idx}
              className="w-[80vw] max-w-[270px] shrink-0 snap-center sm:w-[230px] md:w-[220px] lg:w-[200px] xl:w-[220px] snap-start"
            >
              <TeacherCard teacher={teacher} className="h-full" />
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canScrollRight}
          className={cn(
            "absolute -right-3.5 z-20 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all sm:-right-4 hover:bg-slate-50 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769D2]/50",
            !canScrollRight && "pointer-events-none opacity-0 sm:opacity-30",
          )}
          aria-label={t("teachersSection.nextTeacher") || "Next teacher"}
        >
          <ChevronRight className="size-4.5" />
        </button>
      </div>

      {/* Pagination Dots */}
      {teachers.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
          {teachers.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex
                  ? "w-4 bg-[#1769D2]"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

