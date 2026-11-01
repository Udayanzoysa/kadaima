import type { Metadata } from "next";

import { Suspense } from "react";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { APP_CONFIG } from "@/config/app-config";
import { buildPageMetadata } from "@/lib/page-seo";
import { getSiteSeo } from "@/lib/site-seo";

import { LeaderboardView } from "./_components/leaderboard-view";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();
  return buildPageMetadata({
    title: "Leaderboard | " + (seo.siteName || APP_CONFIG.name),
    description: "Check out the top performers on our learning platform.",
    path: "/leaderboard",
    siteName: seo.siteName || APP_CONFIG.name,
  });
}

export default function LeaderboardPage() {
  return (
    <PublicQuizShell activeNav="leaderboard">
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-6 sm:px-4 md:px-6 md:py-10">
        <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading Leaderboard...</div>}>
          <LeaderboardView />
        </Suspense>
      </main>
    </PublicQuizShell>
  );
}
