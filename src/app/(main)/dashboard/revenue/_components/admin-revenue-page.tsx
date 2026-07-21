"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Calculator, CheckCircle2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PeriodStatus = "Open" | "Calculating" | "Settled" | "Paid";
type PayoutStatus = "Pending" | "Approved" | "Paid" | "Held";

interface PeriodRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossRevenueLkr: number;
  platformShareLkr: number;
  teacherPoolLkr: number;
  totalBillableAttempts: number;
  status: PeriodStatus;
  calculatedAt: string | null;
  settledAt: string | null;
  shareCount?: number;
  payoutCount?: number;
}

interface TeacherRef {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name?: string | null;
}

interface ShareRow {
  id: string;
  teacherUserId: string;
  attemptCount: number;
  shareRatio: number;
  amountLkr: number;
  teacher: TeacherRef;
}

interface PayoutRow {
  id: string;
  teacherUserId: string;
  amountLkr: number;
  status: PayoutStatus;
  paidAt: string | null;
  reference: string | null;
  teacher: TeacherRef & {
    payoutProfile?: {
      accountName: string | null;
      bankName: string | null;
      accountNumber: string | null;
      branch: string | null;
    } | null;
  };
}

interface PeriodDetail extends PeriodRow {
  shares: ShareRow[];
  payouts: PayoutRow[];
}

function authHeaders(json = true): HeadersInit {
  const token = getClientCookie("session_token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function formatLkr(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `LKR ${n.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function teacherLabel(t: TeacherRef) {
  const name = [t.firstName, t.lastName].filter(Boolean).join(" ") || t.name;
  return name?.trim() || t.email;
}

function periodBadge(status: PeriodStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Paid":
      return "default";
    case "Settled":
      return "secondary";
    case "Calculating":
      return "outline";
    default:
      return "outline";
  }
}

function payoutBadge(status: PayoutStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Paid":
      return "default";
    case "Approved":
      return "secondary";
    case "Held":
      return "destructive";
    default:
      return "outline";
  }
}

