"use client";

import dynamic from "next/dynamic";

const GlobalSiteLoader = dynamic(() => import("@/components/site/global-site-loader").then((m) => m.GlobalSiteLoader), {
  ssr: false,
});

const Toaster = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), {
  ssr: false,
});

/** Lazy toast + imperative loader — keeps sonner/next-themes off the critical path. */
export function DeferredAppChrome() {
  return (
    <>
      <GlobalSiteLoader />
      <Toaster />
    </>
  );
}
