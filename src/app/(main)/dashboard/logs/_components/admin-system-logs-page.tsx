"use client";

import { useCallback, useEffect, useState } from "react";

import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

const ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "SIGNUP",
  "CREATE",
  "UPDATE",
  "DELETE",
  "CHANGE_STATUS",
] as const;

const SUBJECTS = [
  "AUTH",
  "USERS",
  "ROLES",
  "QUIZZES",
  "QUESTIONS",
  "COURSES",
  "PAYMENTS",
  "SETTINGS",
  "TEACHER_PAGE",
] as const;

type AuditAction = (typeof ACTIONS)[number];

interface AuditLogRow {
  id: string;
  action: AuditAction;
  subject: string;
  description: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditListResponse {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function actionBadgeVariant(action: AuditAction): "default" | "secondary" | "destructive" | "outline" {
  switch (action) {
    case "DELETE":
    case "LOGIN_FAILED":
      return "destructive";
    case "CREATE":
    case "SIGNUP":
      return "default";
    case "UPDATE":
    case "CHANGE_STATUS":
      return "secondary";
    default:
      return "outline";
  }
}

export function AdminSystemLogsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [enabled, setEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [togglingSettings, setTogglingSettings] = useState(false);

  const authHeaders = useCallback(() => {
    const token = getClientCookie("session_token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/audit-logs/settings`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load audit settings");
      const data = await res.json();
      setEnabled(Boolean(data.enabled));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load audit settings");
    } finally {
      setSettingsLoading(false);
    }
  }, [authHeaders]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (subjectFilter !== "all") params.set("subject", subjectFilter);
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());

      const res = await fetch(`${APP_CONFIG.apiUrl}/audit-logs?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load audit logs");
      const data: AuditListResponse = await res.json();
      setRows(data.rows);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, page, actionFilter, subjectFilter, search, from, to]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, subjectFilter, search, from, to]);

  const toggleEnabled = async (next: boolean) => {
    setTogglingSettings(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/audit-logs/settings`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("Failed to update audit settings");
      setEnabled(next);
      toast.success(next ? "Audit logging enabled" : "Audit logging disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingSettings(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">System Logs</h1>
        <p className="text-muted-foreground text-sm">
          Audit trail of logins, sign-ups, and create/update/delete actions across the platform.
          Visible to super admins only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Audit logging</CardTitle>
                <CardDescription>
                  {enabled ? "Currently recording new events." : "Logging is paused — no new events are recorded."}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {settingsLoading ? (
                <Spinner className="size-4" />
              ) : (
                <Switch
                  checked={enabled}
                  disabled={togglingSettings}
                  onCheckedChange={(checked) => void toggleEnabled(checked)}
                />
              )}
              <span className="text-muted-foreground text-sm">{enabled ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Activity log</CardTitle>
              <CardDescription>Most recent events first.</CardDescription>
            </div>
            <p className="text-muted-foreground text-xs">
              {total} result{total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, email, IP, description…"
              className="w-full sm:max-w-xs"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-[150px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-[150px]"
              aria-label="To date"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2">
              <Spinner className="size-5" />
              <span className="text-muted-foreground text-sm">Loading logs…</span>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events match these filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-border border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Module</th>
                      <th className="px-4 py-3 font-medium">Actor</th>
                      <th className="px-4 py-3 font-medium">IP address</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-border border-b last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={actionBadgeVariant(row.action)}>
                            {row.action.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-xs">
                            {row.subject.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.actorName || row.actorEmail || "—"}</div>
                          <div className="text-muted-foreground text-xs">
                            {[row.actorEmail && row.actorName ? row.actorEmail : null, row.actorRole]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.ipAddress || "—"}</td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-muted-foreground text-xs">
                          {row.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground text-xs">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
