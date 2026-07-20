import { cn } from "@/lib/utils";

/**
 * Coming-soon App Store / Google Play badges for the public footer.
 * Non-clickable until real store URLs exist.
 */
export function FooterAppStores({
  comingSoonLabel,
  className,
  compact = false,
}: {
  comingSoonLabel: string;
  className?: string;
  /** Hide the “coming soon” line — useful on tight mobile footers */
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {compact ? (
        <span className="sr-only">{comingSoonLabel}</span>
      ) : (
        <span className="text-[11px] leading-snug font-medium text-slate-600">{comingSoonLabel}</span>
      )}
      <div className="flex w-full flex-wrap items-center justify-center gap-1.5 md:justify-start">
        <span
          role="img"
          aria-label="Google Play — coming soon"
          title={comingSoonLabel}
          className="inline-flex min-w-0 flex-1 select-none [&_svg]:h-7 [&_svg]:w-auto"
        >
          <GooglePlayBadge />
        </span>
        <span
          role="img"
          aria-label="App Store — coming soon"
          title={comingSoonLabel}
          className="inline-flex min-w-0 flex-1 select-none [&_svg]:h-7 [&_svg]:w-auto"
        >
          <AppStoreBadge />
        </span>
      </div>
    </div>
  );
}

function GooglePlayBadge() {
  return (
    <svg
      width="120"
      height="36"
      viewBox="0 0 135 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="h-7 w-auto max-w-full"
    >
      <rect width="135" height="40" rx="6" fill="#111827" />
      <g transform="translate(8,7)">
        <path
          d="M1.2 1.1c-.3.3-.5.8-.5 1.4v21c0 .6.2 1.1.5 1.4l.1.1 11.8-11.8v-.3L1.3 1z"
          fill="#00A0FF"
        />
        <path
          d="M17.8 17.6 14 13.8 1.3 26.5c.4.4 1 .4 1.7.1l14.8-8.4.1-.1-.1-.5z"
          fill="#FF3A44"
        />
        <path
          d="M17.8 8.4 3 .1C2.3-.2 1.7-.2 1.3.2L14 12.9l3.8-3.8.1-.2-.1-.5z"
          fill="#FFD500"
        />
        <path
          d="M17.8 17.6 14 13.8 17.8 10c.7-.4 1.3-.2 1.3.6v6.4c0 .8-.6 1-1.3.6z"
          fill="#00F076"
        />
      </g>
      <g fill="#fff" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif">
        <text x="36" y="15" fontSize="7.5" fill="#9ca3af">
          GET IT ON
        </text>
        <text x="36" y="29" fontSize="13" fontWeight="600">
          Google Play
        </text>
      </g>
    </svg>
  );
}

function AppStoreBadge() {
  return (
    <svg
      width="108"
      height="36"
      viewBox="0 0 120 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="h-7 w-auto max-w-full"
    >
      <rect width="120" height="40" rx="6" fill="#111827" />
      <path
        fill="#fff"
        d="M24.6 20.4c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6-.03-.01-2.5-1-2.5-3.8zm-2.4-7c.7-.8 1.1-1.9 1-3-.9.1-2.1.6-2.7 1.4-.6.7-1.1 1.9-1 2.9 1.1.1 2.1-.5 2.7-1.3z"
        transform="translate(2,0)"
      />
      <g fill="#fff" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif">
        <text x="36" y="15" fontSize="7" fill="#9ca3af">
          Download on the
        </text>
        <text x="36" y="29" fontSize="13" fontWeight="600">
          App Store
        </text>
      </g>
    </svg>
  );
}
