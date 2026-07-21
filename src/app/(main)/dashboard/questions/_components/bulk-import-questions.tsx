"use client";

import { useState } from "react";

import { Download, FileUp, Upload } from "lucide-react";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import {
  AIKEN_EXAMPLE,
  downloadQuestionCsvTemplate,
  parseAiken,
  parseQuestionsCsv,
  type ImportQuestionPayload,
  type ParseIssue,
} from "@/lib/question-import";

type Props = {
  onImported?: () => void;
  /** Compact trigger for headers */
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
          : err.message || `Row ${i + 1} failed`;
        failures.push(msg);
      } else {
        ok += 1;
      }
    } catch (e) {
      failures.push(e instanceof Error ? e.message : `Row ${i + 1} failed`);
    }
  }

  return { ok, failures };
}

function IssuesList({ issues }: { issues: ParseIssue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="max-h-32 list-disc space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-destructive text-xs">
      {issues.slice(0, 20).map((issue, i) => (
        <li key={`${issue.row}-${i}`}>
          Row {issue.row}: {issue.message}
        </li>
      ))}
      {issues.length > 20 && <li>…and {issues.length - 20} more</li>}
    </ul>
  );
}

export function BulkImportQuestions({ onImported, variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const [aikenText, setAikenText] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [pending, setPending] = useState<ImportQuestionPayload[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const resetPreview = () => {
    setPreviewCount(0);
    setIssues([]);
    setPending([]);
    setFileName(null);
  };

  const applyParse = (questions: ImportQuestionPayload[], nextIssues: ParseIssue[], name?: string) => {
    setPending(questions);
    setPreviewCount(questions.length);
    setIssues(nextIssues);
    if (name) setFileName(name);
    if (questions.length) {
      toast.success(`Parsed ${questions.length} question${questions.length === 1 ? "" : "s"}`);
    } else {
      toast.error("No valid questions found");
    }
  };

  const handleCsvFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
      toast.error("Please upload a .csv file (Excel: File → Save As → CSV)");
      return;
    }
    const text = await file.text();
    const { questions, issues: nextIssues } = parseQuestionsCsv(text);
    applyParse(questions, nextIssues, file.name);
  };

  const handleParseAiken = () => {
    const { questions, issues: nextIssues } = parseAiken(aikenText);
    applyParse(questions, nextIssues);
  };

  const handleImport = async () => {
    if (!pending.length) {
      toast.error("Nothing to import — parse a file or Aiken text first");
      return;
    }
    setImporting(true);
    try {
      const { ok, failures } = await createMany(pending);
      if (ok) toast.success(`Imported ${ok} question${ok === 1 ? "" : "s"}`);
      if (failures.length) {
        toast.error(`${failures.length} failed`, {
          description: failures.slice(0, 3).join("; "),
        });
      }
      if (ok) {
        resetPreview();
        setAikenText("");
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
        if (!next) resetPreview();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={variant}>
          <Upload className="size-4" />
          Bulk import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk import questions</DialogTitle>
          <DialogDescription>
            Import many questions at once via CSV (Excel) or Moodle-style Aiken text.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="csv" className="gap-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV / Excel</TabsTrigger>
            <TabsTrigger value="aiken">Aiken text</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadQuestionCsvTemplate}>
                <Download className="size-4" />
                Download template
              </Button>
            </div>
            <div className="space-y-2 text-muted-foreground text-xs">
              <p>
                <strong className="text-foreground">3 languages (EN / SI / TA):</strong> use{" "}
                <code className="rounded bg-muted px-1">question_en</code>,{" "}
                <code className="rounded bg-muted px-1">question_si</code>,{" "}
                <code className="rounded bg-muted px-1">question_ta</code>. For choices use{" "}
                <code className="rounded bg-muted px-1">option_a</code> (English),{" "}
                <code className="rounded bg-muted px-1">option_a_si</code>,{" "}
                <code className="rounded bg-muted px-1">option_a_ta</code> (same for b–e).
              </p>
              <p>
                Short answers: <code className="rounded bg-muted px-1">accepted_answers</code> plus optional{" "}
                <code className="rounded bg-muted px-1">accepted_answers_si</code> /{" "}
                <code className="rounded bg-muted px-1">accepted_answers_ta</code> (| between answers).
                English question text is optional — SI-only or TA-only papers are allowed.
              </p>
              <p>Open the .csv in Excel (UTF-8), fill rows, Save As CSV, then upload.</p>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm hover:bg-muted/40">
              <FileUp className="size-6 text-muted-foreground" />
              <span>{fileName ? fileName : "Choose .csv file"}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCsvFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </TabsContent>

          <TabsContent value="aiken" className="space-y-4">
            <Field>
              <FieldLabel>Paste Aiken text</FieldLabel>
              <Textarea
                rows={14}
                value={aikenText}
                onChange={(e) => setAikenText(e.target.value)}
                placeholder={AIKEN_EXAMPLE}
                className="font-mono text-xs"
              />
              <FieldDescription className="space-y-1">
                <span className="block">
                  <strong>Multilingual:</strong> prefix lines with{" "}
                  <code className="rounded bg-muted px-1">EN:</code>{" "}
                  <code className="rounded bg-muted px-1">SI:</code>{" "}
                  <code className="rounded bg-muted px-1">TA:</code> for the question. Options:{" "}
                  <code className="rounded bg-muted px-1">A. English</code> or{" "}
                  <code className="rounded bg-muted px-1">A-SI:</code> /{" "}
                  <code className="rounded bg-muted px-1">A-TA:</code>. End with{" "}
                  <code className="rounded bg-muted px-1">ANSWER: A</code>.
                </span>
                <span className="block">
                  Sinhala-only papers are fine — use only{" "}
                  <code className="rounded bg-muted px-1">SI:</code> and{" "}
                  <code className="rounded bg-muted px-1">A-SI:</code> (same for Tamil with{" "}
                  <code className="rounded bg-muted px-1">TA:</code>). Plain Moodle Aiken
                  (English only) still works. Separate questions with a blank line.
                </span>
              </FieldDescription>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAikenText(AIKEN_EXAMPLE)}>
                Load example
              </Button>
              <Button type="button" size="sm" onClick={handleParseAiken} disabled={!aikenText.trim()}>
                Parse text
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {(previewCount > 0 || issues.length > 0) && (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm">
              Ready to import: <strong>{previewCount}</strong> question
              {previewCount === 1 ? "" : "s"}
              {issues.length > 0 && (
                <span className="text-muted-foreground"> · {issues.length} row warning(s)</span>
              )}
            </p>
            <IssuesList issues={issues} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing || pending.length === 0}
          >
            {importing ? (
              <>
                <Spinner className="size-4" />
                Importing…
              </>
            ) : (
              <>Import {pending.length || ""}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
