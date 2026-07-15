"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

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
import { localize, mediaUrl, type LocalizedText, type QuizSummary } from "@/types/quiz";

type TabId = "ledger" | "vouchers" | "slips";

interface LedgerRow {
  id: string;
  method: "PayHere" | "Voucher" | "Slip";
  status: string;
  amountLkr: number | null;
  quiz: { id: string; title: LocalizedText | string };
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
    school: string | null;
    guestSessionId: string | null;
    isAccount?: boolean;
  };
  reference?: string | null;
  details: string;
  createdAt: string;
  refId: string;
}

interface VoucherRow {
  id: string;
  code: string;
  quizId: string | null;
  quiz: { id: string; title: LocalizedText | string } | null;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SlipRow {
  id: string;
  quizId: string;
  quiz: { id: string; title: LocalizedText | string; priceLkr?: number | null };
  user: { id: string; email: string; name: string | null; phoneNumber: string | null } | null;
  guestSessionId: string | null;
  slipImageUrl: string;
  bankReference?: string | null;
  note: string | null;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

function quizTitle(title: LocalizedText | string) {
  return localize(title as LocalizedText, "en");
}

export function AdminPaymentsPage() {
  const [tab, setTab] = useState<TabId>("ledger");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherQuizId, setVoucherQuizId] = useState<string>("__any__");
  const [voucherMax, setVoucherMax] = useState(10);
  const [creatingVoucher, setCreatingVoucher] = useState(false);

  const authHeaders = () => {
    const token = getClientCookie("session_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const load = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const [ledgerRes, vouchersRes, slipsRes, quizzesRes] = await Promise.all([
        fetch(`${APP_CONFIG.apiUrl}/payments/admin/ledger`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${APP_CONFIG.apiUrl}/payments/admin/vouchers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${APP_CONFIG.apiUrl}/payments/admin/slips`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${APP_CONFIG.apiUrl}/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!ledgerRes.ok) throw new Error("Failed to load payment ledger");
      setLedger(await ledgerRes.json());
      if (vouchersRes.ok) setVouchers(await vouchersRes.json());
      if (slipsRes.ok) setSlips(await slipsRes.json());
      if (quizzesRes.ok) setQuizzes(await quizzesRes.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLedger = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return ledger.filter((r) => {
      if (methodFilter !== "all" && r.method !== methodFilter) return false;
      if (statusFilter !== "all" && r.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      const hay = [
        r.user.name,
        r.user.email,
        r.user.phone,
        r.reference,
        r.details,
        quizTitle(r.quiz.title),
        r.method,
        r.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ledger, methodFilter, statusFilter, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pagedLedger = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filteredLedger.slice(start, start + pageSize);
  }, [filteredLedger, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [methodFilter, statusFilter, searchFilter]);

  const createVoucher = async () => {
    if (voucherCode.trim().length < 3) {
      toast.error("Enter a voucher code (min 3 characters).");
      return;
    }
    setCreatingVoucher(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/payments/admin/vouchers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          code: voucherCode.trim(),
          quizId: voucherQuizId === "__any__" ? null : voucherQuizId,
          maxRedemptions: voucherMax,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(err.message) ? err.message.join(", ") : err.message || "Create failed",
        );
      }
      toast.success("Voucher created");
      setVoucherCode("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreatingVoucher(false);
    }
  };

  const toggleVoucher = async (id: string, isActive: boolean) => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/payments/admin/vouchers/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(isActive ? "Voucher activated" : "Voucher deactivated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const reviewSlip = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/payments/admin/slips/${id}/${action}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `${action} failed`);
      }
      toast.success(action === "approve" ? "Slip approved — quiz unlocked" : "Slip rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading payments…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Payments</h1>
        <p className="text-muted-foreground text-sm">
          Track PayHere, voucher codes, and bank-slip unlocks with student details.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ledger", "All payments"],
            ["vouchers", "Voucher codes"],
            ["slips", "Bank slips"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "ledger" && (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Payment ledger</CardTitle>
                <CardDescription>PayHere orders, voucher unlocks, and bank slips.</CardDescription>
              </div>
              <p className="text-muted-foreground text-xs">
                {filteredLedger.length} result{filteredLedger.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search student, email, reference…"
                className="w-full sm:max-w-xs"
              />
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="PayHere">PayHere</SelectItem>
                  <SelectItem value="Voucher">Voucher</SelectItem>
                  <SelectItem value="Slip">Bank slip</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unlocked">Unlocked</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredLedger.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payments match these filters.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Method</th>
                        <th className="px-4 py-3 font-medium">Reference</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Quiz</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedLedger.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                              {row.method === "Slip" ? "Bank slip" : row.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {row.reference || "—"}
                          </td>
                          <td className="px-4 py-3">{row.status}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {row.user.name || row.user.email || "—"}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {[
                                row.user.email && row.user.name ? row.user.email : null,
                                row.user.phone,
                                row.user.school,
                              ]
                                .filter(Boolean)
                                .join(" · ") || (row.user.isAccount ? "Account" : "Guest")}
                            </div>
                          </td>
                          <td className="px-4 py-3">{quizTitle(row.quiz.title)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.amountLkr != null
                              ? `LKR ${Number(row.amountLkr).toFixed(0)}`
                              : "—"}
                          </td>
                          <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground text-xs">
                            {row.details.startsWith("/uploads/") ? (
                              <a
                                href={mediaUrl(row.details, APP_CONFIG.apiUrl) ?? row.details}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline"
                              >
                                View slip
                              </a>
                            ) : (
                              row.details
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-muted-foreground text-xs">
                    Page {pageSafe} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pageSafe <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pageSafe >= totalPages}
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
      )}

      {tab === "vouchers" && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create voucher</CardTitle>
              <CardDescription>Students redeem this code to unlock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-1.5">
                <Label>Code</Label>
                <Input
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="GRADE5-2026"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Quiz (optional)</Label>
                <Select value={voucherQuizId} onValueChange={setVoucherQuizId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any locked quiz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any locked quiz</SelectItem>
                    {quizzes
                      .filter((q) => q.requiresUnlock)
                      .map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {localize(q.title, "en")}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Max redemptions</Label>
                <Input
                  type="number"
                  min={1}
                  value={voucherMax}
                  onChange={(e) => setVoucherMax(Number(e.target.value) || 1)}
                />
              </div>
              <Button
                className="w-full"
                disabled={creatingVoucher}
                onClick={() => void createVoucher()}
              >
                {creatingVoucher ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                Create voucher
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voucher codes</CardTitle>
              <CardDescription>{vouchers.length} codes</CardDescription>
            </CardHeader>
            <CardContent>
              {vouchers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No vouchers yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 font-medium">Code</th>
                        <th className="px-4 py-3 font-medium">Quiz</th>
                        <th className="px-4 py-3 font-medium">Used</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((v) => (
                        <tr key={v.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-mono font-medium">{v.code}</td>
                          <td className="px-4 py-3">
                            {v.quiz ? quizTitle(v.quiz.title) : "Any locked quiz"}
                          </td>
                          <td className="px-4 py-3">
                            {v.redemptionCount}/{v.maxRedemptions}
                          </td>
                          <td className="px-4 py-3">{v.isActive ? "Active" : "Inactive"}</td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === v.id}
                              onClick={() => void toggleVoucher(v.id, !v.isActive)}
                            >
                              {v.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "slips" && (
        <Card>
          <CardHeader>
            <CardTitle>Bank slip submissions</CardTitle>
            <CardDescription>Approve to unlock the quiz for that student.</CardDescription>
          </CardHeader>
          <CardContent>
            {slips.length === 0 ? (
              <p className="text-muted-foreground text-sm">No bank slips submitted.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Quiz</th>
                      <th className="px-4 py-3 font-medium">Slip</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slips.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {s.user?.name || s.user?.email || "—"}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {[s.user?.email, s.user?.phoneNumber].filter(Boolean).join(" · ") ||
                              s.guestSessionId?.slice(0, 16)}
                          </div>
                        </td>
                        <td className="px-4 py-3">{quizTitle(s.quiz.title)}</td>
                        <td className="px-4 py-3">
                          <a
                            href={mediaUrl(s.slipImageUrl, APP_CONFIG.apiUrl) ?? s.slipImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs underline"
                          >
                            Open file
                          </a>
                          {s.bankReference ? (
                            <div className="mt-1 font-mono text-xs">Ref: {s.bankReference}</div>
                          ) : null}
                          {s.note ? (
                            <div className="text-muted-foreground mt-1 text-xs">{s.note}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{s.status}</td>
                        <td className="px-4 py-3">
                          {s.status === "Pending" ? (
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                disabled={busyId === s.id}
                                onClick={() => void reviewSlip(s.id, "approve")}
                              >
                                <Check className="size-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === s.id}
                                onClick={() => void reviewSlip(s.id, "reject")}
                              >
                                <X className="size-3.5" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
