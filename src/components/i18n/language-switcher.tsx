"use client";

import { Check, ChevronDown, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  value: Locale;
  onChange: (locale: Locale) => void;
  /** Limit to these codes (e.g. quiz content languages). Defaults to all. */
  languages?: Locale[];
  /**
   * `dropdown` — header-style menu (default)
   * `buttons` — button row (quiz builder)
   */
  variant?: "dropdown" | "compact" | "pills" | "buttons";
  className?: string;
  showIcon?: boolean;
};

export function LanguageSwitcher({
  value,
  onChange,
  languages,
  variant = "dropdown",
  className,
  showIcon = true,
}: Props) {
  const options = languages?.length
    ? LOCALES.filter((l) => languages.includes(l.code))
    : LOCALES;

  if (options.length === 0) return null;

  if (variant === "buttons") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {options.map((l) => (
          <Button
            key={l.code}
            type="button"
            size="sm"
            variant={value === l.code ? "default" : "outline"}
            onClick={() => onChange(l.code)}
          >
            {l.label}
          </Button>
        ))}
      </div>
    );
  }

  // dropdown / compact / pills → same native-label dropdown
  const active = options.find((l) => l.code === value) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 max-w-[10.5rem] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-[#1563b8]/40 hover:text-[#1563b8]",
            className,
          )}
          aria-label={`${active.label}, change language`}
        >
          {showIcon ? <Globe className="size-3.5 shrink-0 text-slate-500" aria-hidden /> : null}
          <span className="truncate">{active.label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {options.map((l) => {
          const selected = l.code === active.code;
          return (
            <DropdownMenuItem
              key={l.code}
              onClick={() => onChange(l.code)}
              className={cn("cursor-pointer gap-2", selected && "bg-accent")}
            >
              <Check
                className={cn("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
              />
              <span>{l.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
