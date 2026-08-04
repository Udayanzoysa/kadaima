"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/app/(main)/dashboard/_components/sidebar/permission-guard";
import { DataBackupActions } from "@/components/data-backup-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getClientCookie } from "@/lib/cookie.client";
import { type Course, type CourseModule, type LocalizedText, localize, type QuizSummary } from "@/types/quiz";

/** Radix Select cannot use "" as a value, so "all" stands in for no filter. */
const ALL = "all";

type QuizStatus = QuizSummary["status"];

type PaginatedResponse = {
  items: QuizSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Filters = {
  search: string;
  courseId: string;
  moduleId: string;
  status: QuizStatus | "";
};

const EMPTY_FILTERS: Filters = {
  search: "",
  courseId: "",
  moduleId: "",
  status: "",
};

function statusLabel(status: QuizStatus) {
  if (status === "Published") return "Public";
  return status;
}

function optionTitle(title: LocalizedText | string | null | undefined) {
  return localize(title, "en") || "Untitled";
}

export function ManageQuizzesList() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canDelete =
    hasPermission("MANAGE", "all") || hasPermission("DELETE", "QUIZZES") || hasPermission("MANAGE", "QUIZZES");
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [bulkStatus, setBulkStatus] = useState<QuizStatus | "">("");

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [courseOptions, setCourseOptions] = useState<Course[]>([]);
  const [moduleOptions, setModuleOptions] = useState<CourseModule[]>([]);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const filtersActive =
    Boolean(debouncedSearch.trim()) || Boolean(filters.courseId || filters.moduleId || filters.status);

  const patchFilters = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const buildQuery = useCallback(
    (pageNum: number, size: number) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("pageSize", String(size));
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (filters.courseId) params.set("courseId", filters.courseId);
      if (filters.moduleId) params.set("moduleId", filters.moduleId);
      if (filters.status) params.set("status", filters.status);
      return params.toString();
    },
    [debouncedSearch, filters.courseId, filters.moduleId, filters.status],
  );

  const load = useCallback(
    async (pageNum = page, currentSize = pageSize) => {
      const token = getClientCookie("session_token");
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes?${buildQuery(pageNum, currentSize)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load quizzes");
        const data = (await res.json()) as PaginatedResponse | QuizSummary[];

        if (Array.isArray(data)) {
          setQuizzes(data);
          setTotal(data.length);
          setTotalPages(1);
          setPage(1);
        } else {
          setQuizzes(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
          setPage(data.page ?? pageNum);
        }
        setSelected(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, page, pageSize],
  );

  useEffect(() => {
    void load(page, pageSize);
  }, [page, pageSize, load]);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    void fetch(`${APP_CONFIG.apiUrl}/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setCourseOptions(items);
      })
      .catch(() => setCourseOptions([]));
  }, []);

  useEffect(() => {
    if (!filters.courseId) {
      setModuleOptions([]);
      return;
    }
    const token = getClientCookie("session_token");
    if (!token) return;
    void fetch(`${APP_CONFIG.apiUrl}/courses/${filters.courseId}/modules`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setModuleOptions(items);
      })
      .catch(() => setModuleOptions([]));
  }, [filters.courseId]);

  const authHeaders = () => ({
    Authorization: `Bearer ${getClientCookie("session_token")}`,
    "Content-Type": "application/json",
  });

  const pageIds = useMemo(() => quizzes.map((q) => q.id), [quizzes]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
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

  const updateStatus = async (id: string, status: QuizStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${id}/status`, {
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

  const removeQuiz = async (quiz: QuizSummary) => {
    const confirmed = window.confirm(
      `Permanently delete "${localize(quiz.title, "en")}"?\n\nThis removes the quiz and related attempts/unlocks. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(quiz.id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quiz.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not delete quiz");
      }
      toast.success("Quiz deleted");
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete quiz");
    } finally {
      setBusyId(null);
    }
  };

  const selectedIds = [...selected];

  const bulkChangeStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/bulk/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      if (!res.ok) throw new Error("Bulk status update failed");
      const body = await res.json();
      toast.success(`Updated ${body.updated ?? selectedIds.length} to ${statusLabel(bulkStatus)}`);
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
      `Permanently delete ${selectedIds.length} selected quiz(zes)?\n\nRelated attempts and unlocks will be removed. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/bulk/delete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      const body = await res.json();
      toast.success(`Deleted ${body.deleted ?? selectedIds.length} quiz(zes)`);
      const remainingOnPage = quizzes.length - selectedIds.filter((id) => quizzes.some((q) => q.id === id)).length;
      const nextPage = remainingOnPage <= 0 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading && quizzes.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading quizzes…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Quizzes</h1>
          <p className="text-muted-foreground text-sm">
            Create, publish, archive, and attach bank questions to quizzes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataBackupActions resource="quizzes" onImported={() => void load(1)} />
          <Button asChild>
            <Link href="/admin/quizzes/new">
              <Plus className="size-4" />
              Add New
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="quiz-search" className="mb-1 block text-muted-foreground text-xs">
            Quiz name
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="quiz-search"
              className="h-9 pl-8"
              placeholder="Search quiz title…"
              value={filters.search}
              onChange={(e) => patchFilters({ search: e.target.value })}
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-muted-foreground text-xs">Course</span>
          <Select
            value={filters.courseId || ALL}
            onValueChange={(val) =>
              patchFilters({
                courseId: val === ALL ? "" : val,
                moduleId: "",
              })
            }
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by course">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All courses</SelectItem>
              {courseOptions.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {optionTitle(course.title)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-muted-foreground text-xs">Module</span>
          <Select
            value={filters.moduleId || ALL}
            onValueChange={(val) => patchFilters({ moduleId: val === ALL ? "" : val })}
            disabled={!filters.courseId}
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by module">
              <SelectValue placeholder={filters.courseId ? "All modules" : "Pick a course"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All modules</SelectItem>
              {moduleOptions.map((mod) => (
                <SelectItem key={mod.id} value={mod.id}>
                  {optionTitle(mod.title)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-muted-foreground text-xs">Status</span>
          <Select
            value={filters.status || ALL}
            onValueChange={(val) => patchFilters({ status: val === ALL ? "" : (val as QuizStatus) })}
          >
            <SelectTrigger className="h-9 w-[130px]" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Public</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtersActive ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Select
            value={bulkStatus || undefined}
            onValueChange={(val) => setBulkStatus(val as QuizStatus)}
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
          <Button type="button" size="sm" disabled={bulkBusy || !bulkStatus} onClick={() => void bulkChangeStatus()}>
            {bulkBusy ? <Spinner className="size-4" /> : null}
            Apply status
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={bulkBusy}
            onClick={() => void bulkDelete()}
            className={canDelete ? undefined : "hidden"}
          >
            <Trash2 className="size-3.5" />
            Delete selected
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">
          {filtersActive ? "No quizzes match these filters." : "No quizzes yet. Add your first quiz."}
        </p>
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-border">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                <Spinner className="size-5" />
              </div>
            )}
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleAllPage(v === true)}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Module</th>
                  <th className="px-4 py-3 font-medium">Questions</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((quiz) => (
                  <tr key={quiz.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selected.has(quiz.id)}
                        onCheckedChange={(v) => toggleOne(quiz.id, v === true)}
                        aria-label={`Select quiz ${localize(quiz.title, "en")}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{localize(quiz.title, "en")}</div>
                      <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                        {quiz.shuffleQuestions ? <span>Shuffle on</span> : null}
                        {quiz.requiresUnlock ? (
                          <span>
                            Locked
                            {quiz.priceLkr != null ? ` · LKR ${Number(quiz.priceLkr).toFixed(0)}` : ""}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{localize(quiz.course?.title, "en")}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {quiz.module ? localize(quiz.module.title, "en") : "—"}
                    </td>
                    <td className="px-4 py-3">{quiz._count.questions}</td>
                    <td className="px-4 py-3">{quiz._count.attempts}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={quiz.status}
                        disabled={busyId === quiz.id || bulkBusy}
                        onValueChange={(val) => updateStatus(quiz.id, val as QuizStatus)}
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
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === quiz.id}
                          onClick={() => router.push(`/admin/quizzes/${quiz.id}/edit`)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        {canDelete ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busyId === quiz.id}
                            onClick={() => void removeQuiz(quiz)}
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
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground text-sm">
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs">Rows per page:</span>
                <select
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1563b8]"
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setPage(1);
                  }}
                >
                  {[10, 20, 40, 50].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
