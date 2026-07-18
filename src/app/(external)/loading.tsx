import { KadaimaLoader } from "@/components/site/kadaima-loader";

/** Lightweight route fallback — avoid covering SSR hero on hard refresh. */
export default function Loading() {
  return (
    <KadaimaLoader
      variant="inline"
      label="Kadaima is loading…"
      className="min-h-[40vh] bg-transparent"
    />
  );
}