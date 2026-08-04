"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/app/(main)/dashboard/_components/sidebar/permission-guard";
import { DataBackupActions } from "@/components/data-backup-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getClientCookie } from "@/lib/cookie.client";
import { tagNames } from "@/lib/question-tags";
import { type BankQuestion, type LocalizedText, localize, type QuestionStatus } from "@/types/quiz";

import { AiImportPdfQuestions } from "./ai-import-pdf-questions";
import { BulkImportQuestions } from "./bulk-import-questions";
import { ManageTagsDialog } from "./manage-tags-dialog";

const PAGE_SIZE = 10;

/** Radix Select cannot use "" as a value, so "all" stands in for no filter. */
const ALL = "all";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "si", label: "සිංහල" },
  { value: "ta", label: "தமிழ்" },
] as const;

function statusLabel(status: QuestionStatus) {
  if (status === "Published") return "Public";
  return status;
}

type PaginatedResponse = {
  items: BankQuestion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type QuizOption = { id: string; title: LocalizedText };

type Filters = {
  search: string;
  tag: string;
  quizId: string;
  status: QuestionStatus | "";
  language: "" | "en" | "si" | "ta";
  unassigned: boolean;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  tag: "",
  quizId: "",
  status: "",
  language: "",
  unassigned: false,
};

export function QuestionsBankList() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canDelete =
    hasPermission("MANAGE", "all") || hasPermission("DELETE", "QUIZZES") || hasPermission("MANAGE", "QUIZZES");
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [bulkStatus, setBulkStatus] = useState<QuestionStatus | "">("");

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [quizOptions, setQuizOptions] = useState<QuizOption[]>([]);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const filtersActive =
    Boolean(debouncedSearch.trim()) ||
    Boolean(filters.tag || filters.quizId || filters.status || filters.language) ||
    filters.unassigned;

  /** Any filter change invalidates the current page number. */
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
      if (filters.tag) params.set("tag", filters.tag);
      if (filters.status) params.set("status", filters.status);
      if (filters.language) params.set("language", filters.language);
      // Unassigned and a specific quiz are mutually exclusive.
      if (filters.unassigned) params.set("unassigned", "true");
      else if (filters.quizId) params.set("quizId", filters.quizId);
      return params.toString();
    },
    [debouncedSearch, filters.tag, filters.status, filters.language, filters.unassigned, filters.quizId],
  );

  const load = useCallback(
    async (pageNum = page, currentSize = pageSize) => {
      const token = getClientCookie("session_token");
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/questions?${buildQuery(pageNum, currentSize)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load questions");
        const data = (await res.json()) as PaginatedResponse | BankQuestion[];

        if (Array.isArray(data)) {
          // Fallback if API not yet restarted with pagination
          setQuestions(data);
          setTotal(data.length);
          setTotalPages(1);
          setPage(1);
        } else {
          setQuestions(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
          setPage(data.page ?? pageNum);
        }
        setSelected(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load questions");
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, page, pageSize],
  );

  useEffect(() => {
    void load(page, pageSize);
  }, [page, pageSize, load]);

  const loadTagOptions = useCallback(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    void fetch(`${APP_CONFIG.apiUrl}/questions/tags`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTagOptions(tagNames(data)))
      .catch(() => setTagOptions([]));
  }, []);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    loadTagOptions();

    void fetch(`${APP_CONFIG.apiUrl}/quizzes`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQuizOptions(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(() => setQuizOptions([]));
  }, [loadTagOptions]);

  const authHeaders = () => ({
    Authorization: `Bearer ${getClientCookie("session_token")}`,
    "Content-Type": "application/json",
  });

  const pageIds = useMemo(() => questions.map((q) => q.id), [questions]);
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

  const updateStatus = async (id: string, status: QuestionStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update status");
      toast.success(`Status set to ${statusLabel(status)}`);
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusyId(null);
    }
  };

  const removeQuestion = async (q: BankQuestion) => {
    const confirmed = window.confirm(
      `Permanently delete this question?\n\nIt will be removed from quizzes and related responses. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(q.id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/${q.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Could not delete question");
      toast.success("Question deleted");
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete question");
    } finally {
      setBusyId(null);
    }
  };

  const selectedIds = [...selected];

  const bulkChangeStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/bulk/status`, {
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
      `Permanently delete ${selectedIds.length} selected question(s)?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/bulk/delete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      const body = await res.json();
      toast.success(`Deleted ${body.deleted ?? selectedIds.length} question(s)`);
      // If current page becomes empty after delete, go back a page
      const remainingOnPage = questions.length - selectedIds.filter((id) => questions.some((q) => q.id === id)).length;
      const nextPage = remainingOnPage <= 0 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading && questions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading questions…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Questions</h1>
          <p className="text-muted-foreground text-sm">
            Shared question bank — one question can be attached to many quizzes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataBackupActions resource="questions" onImported={() => void load(1)} />
          <ManageTagsDialog
            selectedQuestionIds={selectedIds}
            onChanged={() => {
              loadTagOptions();
              void load(page);
            }}
          />
          <AiImportPdfQuestions onImported={() => void load(1)} />
          <BulkImportQuestions onImported={() => void load(1)} />
          <Button asChild>
            <Link href="/admin/questions/new">
              <Plus className="size-4" />
              Add New
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="question-search" className="mb-1 block text-muted-foreground text-xs">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="question-search"
              className="h-9 pl-8"
              placeholder="Question text or tag…"
              value={filters.search}
              onChange={(e) => patchFilters({ search: e.target.value })}
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-muted-foreground text-xs">Tag</span>
          <Select value={filters.tag || ALL} onValueChange={(val) => patchFilters({ tag: val === ALL ? "" : val })}>
            <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by tag">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tags</SelectItem>
              {tagOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-muted-foreground text-xs">Quiz</span>
          <Select
            value={filters.quizId || ALL}
            disabled={filters.unassigned}
            onValueChange={(val) => patchFilters({ quizId: val === ALL ? "" : val })}
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by quiz">
              <SelectValue placeholder="All quizzes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All quizzes</SelectItem>
              {quizOptions.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {localize(q.title, "en")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-muted-foreground text-xs">Language</span>
          <Select
            value={filters.language || ALL}
            onValueChange={(val) => patchFilters({ language: val === ALL ? "" : (val as Filters["language"]) })}
          >
            <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by language">
              <SelectValue placeholder="Any language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any language</SelectItem>
              {LANGUAGE_OPTIONS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-muted-foreground text-xs">Status</span>
          <Select
            value={filters.status || ALL}
            onValueChange={(val) => patchFilters({ status: val === ALL ? "" : (val as QuestionStatus) })}
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

        <div className="flex h-9 items-center gap-2">
          <Checkbox
            id="unassigned-only"
            checked={filters.unassigned}
            onCheckedChange={(v) => patchFilters({ unassigned: v === true })}
          />
          <label htmlFor="unassigned-only" className="text-sm">
            Unassigned only
          </label>
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
            onValueChange={(val) => setBulkStatus(val as QuestionStatus)}
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
          {canDelete ? (
            <Button type="button" size="sm" variant="destructive" disabled={bulkBusy} onClick={() => void bulkDelete()}>
              <Trash2 className="size-3.5" />
              Delete selected
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">
          {filtersActive ? "No questions match these filters." : "No questions yet."}
        </p>
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
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleAllPage(v === true)}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Question</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Quizzes</th>
                  <th className="px-4 py-3 font-medium">Points</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selected.has(q.id)}
                        onCheckedChange={(v) => toggleOne(q.id, v === true)}
                        aria-label={`Select question ${localize(q.questionText, "en")}`}
                      />
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <div className="line-clamp-2 font-medium">{localize(q.questionText, "en")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {q.type?.replace("_", " ") ?? "MCQ"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{q._count?.quizLinks ?? 0}</td>
                    <td className="px-4 py-3">{q.points}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={q.status}
                        disabled={busyId === q.id || bulkBusy}
                        onValueChange={(val) => updateStatus(q.id, val as QuestionStatus)}
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
                          disabled={busyId === q.id}
                          onClick={() => router.push(`/admin/questions/${q.id}/edit`)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        {canDelete ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busyId === q.id}
                            onClick={() => void removeQuestion(q)}
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
