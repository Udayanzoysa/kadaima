"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
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
import {
  localize,
  type Course,
  type CourseModule,
  type CourseStatus,
} from "@/types/quiz";

const PAGE_SIZE = 10;

type PaginatedResponse = {
  items: CourseModule[];
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

interface ManageModulesListProps {
  courseId: string;
}

export function ManageModulesList({ courseId }: ManageModulesListProps) {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canDelete =
    hasPermission("MANAGE", "all") ||
    hasPermission("DELETE", "QUIZZES") ||
    hasPermission("MANAGE", "QUIZZES");
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [bulkStatus, setBulkStatus] = useState<CourseStatus | "">("");

  const load = useCallback(
    async (pageNum = page) => {
      const token = getClientCookie("session_token");
      if (!token) return;
      setLoading(true);
      try {
        const [courseRes, modulesRes] = await Promise.all([
          fetch(`${APP_CONFIG.apiUrl}/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `${APP_CONFIG.apiUrl}/courses/${courseId}/modules?page=${pageNum}&pageSize=${PAGE_SIZE}`,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ]);
        if (!courseRes.ok) throw new Error("Failed to load course");
        if (!modulesRes.ok) throw new Error("Failed to load modules");
        const courseData: Course = await courseRes.json();
        const data = (await modulesRes.json()) as PaginatedResponse | CourseModule[];

        setCourse(courseData);
        if (Array.isArray(data)) {
          setModules(data);
          setTotal(data.length);
          setTotalPages(1);
          setPage(1);
        } else {
          setModules(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
          setPage(data.page ?? pageNum);
        }
        setSelected(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load modules");
      } finally {
        setLoading(false);
      }
    },
    [courseId, page],
  );

  useEffect(() => {
    void load(page);
  }, [page, courseId]); // eslint-disable-line react-hooks/exhaustive-deps -- reload on page/course change

  const authHeaders = () => ({
    Authorization: `Bearer ${getClientCookie("session_token")}`,
    "Content-Type": "application/json",
  });

  const pageIds = useMemo(() => modules.map((m) => m.id), [modules]);
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
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/courses/${courseId}/modules/${id}/status`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ status }),
        },
      );
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

  const removeModule = async (mod: CourseModule) => {
    const name = localize(mod.title, "en") || "this module";
    if (
      !window.confirm(
        `Permanently delete "${name}"?\n\nQuizzes stay but will be unlinked from this module. This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusyId(mod.id);
    try {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/courses/${courseId}/modules/${mod.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not delete module");
      }
      toast.success("Module deleted");
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete module");
    } finally {
      setBusyId(null);
    }
  };

  const selectedIds = [...selected];

  const bulkChangeStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/courses/${courseId}/modules/bulk/status`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
        },
      );
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
      `Permanently delete ${selectedIds.length} selected module(s)?\n\nQuizzes stay but will be unlinked from these modules. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/courses/${courseId}/modules/bulk/delete`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ids: selectedIds }),
        },
      );
      if (!res.ok) throw new Error("Bulk delete failed");
      const body = await res.json();
      toast.success(`Deleted ${body.deleted ?? selectedIds.length} module(s)`);
      const remainingOnPage =
        modules.length -
        selectedIds.filter((id) => modules.some((m) => m.id === id)).length;
      const nextPage = remainingOnPage <= 0 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading && modules.length === 0 && !course) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading modules…</span>
      </div>
    );
  }

  const courseName = course ? localize(course.title, "en") : "Course";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button type="button" variant="ghost" size="sm" asChild className="-ml-2 w-fit">
            <Link href="/admin/courses">
              <ArrowLeft className="size-4" />
              Back to courses
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Modules</h1>
            <p className="text-muted-foreground text-sm">
              Modules for <span className="font-medium text-foreground">{courseName}</span>. Add,
              edit, publish, or archive in English, Sinhala, and Tamil.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataBackupActions
            resource="modules"
            apiPath={`courses/${courseId}/modules`}
            onImported={() => void load(1)}
          />
          <Button asChild>
            <Link href={`/admin/courses/${courseId}/modules/new`}>
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
        <p className="text-muted-foreground text-sm">No modules yet. Add your first module.</p>
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-border">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                <Spinner className="size-5" />
              </div>
            )}
            <table className="w-full min-w-[680px] text-left text-sm">
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
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((mod) => (
                  <tr key={mod.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selected.has(mod.id)}
                        onCheckedChange={(v) => toggleOne(mod.id, v === true)}
                        aria-label={`Select module ${localize(mod.title, "en")}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{localize(mod.title, "en")}</div>
                      {localize(mod.description, "en") ? (
                        <div className="text-muted-foreground line-clamp-1 text-xs">
                          {localize(mod.description, "en")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{mod.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(mod.status)}>{statusLabel(mod.status)}</Badge>
                        <Select
                          value={mod.status}
                          disabled={busyId === mod.id || bulkBusy}
                          onValueChange={(val) => updateStatus(mod.id, val as CourseStatus)}
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
                          disabled={busyId === mod.id}
                          onClick={() =>
                            router.push(`/admin/courses/${courseId}/modules/${mod.id}/edit`)
                          }
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        {canDelete ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busyId === mod.id}
                            onClick={() => void removeModule(mod)}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
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
