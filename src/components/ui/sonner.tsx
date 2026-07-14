"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 text-emerald-600 dark:text-emerald-500 shrink-0" />
        ),
        info: (
          <InfoIcon className="size-5 text-blue-600 dark:text-blue-500 shrink-0" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5 text-amber-600 dark:text-amber-500 shrink-0" />
        ),
        error: (
          <OctagonXIcon className="size-5 text-destructive shrink-0" />
        ),
        loading: (
          <Loader2Icon className="size-5 text-muted-foreground animate-spin shrink-0" />
        ),
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
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:!text-neutral-950 dark:group-[.toast]:!text-neutral-50",
          description: "group-[.toast]:text-xs group-[.toast]:!text-neutral-800 dark:group-[.toast]:!text-neutral-200 group-[.toast]:mt-1 group-[.toast]:leading-normal group-[.toast]:break-words",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
