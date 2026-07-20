import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";

/** Take-quiz has its own full-bleed layout (no list shell). */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#f4f7fb]">
      <PublicContentSkeleton variant="detail" className="py-10" />
    </div>
  );
}
