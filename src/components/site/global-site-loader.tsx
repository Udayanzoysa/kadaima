"use client";

import { Spinner } from "@/components/ui/spinner";
import { useGlobalLoaderStore } from "@/stores/global-loader-store";

/**
 * Imperative tasks only (login, uploads). No navigation blur overlay —
 * pages use skeletons / admin uses its own regular loader.
 */
export function GlobalSiteLoader() {
  const count = useGlobalLoaderStore((s) => s.count);
  const label = useGlobalLoaderStore((s) => s.label);

  if (count <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px]"
    >
      <Spinner className="size-7 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