export function AdminRevenuePage() {
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PeriodDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});

  const loadPeriods = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/revenue/periods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load revenue periods");
      const data = (await res.json()) as PeriodRow[];
      setPeriods(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load revenue");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/revenue/periods/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load period detail");
      const data = (await res.json()) as PeriodDetail;
      setDetail(data);
      const refs: Record<string, string> = {};
      for (const p of data.payouts) {
        refs[p.id] = p.reference ?? "";
      }
      setPayoutRefs(refs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load detail");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const calculate = async (force = false) => {
    setBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/revenue/periods/calculate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          year: Number(year),
          month: Number(month),
          force,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          Array.isArray(body.message) ? body.message.join(", ") : body.message || "Calculate failed",
        );
      }
      toast.success("Period calculated");
      setSelectedId(body.id);
      await loadPeriods();
      await loadDetail(body.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Calculate failed");
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/revenue/periods/${selectedId}/settle`, {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Settle failed");
      toast.success("Payouts created (Pending)");
      await loadPeriods();
      await loadDetail(selectedId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/revenue/periods/${selectedId}/mark-paid`, {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Mark paid failed");
      toast.success("Period marked Paid");
      await loadPeriods();
      await loadDetail(selectedId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mark paid failed");
    } finally {
      setBusy(false);
    }
  };

  const updatePayout = async (id: string, status: PayoutStatus) => {
    setBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/revenue/payouts/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          status,
          reference: payoutRefs[id]?.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Update failed");
      toast.success(`Payout → ${status}`);
      if (selectedId) await loadDetail(selectedId);
      await loadPeriods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const years = useMemo(() => {
    const y = now.getUTCFullYear();
    return [y, y - 1, y - 2];
  }, [now]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly subscription split: platform cut + teacher pool by completed attempts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadPeriods()} disabled={busy}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Calculate month</CardTitle>
          <CardDescription>
            Sums paid subscriptions for the month, applies the billing split, and allocates the
            teacher pool by attempt share.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {new Date(Date.UTC(2020, m - 1, 1)).toLocaleString("en", {
                      month: "long",
                      timeZone: "UTC",
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void calculate(false)} disabled={busy}>
            <Calculator className="mr-1.5 size-3.5" />
            Calculate
          </Button>
          <Button variant="outline" onClick={() => void calculate(true)} disabled={busy}>
            Recalculate (force)
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Periods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {periods.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No periods yet. Calculate a month to start.
              </p>
            ) : (
              periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    selectedId === p.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{monthLabel(p.periodStart)}</span>
                    <Badge variant={periodBadge(p.status)} className="text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatLkr(p.grossRevenueLkr)} · {p.totalBillableAttempts} attempts
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {detailLoading || !detail ? (
            <Card>
              <CardContent className="flex h-48 items-center justify-center">
                {detailLoading ? (
                  <Spinner className="size-6 text-muted-foreground" />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a period</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
                  <div>
                    <CardTitle className="text-base">{monthLabel(detail.periodStart)}</CardTitle>
                    <CardDescription className="mt-1">
                      Status <Badge variant={periodBadge(detail.status)}>{detail.status}</Badge>
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !detail.calculatedAt || detail.status === "Paid"}
                      onClick={() => void settle()}
                    >
                      <Wallet className="mr-1.5 size-3.5" />
                      Settle payouts
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy || detail.status !== "Settled"}
                      onClick={() => void markPaid()}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Mark paid
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Gross (R)" value={formatLkr(detail.grossRevenueLkr)} />
                  <Stat label="Platform" value={formatLkr(detail.platformShareLkr)} />
                  <Stat label="Teacher pool" value={formatLkr(detail.teacherPoolLkr)} />
                  <Stat label="Billable attempts" value={String(detail.totalBillableAttempts)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Teacher shares</CardTitle>
                  <CardDescription>
                    (teacher attempts ÷ all attempts) × teacher pool
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {detail.shares.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No teacher attempts in this period (or only platform quizzes).
                    </p>
                  ) : (
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b text-xs text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 font-medium">Teacher</th>
                          <th className="px-2 py-2 font-medium">Attempts</th>
                          <th className="px-2 py-2 font-medium">Share</th>
                          <th className="px-2 py-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.shares.map((s) => (
                          <tr key={s.id} className="border-b border-border/60">
                            <td className="px-2 py-2.5">
                              <div className="font-medium">{teacherLabel(s.teacher)}</div>
                              <div className="text-xs text-muted-foreground">{s.teacher.email}</div>
                            </td>
                            <td className="px-2 py-2.5">{s.attemptCount}</td>
                            <td className="px-2 py-2.5">
                              {(s.shareRatio * 100).toFixed(2)}%
                            </td>
                            <td className="px-2 py-2.5 font-medium">{formatLkr(s.amountLkr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Payouts</CardTitle>
                  <CardDescription>Created after Settle. Update status per teacher.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {detail.payouts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No payouts yet — calculate, then settle.
                    </p>
                  ) : (
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b text-xs text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 font-medium">Teacher</th>
                          <th className="px-2 py-2 font-medium">Bank</th>
                          <th className="px-2 py-2 font-medium">Amount</th>
                          <th className="px-2 py-2 font-medium">Status</th>
                          <th className="px-2 py-2 font-medium">Reference</th>
                          <th className="px-2 py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.payouts.map((p) => {
                          const bank = p.teacher.payoutProfile;
                          return (
                            <tr key={p.id} className="border-b border-border/60 align-top">
                              <td className="px-2 py-2.5">
                                <div className="font-medium">{teacherLabel(p.teacher)}</div>
                                <div className="text-xs text-muted-foreground">{p.teacher.email}</div>
                              </td>
                              <td className="px-2 py-2.5 text-xs text-muted-foreground">
                                {bank?.bankName || bank?.accountNumber ? (
                                  <>
                                    <div>{bank.bankName || "—"}</div>
                                    <div>{bank.accountName || "—"}</div>
                                    <div className="font-mono">{bank.accountNumber || "—"}</div>
                                  </>
                                ) : (
                                  "No profile"
                                )}
                              </td>
                              <td className="px-2 py-2.5 font-medium">{formatLkr(p.amountLkr)}</td>
                              <td className="px-2 py-2.5">
                                <Badge variant={payoutBadge(p.status)}>{p.status}</Badge>
                              </td>
                              <td className="px-2 py-2.5">
                                <Input
                                  className="h-8 w-[140px] text-xs"
                                  placeholder="Ref #"
                                  value={payoutRefs[p.id] ?? ""}
                                  onChange={(e) =>
                                    setPayoutRefs((prev) => ({
                                      ...prev,
                                      [p.id]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-2 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {p.status === "Pending" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      disabled={busy}
                                      onClick={() => void updatePayout(p.id, "Approved")}
                                    >
                                      Approve
                                    </Button>
                                  )}
                                  {(p.status === "Pending" || p.status === "Approved") && (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      disabled={busy}
                                      onClick={() => void updatePayout(p.id, "Paid")}
                                    >
                                      Paid
                                    </Button>
                                  )}
                                  {p.status !== "Held" && p.status !== "Paid" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      disabled={busy}
                                      onClick={() => void updatePayout(p.id, "Held")}
                                    >
                                      Hold
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
