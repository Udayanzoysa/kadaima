"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type SeoForm = {
  siteName: string;
  metaTitle: string;
  metaDescription: string;
  googleAnalyticsId: string;
  ogImageUrl: string;
  keywords: string;
};

const EMPTY: SeoForm = {
  siteName: APP_CONFIG.name,
  metaTitle: APP_CONFIG.meta.title,
  metaDescription: APP_CONFIG.meta.description,
  googleAnalyticsId: "G-80G4MMHK8B",
  ogImageUrl: "",
  keywords: "online exam, quiz portal, scholarship, O/L, A/L, Sri Lanka, Kadaima",
};

export function BrandingSeoSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SeoForm>(EMPTY);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/settings/seo`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Could not load branding / SEO settings");
        const data = await res.json();
        setForm({
          siteName: data.siteName ?? EMPTY.siteName,
          metaTitle: data.metaTitle ?? EMPTY.metaTitle,
          metaDescription: data.metaDescription ?? EMPTY.metaDescription,
          googleAnalyticsId: data.googleAnalyticsId ?? "",
          ogImageUrl: data.ogImageUrl ?? "",
          keywords: data.keywords ?? "",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load SEO settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set =
    (key: keyof SeoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    const token = getClientCookie("session_token");
    if (!token) return;

    const ga = form.googleAnalyticsId.trim().toUpperCase();
    if (ga && !/^G-[A-Z0-9]+$/.test(ga)) {
      toast.error("Google Analytics ID must look like G-XXXXXXXX");
      return;
    }
    if (!form.metaTitle.trim() || !form.metaDescription.trim()) {
      toast.error("Meta title and description are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/seo`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteName: form.siteName.trim(),
          metaTitle: form.metaTitle.trim(),
          metaDescription: form.metaDescription.trim(),
          googleAnalyticsId: ga,
          ogImageUrl: form.ogImageUrl.trim(),
          keywords: form.keywords.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Could not save");
      }
      const data = await res.json();
      setForm({
        siteName: data.siteName ?? "",
        metaTitle: data.metaTitle ?? "",
        metaDescription: data.metaDescription ?? "",
        googleAnalyticsId: data.googleAnalyticsId ?? "",
        ogImageUrl: data.ogImageUrl ?? "",
        keywords: data.keywords ?? "",
      });
      toast.success("Branding & SEO settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl border-border">
      <CardHeader>
        <CardTitle>Site branding & SEO</CardTitle>
        <CardDescription>
          Controls the public site title, meta description, Open Graph image, and Google Analytics
          (gtag) measurement ID. Changes apply site-wide within about a minute.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field className="gap-1.5">
          <FieldLabel htmlFor="seo-site-name">Site name</FieldLabel>
          <Input id="seo-site-name" value={form.siteName} onChange={set("siteName")} />
          <FieldDescription>Short brand name (e.g. Kadaima).</FieldDescription>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="seo-meta-title">Meta title</FieldLabel>
          <Input id="seo-meta-title" value={form.metaTitle} onChange={set("metaTitle")} />
          <FieldDescription>Browser tab / search result title (≈ 50–60 characters).</FieldDescription>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="seo-meta-description">Meta description</FieldLabel>
          <Textarea
            id="seo-meta-description"
            value={form.metaDescription}
            onChange={set("metaDescription")}
            className="min-h-[100px]"
          />
          <FieldDescription>Search snippet text (≈ 150–160 characters).</FieldDescription>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="seo-keywords">Keywords</FieldLabel>
          <Input
            id="seo-keywords"
            value={form.keywords}
            onChange={set("keywords")}
            placeholder="online exam, quiz, scholarship"
          />
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="seo-og-image">Open Graph image URL</FieldLabel>
          <Input
            id="seo-og-image"
            value={form.ogImageUrl}
            onChange={set("ogImageUrl")}
            placeholder="https://www.kadaima.com/brand/og.png"
          />
          <FieldDescription>Optional social share image (absolute URL preferred).</FieldDescription>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="seo-ga">Google Analytics ID (gtag)</FieldLabel>
          <Input
            id="seo-ga"
            value={form.googleAnalyticsId}
            onChange={set("googleAnalyticsId")}
            placeholder="G-80G4MMHK8B"
            className="font-mono"
          />
          <FieldDescription>
            GA4 measurement ID. Leave blank to disable tracking. Example: G-80G4MMHK8B
          </FieldDescription>
        </Field>

        <div className="flex justify-end pt-2">
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Spinner className="size-4" /> : null}
            Save branding & SEO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
