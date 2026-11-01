"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import {
  Archive,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useI18n } from "@/hooks/use-i18n";
import { archiveClassBatch, duplicateClassBatch, fetchClassBatches } from "@/lib/classes-api";
import { getClientCookie } from "@/lib/cookie.client";
import type { ClassBatch, ClassBatchStatus } from "@/types/classes";
import { type Course, localize } from "@/types/quiz";

const ALL = "all";

function statusVariant(status: ClassBatchStatus): "default" | "secondary" | "outline" {
  if (status === "Published") return "default";
  if (status === "Archived") return "secondary";
  return "outline";
}

export function ManageClassesList() {
  const { locale, t } = useI18n();
  const [classes, setClasses] = useState<ClassBatch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState<ClassBatchStatus | "">("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [academicYear, setAcademicYear] = useState<number | "">("");

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedGrade = useDebouncedValue(grade, 300);
  const debouncedSubject = useDebouncedValue(subject, 300);

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || courseId || status || debouncedGrade.trim() || debouncedSubject.trim() || academicYear,
  );

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    fetch(`${APP_CONFIG.apiUrl}/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.items ?? []);
        setCourses(items);
      })
      .catch(() => {
        // ignore load course error
      });
  }, []);

  const load = useCallback(
    async (pageNum = page) => {
      setLoading(true);
      try {
        const res = await fetchClassBatches({
          page: pageNum,
          pageSize,
          search: debouncedSearch,
          courseId: courseId || undefined,
          status: status || undefined,
          grade: debouncedGrade || undefined,
          subject: debouncedSubject || undefined,
          academicYear: academicYear || undefined,
        });
        setClasses(res.items ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setPage(res.page ?? pageNum);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch, courseId, status, debouncedGrade, debouncedSubject, academicYear],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const handleDuplicate = async (batch: ClassBatch) => {
    setBusyId(batch.id);
    try {
      await duplicateClassBatch(batch.id);
      toast.success("Class batch duplicated (Draft)");
      await load(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate class");
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (batch: ClassBatch) => {
    setBusyId(batch.id);
    try {
      await archiveClassBatch(batch.id);
      toast.success("Class batch archived");
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive class");
    } finally {
      setBusyId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCourseId("");
    setStatus("");
    setGrade("");
    setSubject("");
    setAcademicYear("");
    setPage(1);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">{t("classes.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("classes.subtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/classes/new">
            <Plus className="mr-1 size-4" />
            {t("classes.createClass")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("classes.searchPlaceholder")}
              className="pl-9"
            />
          </div>

          <Select value={courseId || ALL} onValueChange={(v) => setCourseId(v === ALL ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("classes.allCourses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("classes.allCourses")}</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {localize(c.title, locale) || "Untitled"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? "" : (v as ClassBatchStatus))}>
            <SelectTrigger>
              <SelectValue placeholder={t("classes.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("classes.allStatuses")}</SelectItem>
              <SelectItem value="Draft">{t("classes.statusDraft")}</SelectItem>
              <SelectItem value="Published">{t("classes.statusPublished")}</SelectItem>
              <SelectItem value="Archived">{t("classes.statusArchived")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={academicYear ? String(academicYear) : ALL}
            onValueChange={(v) => setAcademicYear(v === ALL ? "" : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("classes.allYears")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("classes.allYears")}</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder={t("classes.gradeFilterPlaceholder")}
            />
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t("classes.clearFilters")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2">
          <Spinner className="size-6" />
          <span className="text-muted-foreground text-sm">Loading classes…</span>
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <GraduationCap className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-semibold text-base">{t("classes.noClasses")}</p>
              <p className="text-muted-foreground text-sm">{t("classes.noClassesHint")}</p>
            </div>
            <Button asChild size="sm">
              <Link href="/admin/classes/new">
                <Plus className="mr-1 size-4" />
                {t("classes.createClass")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((batch) => {
            const titleText = localize(batch.title, locale) || "Untitled class";
            const courseTitleText = localize(batch.course?.title, locale) || "Course";
            const isBusy = busyId === batch.id;

            return (
              <Card key={batch.id} className="transition hover:border-primary/40">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/classes/${batch.id}`}
                        className="font-semibold text-base hover:text-primary hover:underline"
                      >
                        {titleText}
                      </Link>
                      <Badge variant={statusVariant(batch.status)}>
                        {batch.status === "Published"
                          ? t("classes.statusPublished")
                          : batch.status === "Archived"
                            ? t("classes.statusArchived")
                            : t("classes.statusDraft")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {batch.academicYear}
                      </Badge>
                      {batch.grade ? (
                        <Badge variant="secondary" className="text-xs">
                          {batch.grade}
                        </Badge>
                      ) : null}
                      {batch.subject ? (
                        <Badge variant="outline" className="text-xs">
                          {batch.subject}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
                      <span>
                        {t("classes.course")}: <strong className="text-foreground">{courseTitleText}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {t("classes.studentsEnrolled").replace("{count}", String(batch.activeEnrollmentCount))}
                        {batch.capacity ? ` / ${batch.capacity}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        {t("classes.schedulesCount").replace("{count}", String(batch.scheduleCount))}
                      </span>
                      <span>
                        {batch.languages.map((l) => l.toUpperCase()).join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/classes/${batch.id}`}>
                        <Eye className="mr-1 size-3.5" />
                        {t("classes.tabs.overview")}
                      </Link>
                    </Button>
                    {batch.status !== "Archived" ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/classes/${batch.id}/edit`}>
                          <Pencil className="mr-1 size-3.5" />
                          {t("classes.editClass")}
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDuplicate(batch)}
                    >
                      <Copy className="mr-1 size-3.5" />
                      {t("classes.duplicate")}
                    </Button>
                    {batch.status !== "Archived" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleArchive(batch)}
                      >
                        <Archive className="mr-1 size-3.5" />
                        {t("classes.archive")}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-muted-foreground text-xs">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => void load(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => void load(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

