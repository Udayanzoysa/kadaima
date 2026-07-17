"use client";

import type { ReactNode } from "react";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { I18nProvider } from "@/hooks/use-i18n";

export function SiteStaticPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <I18nProvider>
      <PublicQuizShell>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6 md:py-12">
          <header className="mb-8 space-y-2 border-b border-slate-200 pb-6">
            <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-[#123a6b] md:text-3xl">
              {title}
            </h1>
            {subtitle ? <p className="text-sm text-slate-500 md:text-base">{subtitle}</p> : null}
          </header>
          <div className="space-y-5 text-sm leading-relaxed text-slate-600 md:text-[15px] [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
            {children}
          </div>
        </main>
      </PublicQuizShell>
    </I18nProvider>
  );
}
