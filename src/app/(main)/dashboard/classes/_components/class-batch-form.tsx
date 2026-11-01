"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { createClassBatch, fetchClassBatchById, updateClassBatch } from "@/lib/classes-api";
import { getClientCookie } from "@/lib/cookie.client";
import type { ClassBatchStatus } from "@/types/classes";
import {
  type Course,
  emptyLocalizedText,
  type LocalizedText,
  localize,
  type SupportedLocale,
} from "@/types/quiz";

const LANG_OPTIONS: Array<{ code: SupportedLocale; label: string }> = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල" },
  { code: "ta", label: "தமிழ்" },
];

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function ClassBatchForm({ classId }: { classId?: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const isEdit = Boolean(classId);

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [activeLang, setActiveLang] = useState<SupportedLocale>("en");
  const [title, setTitle] = useState<LocalizedText>(emptyLocalizedText());
  const [description, setDescription] = useState<LocalizedText>(emptyLocalizedText());
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [academicYear, setAcademicYear] = useState<number>(new Date().getFullYear());
  const [languages, setLanguages] = useState<SupportedLocale[]>(["en"]);
  const [capacity, setCapacity] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<ClassBatchStatus>("Draft");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;

    const loadAll = async () => {
      setLoading(true);
      try {
        const coursesRes = await fetch(`${APP_CONFIG.apiUrl}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (coursesRes.ok) {
          const data = await coursesRes.json();
          const list: Course[] = Array.isArray(data) ? data : (data.items ?? []);
          setCourses(list);
          if (!isEdit && list.length > 0 && !courseId) {
            setCourseId(list[0].id);
          }
        }

        if (classId) {
          const batch = await fetchClassBatchById(classId);
          setCourseId(batch.courseId);
          setTitle(batch.title ?? emptyLocalizedText());
          setDescription(batch.description ?? emptyLocalizedText());
          setGrade(batch.grade ?? "");
          setSubject(batch.subject ?? "");
          setAcademicYear(batch.academicYear);
          setLanguages(batch.languages?.length ? batch.languages : ["en"]);
          setCapacity(batch.capacity ? String(batch.capacity) : "");
          setStartDate(toDateInputValue(batch.startDate));
          setEndDate(toDateInputValue(batch.endDate));
          setStatus(batch.status);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, [classId, isEdit]);

  const toggleLanguage = (code: SupportedLocale) => {
    setLanguages((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev;
        return prev.filter((l) => l !== code);
      }
      return [...prev, code];
    });
  };

  const handleSave = async () => {
    if (!courseId) {
      toast.error("Please select a course");
      return;
    }
    if (title.en.trim().length < 2) {
      toast.error("English class title is required (minimum 2 characters)");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        courseId,
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
        grade: grade.trim() || null,
        subject: subject.trim() || null,
        academicYear: Number(academicYear) || new Date().getFullYear(),
        languages,
        capacity: capacity.trim() ? Number(capacity) : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        status,
      };

      const saved = isEdit && classId
        ? await updateClassBatch(classId, payload)
        : await createClassBatch(payload);

      toast.success(isEdit ? "Class batch updated" : "Class batch created");
      router.push(`/admin/classes/${saved.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save class");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">
            {isEdit ? t("classes.editClass") : t("classes.createClass")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("classes.subtitle")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={classId ? `/admin/classes/${classId}` : "/admin/classes"}>
            {t("classes.backToClasses")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("classes.classTitle")}</CardTitle>
          <CardDescription>
            Link this batch to an existing Course and enter localized batch titles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("classes.course")} *</FieldLabel>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("classes.selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {localize(c.title, locale) || "Untitled"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>{t("classes.status")}</FieldLabel>
              <Select value={status} onValueChange={(v) => setStatus(v as ClassBatchStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">{t("classes.statusDraft")}</SelectItem>
                  <SelectItem value="Published">{t("classes.statusPublished")}</SelectItem>
                  <SelectItem value="Archived">{t("classes.statusArchived")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex gap-2">
            {LANG_OPTIONS.map((lang) => (
              <Button
                key={lang.code}
                type="button"
                size="sm"
                variant={activeLang === lang.code ? "default" : "outline"}
                onClick={() => setActiveLang(lang.code)}
              >
                {lang.label}
              </Button>
            ))}
          </div>

          <Field>
            <FieldLabel>
              {t("classes.classTitle")} ({activeLang.toUpperCase()}) {activeLang === "en" ? "*" : ""}
            </FieldLabel>
            <Input
              value={title[activeLang]}
              onChange={(e) => setTitle((prev) => ({ ...prev, [activeLang]: e.target.value }))}
              placeholder="e.g. Grade 10 Mathematics — Saturday 9:00 AM"
            />
          </Field>

          <Field>
            <FieldLabel>
              {t("classes.description")} ({activeLang.toUpperCase()})
            </FieldLabel>
            <Textarea
              rows={3}
              value={description[activeLang]}
              onChange={(e) => setDescription((prev) => ({ ...prev, [activeLang]: e.target.value }))}
              placeholder="Cohort details, syllabus coverage, and instructions..."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>{t("classes.grade")}</FieldLabel>
              <Input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder={t("classes.gradePlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel>{t("classes.subject")}</FieldLabel>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("classes.subjectPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel>{t("classes.academicYear")} *</FieldLabel>
              <Input
                type="number"
                min={2020}
                max={2100}
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>{t("classes.capacity")}</FieldLabel>
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={t("classes.capacityPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel>{t("classes.startDate")}</FieldLabel>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel>{t("classes.endDate")}</FieldLabel>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("classes.teachingLanguages")}</FieldLabel>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {LANG_OPTIONS.map((lang) => (
                <label key={lang.code} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={languages.includes(lang.code)}
                    onCheckedChange={() => toggleLanguage(lang.code)}
                  />
                  <span>{lang.label}</span>
                </label>
              ))}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("classes.saving") : t("classes.saveClass")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

