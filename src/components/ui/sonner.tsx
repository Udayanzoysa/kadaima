"use client";

import { useEffect, useState } from "react";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Prefer document theme class — avoids pulling next-themes into every page. */
function useDocumentTheme(): ToasterProps["theme"] {
  const [theme, setTheme] = useState<ToasterProps["theme"]>("light");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useDocumentTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
        ),
        info: <InfoIcon className="size-5 shrink-0 text-blue-600 dark:text-blue-500" />,
        warning: (
          <TriangleAlertIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-500" />
        ),
        error: <OctagonXIcon className="size-5 text-destructive shrink-0" />,
        loading: <Loader2Icon className="size-5 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--description-color": "var(--muted-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast cn-toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:border group-[.toaster]:p-4 group-[.toaster]:rounded-xl group-[.toaster]:flex group-[.toaster]:gap-3 group-[.toaster]:items-start",
          title:
            "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:!text-neutral-950 dark:group-[.toast]:!text-neutral-50",
          description:
            "group-[.toast]:text-xs group-[.toast]:!text-neutral-800 dark:group-[.toast]:!text-neutral-200 group-[.toast]:mt-1 group-[.toast]:leading-normal group-[.toast]:break-words",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
