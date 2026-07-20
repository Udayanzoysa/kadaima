import type { ReactNode } from "react";

import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Account",
    description: "Sign in or create your Kadaima account.",
    path: "/auth",
    noIndex: true,
  }),
};

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
