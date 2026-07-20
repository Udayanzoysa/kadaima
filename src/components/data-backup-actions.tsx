"use client";

import { useRef, useState } from "react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type Resource = "questions" | "courses" | "quizzes" | "modules";

type ImportResult = {
  created: number;
  failed: number;
  total: number;
  modulesCreated?: number;
  failures?: string[];
};

type Props = {
  resource: Resource;
  /**
   * API path prefix without leading slash.
   * Defaults to `resource`. Use e.g. `courses/{id}/modules` for module backup.
   */
  apiPath?: string;
  onImported?: () => void;
};

const RESOURCE_LABEL: Record<Resource, string> = {
  questions: "Questions",
  courses: "Courses",
  quizzes: "Quizzes",
  modules: "Modules",
};

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^"]+)"?/i.exec(header);
  return match?.[1] || fallback;
}

async function downloadExport(apiPath: string, resource: Resource, format: "json" | "xlsx") {
  const token = getClientCookie("session_token");
  if (!token) throw new Error("Not signed in");

  const res = await fetch(
    `${APP_CONFIG.apiUrl}/${apiPath}/export?format=${format}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const fallback = `${resource}-backup.${format === "xlsx" ? "xlsx" : "json"}`;
  const filename = filenameFromDisposition(
    res.headers.get("Content-Disposition"),
    fallback,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function uploadImport(apiPath: string, file: File): Promise<ImportResult> {
  const token = getClientCookie("session_token");
  if (!token) throw new Error("Not signed in");

  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${APP_CONFIG.apiUrl}/${apiPath}/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Import failed";
    throw new Error(msg);
  }
  return data as ImportResult;
}

export function DataBackupActions({ resource, apiPath, onImported }: Props) {
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = RESOURCE_LABEL[resource];
  const path = apiPath?.replace(/^\/+|\/+$/g, "") || resource;

  const handleExport = async (format: "json" | "xlsx") => {
    setExportBusy(true);
    try {
      await downloadExport(path, resource, format);
      toast.success(`${label} exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    try {
      const result = await uploadImport(path, file);
      const modulesNote =
        typeof result.modulesCreated === "number"
          ? ` · ${result.modulesCreated} modules`
          : "";
      if (result.failed > 0) {
        toast.warning(
          `Imported ${result.created}/${result.total}${modulesNote}. ${result.failed} failed.`,
        );
        if (result.failures?.length) {
          console.warn("Import failures:", result.failures);
        }
      } else {
        toast.success(`Imported ${result.created} ${label.toLowerCase()}${modulesNote}`);
      }
      setOpen(false);
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={exportBusy}>
            {exportBusy ? <Spinner className="size-4" /> : <Download className="size-4" />}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void handleExport("json")}>
            Backup JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
            Excel (.xlsx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="size-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import {label}</DialogTitle>
            <DialogDescription>
              Restore from a backup JSON or Excel file. Items are created as new
              records (existing data is not overwritten).
              {resource === "quizzes"
                ? " Quizzes must match an existing course (and module) by English title."
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Accepts <code className="text-xs">.json</code> or{" "}
              <code className="text-xs">.xlsx</code> exported from this page.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".json,.xlsx,.xls,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => void handleImport(e.target.files?.[0])}
            />
            <Button
              className="w-full"
              disabled={importBusy}
              onClick={() => inputRef.current?.click()}
            >
              {importBusy ? (
                <Spinner className="size-4" />
              ) : (
                <FileUp className="size-4" />
              )}
              Choose backup file
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
