"use client";

import { useCallback, useEffect, useState } from "react";

import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type PeriodStatus = "Open" | "Calculating" | "Settled" | "Paid";
type PayoutStatus = "Pending" | "Approved" | "Paid" | "Held";

interface EarningsSummary {
  lifetimeEarnedLkr: number;
  pendingPayoutLkr: number;
  paidOutLkr: number;
  completedAttempts: number;
}

interface PeriodShare {
  periodId: string;
  periodStart: string;
  periodEnd: string;
  periodStatus: PeriodStatus;
  attemptCount: number;
  shareRatio: number;
  amountLkr: number;
  teacherPoolLkr: number;
  totalBillableAttempts: number;
}

interface PayoutItem {
  id: string;
  periodId: string;
  periodStart: string;
  periodEnd: string;
  amountLkr: number;
  status: PayoutStatus;
  paidAt: string | null;
  reference: string | null;
}

interface PayoutProfile {
  accountName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  branch: string | null;
}

function formatLkr(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `LKR ${n.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
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

export function TeacherEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [periods, setPeriods] = useState<PeriodShare[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [profile, setProfile] = useState<PayoutProfile>({
    accountName: "",
    bankName: "",
    accountNumber: "",
    branch: "",
  });

  const load = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/teacher/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load earnings");
      const data = await res.json();
      setSummary(data.summary);
      setPeriods(data.periods ?? []);
      setPayouts(data.payouts ?? []);
      const p = data.payoutProfile as PayoutProfile | null;
      setProfile({
        accountName: p?.accountName ?? "",
        bankName: p?.bankName ?? "",
        accountNumber: p?.accountNumber ?? "",
        branch: p?.branch ?? "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/teacher/payout-profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountName: profile.accountName || undefined,
          bankName: profile.bankName || undefined,
          accountNumber: profile.accountNumber || undefined,
          branch: profile.branch || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Could not save profile");
      setProfile({
        accountName: body.accountName ?? "",
        bankName: body.bankName ?? "",
        accountNumber: body.accountNumber ?? "",
        branch: body.branch ?? "",
      });
      toast.success("Payout profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your share of the monthly teacher pool, based on completed quiz attempts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lifetime earned" value={formatLkr(summary?.lifetimeEarnedLkr)} />
        <StatCard label="Pending payout" value={formatLkr(summary?.pendingPayoutLkr)} />
        <StatCard label="Paid out" value={formatLkr(summary?.paidOutLkr)} />
        <StatCard
          label="Completed attempts"
          value={String(summary?.completedAttempts ?? 0)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly shares</CardTitle>
          <CardDescription>
            Amounts appear after the platform calculates each month. Free months show 0 LKR with
            attempt ratios for transparency.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {periods.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No settled months yet. Keep publishing quizzes — shares appear after monthly
              calculation.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Month</th>
                  <th className="px-2 py-2 font-medium">Your attempts</th>
                  <th className="px-2 py-2 font-medium">Pool attempts</th>
                  <th className="px-2 py-2 font-medium">Your share</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.periodId} className="border-b border-border/60">
                    <td className="px-2 py-2.5 font-medium">{monthLabel(p.periodStart)}</td>
                    <td className="px-2 py-2.5">{p.attemptCount}</td>
                    <td className="px-2 py-2.5">{p.totalBillableAttempts}</td>
                    <td className="px-2 py-2.5">{(p.shareRatio * 100).toFixed(2)}%</td>
                    <td className="px-2 py-2.5 font-medium">{formatLkr(p.amountLkr)}</td>
                    <td className="px-2 py-2.5">
                      <Badge variant="outline">{p.periodStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {payouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Month</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Reference</th>
                  <th className="px-2 py-2 font-medium">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="px-2 py-2.5">{monthLabel(p.periodStart)}</td>
                    <td className="px-2 py-2.5 font-medium">{formatLkr(p.amountLkr)}</td>
                    <td className="px-2 py-2.5">
                      <Badge variant={payoutBadge(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">{p.reference || "—"}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bank payout profile</CardTitle>
          <CardDescription>
            Used when the platform transfers your monthly share. Keep details accurate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Account name</Label>
            <Input
              id="account-name"
              value={profile.accountName ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, accountName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank-name">Bank name</Label>
            <Input
              id="bank-name"
              value={profile.bankName ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, bankName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-number">Account number</Label>
            <Input
              id="account-number"
              value={profile.accountNumber ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, accountNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={profile.branch ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, branch: e.target.value }))}
            />
          </div>
          <Button onClick={() => void saveProfile()} disabled={saving}>
            <Save className="mr-1.5 size-3.5" />
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
