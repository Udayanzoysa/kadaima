"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type BackupStatus = "PENDING" | "RUNNING" | "READY" | "FAILED" | "RESTORING";

interface BackupRow {
  id: string;
  label: string | null;
  status: BackupStatus;
  fileName: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  pgVersion: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  downloadReady: boolean;
  createdBy: { id: string; email: string | null; name: string | null } | null;
}

interface BackupStatusInfo {
  backupDir: string;
  retentionCount: number;
  cronEnabled: boolean;
  busy: boolean;
  tools: { pgDump: boolean; pgRestore: boolean; psql: boolean };
  database: string | null;
  note: string;
}

function authHeaders(json = true): HeadersInit {
  const token = getClientCookie("token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function formatBytes(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusVariant(status: BackupStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "READY":
      return "default";
    case "FAILED":
      return "destructive";
    case "RUNNING":
    case "PENDING":
    case "RESTORING":
      return "secondary";
    default:
      return "outline";
  }
}

export function AdminDatabaseBackupPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [status, setStatus] = useState<BackupStatusInfo | null>(null);
  const [label, setLabel] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadConfirm, setUploadConfirm] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [listRes, statusRes] = await Promise.all([
        fetch(`${APP_CONFIG.apiUrl}/backup?page=1&pageSize=50`, {
          headers: authHeaders(),
        }),
        fetch(`${APP_CONFIG.apiUrl}/backup/status`, {
          headers: authHeaders(),
        }),
      ]);
      if (!listRes.ok) throw new Error("Failed to load backups");
      if (!statusRes.ok) throw new Error("Failed to load backup status");
      const listJson = await listRes.json();
      const statusJson = (await statusRes.json()) as BackupStatusInfo;
      setRows(listJson.rows ?? []);
      setStatus(statusJson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load backups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const needsPoll = rows.some(
      (r) => r.status === "PENDING" || r.status === "RUNNING" || r.status === "RESTORING",
    );
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!needsPoll) return;
    pollRef.current = setInterval(() => {
      void load();
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [rows, load]);

  async function createBackup() {
    setCreating(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/backup`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not start backup");
      toast.success("Backup started");
      setLabel("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setCreating(false);
    }
  }

  async function downloadBackup(row: BackupRow) {
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/backup/${row.id}/download`, {
        headers: authHeaders(false),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.fileName || `kadaima-${row.id}.dump`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function deleteBackup(row: BackupRow) {
    if (!window.confirm(`Delete backup “${row.label || row.fileName}”?`)) return;
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/backup/${row.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Delete failed");
      toast.success("Backup deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function confirmRestore() {
    if (!restoreTarget || confirmText !== "RESTORE") return;
    setRestoring(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/backup/${restoreTarget.id}/restore`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ confirmationPhrase: confirmText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Restore failed to start");
      toast.success(data.message || "Restore started");
      setRestoreTarget(null);
      setConfirmText("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  }

  async function confirmUploadRestore() {
    if (!uploadFile || uploadConfirm !== "RESTORE") return;
    setRestoring(true);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("confirmationPhrase", uploadConfirm);
      const res = await fetch(`${APP_CONFIG.apiUrl}/backup/restore/upload`, {
        method: "POST",
        headers: authHeaders(false),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Restore upload failed");
      toast.success(data.message || "Restore started from upload");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadConfirm("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const toolsOk = status?.tools.pgDump && status?.tools.pgRestore;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Database Backup</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Master copy of the PostgreSQL database for server moves and disaster recovery.
          Super admin only.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="size-4" />
            System
          </CardTitle>
          <CardDescription>{status?.note}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Database</span>
            <p className="font-mono text-xs">{status?.database ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Retention</span>
            <p>Keep last {status?.retentionCount ?? "—"} ready backups</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tools</span>
            <p className="flex flex-wrap gap-2 pt-1">
              <Badge variant={status?.tools.pgDump ? "default" : "destructive"}>pg_dump</Badge>
              <Badge variant={status?.tools.pgRestore ? "default" : "destructive"}>
                pg_restore
              </Badge>
              <Badge variant={status?.busy ? "secondary" : "outline"}>
                {status?.busy ? "Job running" : "Idle"}
              </Badge>
              <Badge variant={status?.cronEnabled ? "default" : "outline"}>
                Cron {status?.cronEnabled ? "on" : "off"}
              </Badge>
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="flex items-start gap-2 text-xs leading-relaxed">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Quiz images and slips live in the <code>uploads</code> Docker volume — back that up
              separately when migrating servers.
            </p>
          </div>
        </CardContent>
      </Card>

      {!toolsOk && (
        <Card className="border-destructive/40">
          <CardContent className="flex gap-3 pt-6 text-sm">
            <ShieldAlert className="text-destructive size-5 shrink-0" />
            <div>
              <p className="font-medium">PostgreSQL client tools missing</p>
              <p className="text-muted-foreground mt-1">
                Rebuild the API image so the Dockerfile installs{" "}
                <code>postgresql15-client</code>, then redeploy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4" />
            Create master backup
          </CardTitle>
          <CardDescription>
            Compressed PostgreSQL custom-format dump (scales as the database grows).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="backup-label">Label (optional)</Label>
            <Input
              id="backup-label"
              placeholder="Before production cutover"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={160}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={creating}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button type="button" onClick={() => void createBackup()} disabled={creating || !toolsOk}>
              {creating ? <Spinner className="size-4" /> : <Database className="size-4" />}
              Create backup
            </Button>
            <Button type="button" variant="secondary" onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" />
              Restore upload
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Backup history</CardTitle>
          <CardDescription>Download to keep an off-server copy. Restore replaces the live DB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No backups yet.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{row.label || row.fileName || row.id}</p>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    {row.status === "READY" && (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {new Date(row.createdAt).toLocaleString()} · {formatBytes(row.sizeBytes)}
                    {row.pgVersion ? ` · PG ${row.pgVersion}` : ""}
                    {row.createdBy?.email ? ` · ${row.createdBy.email}` : ""}
                  </p>
                  {row.checksumSha256 && (
                    <p className="text-muted-foreground truncate font-mono text-[10px]">
                      sha256:{row.checksumSha256}
                    </p>
                  )}
                  {row.errorMessage && (
                    <p className="text-destructive text-xs">{row.errorMessage}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!row.downloadReady}
                    onClick={() => void downloadBackup(row)}
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={row.status !== "READY" || !toolsOk}
                    onClick={() => {
                      setConfirmText("");
                      setRestoreTarget(row);
                    }}
                  >
                    Restore
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={
                      row.status === "RUNNING" ||
                      row.status === "PENDING" ||
                      row.status === "RESTORING"
                    }
                    onClick={() => void deleteBackup(row)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!restoreTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreTarget(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore database?</DialogTitle>
            <DialogDescription>
              This replaces the live database with{" "}
              <strong>{restoreTarget?.label || restoreTarget?.fileName}</strong>. A safety backup
              is attempted first. Type <code>RESTORE</code> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESTORE"
            autoComplete="off"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRestoreTarget(null)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmText !== "RESTORE" || restoring}
              onClick={() => void confirmRestore()}
            >
              {restoring ? <Spinner className="size-4" /> : null}
              Restore now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadOpen(false);
            setUploadFile(null);
            setUploadConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from uploaded dump</DialogTitle>
            <DialogDescription>
              Use a <code>.dump</code> file from another server. Type <code>RESTORE</code> to
              confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept=".dump,.backup,.pgdump"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            <Input
              value={uploadConfirm}
              onChange={(e) => setUploadConfirm(e.target.value)}
              placeholder="RESTORE"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!uploadFile || uploadConfirm !== "RESTORE" || restoring}
              onClick={() => void confirmUploadRestore()}
            >
              {restoring ? <Spinner className="size-4" /> : null}
              Upload & restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
