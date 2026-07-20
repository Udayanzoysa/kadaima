"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BulkImportQuestions } from "./bulk-import-questions";
import { AiImportPdfQuestions } from "./ai-import-pdf-questions";
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
import { localize, type BankQuestion, type QuestionStatus } from "@/types/quiz";

const PAGE_SIZE = 10;

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

export function QuestionsBankList() {
  const router = useRouter();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [bulkStatus, setBulkStatus] = useState<QuestionStatus | "">("");

  const load = useCallback(async (pageNum = page) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/questions?page=${pageNum}&pageSize=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
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
  }, [page]);

  useEffect(() => {
    void load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps -- reload on page change only

  const authHeaders = () => ({
    Authorization: `Bearer ${getClientCookie("session_token")}`,
    "Content-Type": "application/json",
  });

  const pageIds = useMemo(() => questions.map((q) => q.id), [questions]);
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
    const inUse = (q._count?.quizLinks ?? 0) > 0 || (q._count?.responses ?? 0) > 0;
    const confirmed = window.confirm(
      inUse
        ? `"${localize(q.questionText, "en")}" is in use and will be archived. Continue?`
        : `Delete this question permanently?`,
    );
    if (!confirmed) return;

    setBusyId(q.id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/${q.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Could not delete question");
      const body = await res.json();
      toast.success(body.archived ? "Question archived" : "Question deleted");
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
      `Delete ${selectedIds.length} selected question(s)? Items in use will be archived instead.`,
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
      toast.success(
        `Deleted ${body.deleted ?? 0}, archived ${body.archived ?? 0}`,
      );
      // If current page becomes empty after delete, go back a page
      const remainingOnPage = questions.length - selectedIds.filter((id) =>
        questions.some((q) => q.id === id),
      ).length;
      const nextPage =
        remainingOnPage <= 0 && page > 1 ? page - 1 : page;
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
          <DataBackupActions
            resource="questions"
            onImported={() => void load(1)}
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
          <Button
            type="button"
            size="sm"
            disabled={bulkBusy || !bulkStatus}
            onClick={() => void bulkChangeStatus()}
          >
            {bulkBusy ? <Spinner className="size-4" /> : null}
            Apply status
          </Button>
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
        <p className="text-muted-foreground text-sm">No questions yet.</p>
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
                      <div className="line-clamp-2 font-medium">
                        {localize(q.questionText, "en")}
                      </div>
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === q.id}
                          onClick={() => void removeQuestion(q)}
                        >
                          {(q._count?.quizLinks ?? 0) > 0 || (q._count?.responses ?? 0) > 0 ? (
                            <Archive className="size-3.5" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Delete
                        </Button>
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
