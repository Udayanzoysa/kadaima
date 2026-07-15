"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import {
  emptyLocalizedText,
  type Course,
  type CourseStatus,
  type LocalizedText,
} from "@/types/quiz";

type ContentLang = "en" | "si" | "ta";

const LANG_LABELS: Record<ContentLang, string> = {
  en: "English",
  si: "Sinhala",
  ta: "Tamil",
};

interface CourseFormProps {
  courseId?: string;
}

export function CourseForm({ courseId }: CourseFormProps) {
  const router = useRouter();
  const isEdit = Boolean(courseId);
  const [activeLang, setActiveLang] = useState<ContentLang>("en");
  const [title, setTitle] = useState<LocalizedText>(emptyLocalizedText());
  const [description, setDescription] = useState<LocalizedText>(emptyLocalizedText());
  const [status, setStatus] = useState<CourseStatus>("Draft");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    const token = getClientCookie("session_token");
    if (!token) return;

    fetch(`${APP_CONFIG.apiUrl}/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load course");
        const data: Course = await res.json();
        setTitle(data.title ?? emptyLocalizedText());
        setDescription(data.description ?? emptyLocalizedText());
        setStatus((data.status as CourseStatus) ?? "Draft");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [courseId]);

  const save = async () => {
    if (title.en.trim().length < 2) {
      toast.error("English title is required (min 2 characters)");
      return;
    }
    const token = getClientCookie("session_token");
    if (!token) return;

    setSaving(true);
    try {
      const payload = {
        title: {
          en: title.en.trim(),
          si: title.si.trim() || title.en.trim(),
          ta: title.ta.trim() || title.en.trim(),
        },
        description: {
          en: description.en.trim(),
          si: description.si.trim() || description.en.trim(),
          ta: description.ta.trim() || description.en.trim(),
        },
        status,
      };

      const res = await fetch(
        isEdit ? `${APP_CONFIG.apiUrl}/courses/${courseId}` : `${APP_CONFIG.apiUrl}/courses`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not save course");
      }
      toast.success(isEdit ? "Course updated" : "Course created");
      router.push("/admin/courses");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save course");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading course…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
          {isEdit ? "Edit Course" : "Add Course"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter titles and descriptions in English, Sinhala, and Tamil.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Course details</CardTitle>
          <CardDescription>Localized content and publish status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(["en", "si", "ta"] as const).map((lang) => (
              <Button
                key={lang}
                type="button"
                size="sm"
                variant={activeLang === lang ? "default" : "outline"}
                onClick={() => setActiveLang(lang)}
              >
                {LANG_LABELS[lang]}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Title ({LANG_LABELS[activeLang]})</FieldLabel>
              <Input
                value={title[activeLang]}
                onChange={(e) => setTitle((prev) => ({ ...prev, [activeLang]: e.target.value }))}
                placeholder="Course title"
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onValueChange={(v) => setStatus(v as CourseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Public</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>Description ({LANG_LABELS[activeLang]})</FieldLabel>
            <Textarea
              value={description[activeLang]}
              onChange={(e) =>
                setDescription((prev) => ({ ...prev, [activeLang]: e.target.value }))
              }
              placeholder="Optional description"
              rows={4}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? <Spinner className="size-4" /> : null}
              {isEdit ? "Save changes" : "Create course"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/courses">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
