"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Library } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import {
  hasAllLocaleContent,
  localize,
  type BankQuestion,
  type LocalizedText,
  type SupportedLocale,
} from "@/types/quiz";

const PAGE_SIZE = 10;

type PaginatedResponse = {
  items: BankQuestion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Props = {
  /** Already attached question IDs (hidden / disabled in picker). */
  excludeIds: string[];
  /** Questions must include text in every selected quiz language. */
  languages: SupportedLocale[];
  onAttach: (questions: BankQuestion[]) => void;
};

export function AttachFromBankModal({ excludeIds, languages, onAttach }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BankQuestion[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Map<string, BankQuestion>>(new Map());

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const load = useCallback(async (pageNum: number) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/questions?status=Published&page=${pageNum}&pageSize=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load question bank");
      const data = (await res.json()) as PaginatedResponse | BankQuestion[];

      if (Array.isArray(data)) {
        const compatible = data.filter((q) =>
          hasAllLocaleContent(q.questionText as LocalizedText, languages, 3),
        );
        const start = (pageNum - 1) * PAGE_SIZE;
        const slice = compatible.slice(start, start + PAGE_SIZE);
        setItems(slice);
        setTotal(compatible.length);
        setTotalPages(Math.max(1, Math.ceil(compatible.length / PAGE_SIZE)));
        setPage(pageNum);
      } else {
        const filtered = (data.items ?? []).filter((q) =>
          hasAllLocaleContent(q.questionText as LocalizedText, languages, 3),
        );
        setItems(filtered);
        setTotal(filtered.length);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setPage(data.page ?? pageNum);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load bank");
    } finally {
      setLoading(false);
    }
  }, [languages]);

  useEffect(() => {
    if (!open) return;
    setSelected(new Map());
    setPage(1);
    void load(1);
  }, [open, load]);

  const visibleIds = items.map((q) => q.id).filter((id) => !excludeSet.has(id));
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  const toggleOne = (q: BankQuestion, checked: boolean) => {
    if (excludeSet.has(q.id)) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(q.id, q);
      else next.delete(q.id);
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const q of items) {
        if (excludeSet.has(q.id)) continue;
        if (checked) next.set(q.id, q);
        else next.delete(q.id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const picked = [...selected.values()].filter((q) => !excludeSet.has(q.id));
    if (!picked.length) {
      toast.error("Select at least one question");
      return;
    }
    onAttach(picked);
    toast.success(`Attached ${picked.length} question${picked.length === 1 ? "" : "s"}`);
    setOpen(false);
  };

  const previewLang = languages[0] ?? "en";
  const langList = languages.map((l) => l.toUpperCase()).join(" + ");
  const textAt = (q: BankQuestion) => localize(q.questionText as LocalizedText, previewLang);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Library className="size-4" />
          Attach from bank
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Attach from question bank</DialogTitle>
          <DialogDescription>
            Only questions that include {langList} text are shown — this quiz uses{" "}
            {langList}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-muted/30 px-6 py-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={
                allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false
              }
              onCheckedChange={(v) => toggleAllVisible(v === true)}
              disabled={visibleIds.length === 0}
            />
            Select page
          </label>
          <span className="text-muted-foreground text-xs">
            {selected.size} selected
            {total > 0 ? ` · ${total} matching` : ""}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && items.length === 0 ? (
            <div className="flex h-40 items-center justify-center gap-2">
              <Spinner className="size-5" />
              <span className="text-muted-foreground text-sm">Loading…</span>
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground text-sm">
              No published questions with {langList} text in the bank.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((q) => {
                const attached = excludeSet.has(q.id);
                const checked = selected.has(q.id);
                return (
                  <li
                    key={q.id}
                    className={`rounded-lg border px-3 py-3 ${
                      attached ? "opacity-50" : checked ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={attached ? true : checked}
                        disabled={attached || loading}
                        onCheckedChange={(v) => toggleOne(q, v === true)}
                        aria-label={`Select ${textAt(q)}`}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {q.type?.replace("_", " ") ?? "MCQ"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {langList}
                          </Badge>
                          <span className="text-muted-foreground text-xs">{q.points} pts</span>
                          {attached && (
                            <Badge variant="secondary" className="text-[10px]">
                              Already attached
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm leading-snug">{textAt(q)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1)}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <span className="tabular-nums text-xs">
              Page {page} / {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => void load(page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <DialogFooter className="m-0 gap-2 sm:space-x-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd} disabled={selected.size === 0}>
              Add {selected.size > 0 ? selected.size : ""} selected
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
