import Link from "next/link";
import { Mail } from "lucide-react";
import { siWhatsapp } from "simple-icons";

import { BrandLogo } from "@/components/brand/brand-logo";
import { FooterAppStores } from "@/components/site/footer-app-stores";
import { FooterPoweredBy } from "@/components/site/footer-powered-by";
import { SimpleIcon } from "@/components/simple-icon";
import { cn } from "@/lib/utils";

export type PublicFooterLink = {
  href: string;
  label: string;
};

type PublicSiteFooterProps = {
  copyright: string;
  links: PublicFooterLink[];
  exploreLinks?: PublicFooterLink[];
  appStoresComingSoon: string;
  aboutSummary?: string;
  usefulLinksHeading?: string;
  exploreLinksHeading?: string;
  getAppHeading?: string;
  infoEmail?: string;
  whatsappDisplay?: string;
  whatsappE164?: string;
  emailLabel?: string;
  poweredByBefore?: string;
  poweredByAfter?: string;
  withMobileNavPad?: boolean;
  className?: string;
};

function formatWhatsappHref(e164: string) {
  const digits = e164.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent("Hi Kadaima!")}`;
}

function DesktopLinkCol({
  heading,
  links,
}: {
  heading: string;
  links: PublicFooterLink[];
}) {
  if (links.length === 0) return null;
  return (
    <div className="hidden flex-col gap-1.5 md:flex">
      <h2 className="text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">
        {heading}
      </h2>
      <nav aria-label={heading} className="flex flex-col gap-0.5">
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="rounded-md py-0.5 text-[13px] font-medium text-slate-700 transition hover:text-[#1563b8]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/**
 * Minimal public footer — compact on mobile, 4 columns from md up.
 */
export function PublicSiteFooter({
  copyright,
  links,
  exploreLinks = [],
  appStoresComingSoon,
  aboutSummary = "Online exam & quiz portal for students and teachers.",
  usefulLinksHeading = "Useful links",
  exploreLinksHeading = "Explore",
  getAppHeading = "Get the app",
  infoEmail = "info@kadaima.com",
  whatsappDisplay = "WhatsApp",
  whatsappE164 = "94775075179",
  emailLabel = "Email",
  poweredByBefore,
  poweredByAfter,
  withMobileNavPad = true,
  className,
}: PublicSiteFooterProps) {
  const whatsappHref = formatWhatsappHref(whatsappE164);
  const allLinks = [...links, ...exploreLinks];

  return (
    <footer
      className={cn(
        "relative z-10 shrink-0 border-t border-slate-200/80 bg-[#e8eef5]",
        withMobileNavPad
          ? "pb-[max(4.25rem,calc(3.25rem+env(safe-area-inset-bottom)))] md:pb-0"
          : null,
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        {/* Mobile: compact stack */}
        <div className="flex flex-col items-center gap-3 text-center md:hidden">
          <Link href="/" className="inline-flex transition hover:opacity-90" aria-label="Kadaima home">
            <BrandLogo className="h-7 w-auto" />
          </Link>

          <nav
            aria-label="Footer"
            className="flex max-w-sm flex-wrap items-center justify-center gap-x-1 gap-y-1"
          >
            {allLinks.map((link, i) => (
              <span key={`${link.href}-${link.label}`} className="inline-flex items-center gap-1">
                {i > 0 ? <span className="text-slate-300" aria-hidden>·</span> : null}
                <Link
                  href={link.href}
                  className="rounded px-1 py-0.5 text-[12px] font-medium text-slate-600 transition hover:text-[#1563b8]"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex w-full max-w-[17rem] flex-col items-stretch gap-2">
            <FooterAppStores
              comingSoonLabel={appStoresComingSoon}
              className="items-center text-center [&_span:first-child]:text-[10px]"
              compact
            />
            <div className="grid grid-cols-2 gap-1.5">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
                >
                  <SimpleIcon icon={siWhatsapp} className="size-3.5" />
                  {whatsappDisplay}
                </a>
              ) : null}
              <a
                href={`mailto:${infoEmail}`}
                title={infoEmail}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-[#1563b8]/40 hover:text-[#1563b8]"
              >
                <Mail className="size-3.5 text-[#1563b8]" aria-hidden />
                {emailLabel}
              </a>
            </div>
          </div>
        </div>

        {/* Desktop / tablet */}
        <div className="hidden gap-8 md:grid md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 lg:col-span-1">
            <Link href="/" className="inline-flex w-fit transition hover:opacity-90" aria-label="Kadaima home">
              <BrandLogo className="h-8 w-auto" />
            </Link>
            <p className="max-w-xs text-[12px] leading-relaxed text-slate-600">{aboutSummary}</p>
          </div>

          <DesktopLinkCol heading={usefulLinksHeading} links={links} />
          <DesktopLinkCol heading={exploreLinksHeading} links={exploreLinks} />

          <div className="flex max-w-[15.5rem] flex-col gap-2">
            <h2 className="text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">
              {getAppHeading}
            </h2>
            <FooterAppStores comingSoonLabel={appStoresComingSoon} className="items-stretch" />
            <div className="grid grid-cols-2 gap-1.5">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
                >
                  <SimpleIcon icon={siWhatsapp} className="size-3.5" />
                  {whatsappDisplay}
                </a>
              ) : null}
              <a
                href={`mailto:${infoEmail}`}
                title={infoEmail}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-[#1563b8]/40 hover:text-[#1563b8]"
              >
                <Mail className="size-3.5 text-[#1563b8]" aria-hidden />
                {emailLabel}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 bg-[#e2e9f2]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-1 px-4 py-2 sm:flex-row sm:px-6">
          <p className="text-[10px] text-slate-500 sm:text-[11px]">{copyright}</p>
          <FooterPoweredBy
            labelBefore={poweredByBefore}
            labelAfter={poweredByAfter}
            className="text-[10px] text-slate-600 sm:text-[11px]"
          />
        </div>
      </div>
    </footer>
  );
}
