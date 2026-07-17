"use client";

import { useState } from "react";

import { FileUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import type { ImportQuestionPayload } from "@/lib/question-import";

type AiDraftQuestion = ImportQuestionPayload & { confidence?: number };

type Props = {
  onImported?: () => void;
  variant?: "default" | "outline";
};

async function createMany(questions: ImportQuestionPayload[]) {
  const token = getClientCookie("session_token");
  if (!token) throw new Error("Not signed in");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let ok = 0;
  const failures: string[] = [];

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions`, {
        method: "POST",
        headers,
        body: JSON.stringify(q),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.message)
          ? err.message.join(", ")
          : err.message || `Question ${i + 1} failed`;
        failures.push(msg);
      } else {
        ok += 1;
      }
    } catch (e) {
      failures.push(e instanceof Error ? e.message : `Question ${i + 1} failed`);
    }
  }

  return { ok, failures };
}

export function AiImportPdfQuestions({ onImported, variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<AiDraftQuestion[]>([]);
  const [modelLabel, setModelLabel] = useState<string | null>(null);

  const reset = () => {
    setFileName(null);
    setPending([]);
    setModelLabel(null);
  };

  const handlePdf = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Please upload a PDF exam paper");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("PDF must be 20MB or smaller");
      return;
    }

    const token = getClientCookie("session_token");
    if (!token) {
      toast.error("Not signed in");
      return;
    }

    setAnalyzing(true);
    setFileName(file.name);
    setPending([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/ai/import-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message || "AI analysis failed";
        throw new Error(msg);
      }

      const questions = (body.questions ?? []) as AiDraftQuestion[];
      setPending(questions);
      setModelLabel(body.model ? `${body.provider || "gemini"} · ${body.model}` : null);
      if (questions.length) {
        toast.success(`Extracted ${questions.length} draft question${questions.length === 1 ? "" : "s"}`);
      } else {
        toast.error("No questions found in this PDF");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI analysis failed");
      setFileName(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!pending.length) {
      toast.error("Analyze a PDF first");
      return;
    }
    setImporting(true);
    try {
      const payload: ImportQuestionPayload[] = pending.map(
        ({ confidence: _c, ...rest }) => rest,
      );
      const { ok, failures } = await createMany(payload);
      if (ok) toast.success(`Imported ${ok} draft question${ok === 1 ? "" : "s"}`);
      if (failures.length) {
        toast.error(`${failures.length} failed`, {
          description: failures.slice(0, 3).join("; "),
        });
      }
      if (ok) {
        reset();
        setOpen(false);
        onImported?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={variant}>
          <Sparkles className="size-4" />
          Import from PDF (AI)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import questions from exam PDF</DialogTitle>
          <DialogDescription>
            Upload a past paper. Gemini analyzes it and creates draft questions for you to review
            before saving to the bank.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-sm hover:bg-muted/40">
          {analyzing ? (
            <>
              <Spinner className="size-6" />
              <span>Analyzing with Gemini… this can take up to a minute</span>
            </>
          ) : (
            <>
              <FileUp className="size-6 text-muted-foreground" />
              <span>{fileName ? fileName : "Choose exam paper (.pdf, max 20MB)"}</span>
            </>
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={analyzing || importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePdf(file);
              e.target.value = "";
            }}
          />
        </label>

        {modelLabel && (
          <p className="text-muted-foreground text-xs">Model: {modelLabel}</p>
        )}

        {pending.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3">
            <p className="text-sm">
              Ready to import as <strong>Draft</strong>: {pending.length} question
              {pending.length === 1 ? "" : "s"}
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-xs text-muted-foreground">
              {pending.slice(0, 12).map((q, i) => (
                <li key={`${q.questionText.en}-${i}`}>
                  <span className="font-medium text-foreground">
                    [{q.type}] {q.questionText.en || q.questionText.si || q.questionText.ta}
                  </span>
                  {typeof q.confidence === "number" && (
                    <span> · confidence {Math.round(q.confidence * 100)}%</span>
                  )}
                </li>
              ))}
              {pending.length > 12 && <li>…and {pending.length - 12} more</li>}
            </ol>
            <p className="text-muted-foreground text-[11px]">
              Always review drafts after import — AI can miss options or mark the wrong answer on
              scanned papers.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing || analyzing || pending.length === 0}
          >
            {importing ? (
              <>
                <Spinner className="size-4" />
                Saving drafts…
              </>
            ) : (
              <>Import {pending.length || ""} drafts</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
