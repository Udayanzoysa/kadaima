"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/app/(main)/dashboard/_components/sidebar/permission-guard";
import { DataBackupActions } from "@/components/data-backup-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { localize, type Course, type CourseStatus } from "@/types/quiz";

const PAGE_SIZE = 10;

type PaginatedResponse = {
  items: Course[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function statusLabel(status: CourseStatus) {
  if (status === "Published") return "Public";
  return status;
}

function statusVariant(status: CourseStatus): "default" | "secondary" | "outline" {
  if (status === "Published") return "default";
  if (status === "Archived") return "secondary";
  return "outline";
}

function courseTitle(course: Course) {
  return localize(course.title, "en") || "Untitled course";
}

export function ManageCoursesList() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canDelete =
    hasPermission("MANAGE", "all") ||
    hasPermission("DELETE", "QUIZZES") ||
    hasPermission("MANAGE", "QUIZZES");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [bulkStatus, setBulkStatus] = useState<CourseStatus | "">("");

  const load = useCallback(async (pageNum = page) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/courses?page=${pageNum}&pageSize=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load courses");
      const data = (await res.json()) as PaginatedResponse | Course[];

      if (Array.isArray(data)) {
        setCourses(data);
        setTotal(data.length);
        setTotalPages(1);
        setPage(1);
      } else {
        setCourses(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? pageNum);
      }
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps -- reload on page change only

  const authHeaders = () => ({
    Authorization: `Bearer ${getClientCookie("session_token")}`,
    "Content-Type": "application/json",
  });

  const pageIds = useMemo(() => courses.map((c) => c.id), [courses]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  const toggleAllPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const updateStatus = async (id: string, status: CourseStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not update status");
      }
      toast.success(`Status set to ${statusLabel(status)}`);
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusyId(null);
    }
  };

  const removeCourse = async (course: Course) => {
    const confirmed = window.confirm(
      `Permanently delete "${courseTitle(course)}"?\n\nThis also removes its modules and quizzes. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(course.id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses/${course.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not delete course");
      }
      toast.success("Course deleted");
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete course");
    } finally {
      setBusyId(null);
    }
  };

  const selectedIds = [...selected];

  const bulkChangeStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses/bulk/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      if (!res.ok) throw new Error("Bulk status update failed");
      const body = await res.json();
      toast.success(
        `Updated ${body.updated ?? selectedIds.length} to ${statusLabel(bulkStatus)}`,
      );
      setBulkStatus("");
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk status update failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${selectedIds.length} selected course(s)?\n\nModules and quizzes under them will also be removed. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses/bulk/delete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      const body = await res.json();
      toast.success(`Deleted ${body.deleted ?? selectedIds.length} course(s)`);
      const remainingOnPage =
        courses.length -
        selectedIds.filter((id) => courses.some((c) => c.id === id)).length;
      const nextPage = remainingOnPage <= 0 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading courses…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Courses</h1>
          <p className="text-muted-foreground text-sm">
            Create, publish, archive courses and manage modules in English, Sinhala, and Tamil.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataBackupActions
            resource="courses"
            onImported={() => void load(1)}
          />
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="size-4" />
              Add New
            </Link>
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Select
            value={bulkStatus || undefined}
            onValueChange={(val) => setBulkStatus(val as CourseStatus)}
            disabled={bulkBusy}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Set status…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Public</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={bulkBusy || !bulkStatus}
            onClick={() => void bulkChangeStatus()}
          >
            {bulkBusy ? <Spinner className="size-4" /> : null}
            Apply status
          </Button>
          {canDelete ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={() => void bulkDelete()}
            >
              <Trash2 className="size-3.5" />
              Delete selected
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={bulkBusy}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">No courses yet. Add your first course.</p>
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-border">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                <Spinner className="size-5" />
              </div>
            )}
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={
                        allPageSelected
                          ? true
                          : somePageSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(v) => toggleAllPage(v === true)}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Modules</th>
                  <th className="px-4 py-3 font-medium">Quizzes</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const status = (course.status ?? "Draft") as CourseStatus;
                  return (
                    <tr key={course.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selected.has(course.id)}
                          onCheckedChange={(v) => toggleOne(course.id, v === true)}
                          aria-label={`Select course ${courseTitle(course)}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-left font-medium hover:underline"
                          onClick={() => router.push(`/admin/courses/${course.id}/modules`)}
                        >
                          {courseTitle(course)}
                        </button>
                        {localize(course.description, "en") ? (
                          <div className="text-muted-foreground line-clamp-1 text-xs">
                            {localize(course.description, "en")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{course._count?.modules ?? 0}</td>
                      <td className="px-4 py-3">{course._count?.quizzes ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                          <Select
                            value={status}
                            disabled={busyId === course.id || bulkBusy}
                            onValueChange={(val) =>
                              updateStatus(course.id, val as CourseStatus)
                            }
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Draft">Draft</SelectItem>
                              <SelectItem value="Published">Public</SelectItem>
                              <SelectItem value="Archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === course.id}
                            onClick={() => router.push(`/admin/courses/${course.id}/modules`)}
                          >
                            <BookOpen className="size-3.5" />
                            Modules
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === course.id}
                            onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busyId === course.id}
                            onClick={() => void removeCourse(course)}
                            className={canDelete ? undefined : "hidden"}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="tabular-nums text-sm">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
