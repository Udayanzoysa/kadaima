"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Loader2,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/hooks/use-i18n";
import {
  approveManualSubmission,
  createClassFeePlan,
  createInvoiceAdjustment,
  downloadClassBillingCsv,
  fetchClassBillingLedger,
  fetchClassManualSubmissions,
  formatMoneyMinor,
  generateClassInvoices,
  openPrintableReceipt,
  recordInvoicePayment,
  refundTuitionPayment,
  rejectManualSubmission,
} from "@/lib/classes-api";
import type {
  ClassBillingLedgerResponse,
  ClassOverdueAccessPolicy,
  ClassProrationPolicy,
  TuitionAdjustmentType,
  TuitionInvoiceItem,
  TuitionInvoicePaymentAllocationItem,
  TuitionInvoiceStatus,
  TuitionManualSubmissionItem,
  TuitionPaymentChannel,
} from "@/types/classes";

interface ClassPaymentsTabProps {
  classId: string;
}

export function ClassPaymentsTab({ classId }: ClassPaymentsTabProps) {
  const { t } = useI18n();

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonth);
  const [statusFilter, setStatusFilter] = useState<TuitionInvoiceStatus | "ALL">(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [ledger, setLedger] = useState<ClassBillingLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fee Plan Modal
  const [planOpen, setPlanOpen] = useState(false);
  const [planAmountLkr, setPlanAmountLkr] = useState("2500");
  const [planDueDay, setPlanDueDay] = useState("10");
  const [planGraceDays, setPlanGraceDays] = useState("5");
  const [planProration, setPlanProration] =
    useState<ClassProrationPolicy>("FULL_MONTH");
  const [planAccessPolicy, setPlanAccessPolicy] =
    useState<ClassOverdueAccessPolicy>("ALLOW_WITH_WARNING");
  const [savingPlan, setSavingPlan] = useState(false);

  // Adjustment Modal
  const [adjustInvoice, setAdjustInvoice] = useState<TuitionInvoiceItem | null>(
    null,
  );
  const [adjustType, setAdjustType] =
    useState<TuitionAdjustmentType>("DISCOUNT");
  const [adjustAmountLkr, setAdjustAmountLkr] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Record Verified Payment Modal
  const [payInvoice, setPayInvoice] = useState<TuitionInvoiceItem | null>(null);
  const [payAmountLkr, setPayAmountLkr] = useState("");
  const [payChannel, setPayChannel] = useState<TuitionPaymentChannel>("CASH");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Phase 6: Pending Manual Submissions & Refund / Reject Modals
  const [pendingSubmissions, setPendingSubmissions] = useState<
    TuitionManualSubmissionItem[]
  >([]);
  const [approvingSubId, setApprovingSubId] = useState<string | null>(null);
  const [rejectSub, setRejectSub] =
    useState<TuitionManualSubmissionItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [savingReject, setSavingReject] = useState(false);

  const [refundTarget, setRefundTarget] = useState<{
    invoice: TuitionInvoiceItem;
    payment: TuitionInvoicePaymentAllocationItem;
  } | null>(null);
  const [refundAmountLkr, setRefundAmountLkr] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundIsChargeback, setRefundIsChargeback] = useState(false);
  const [savingRefund, setSavingRefund] = useState(false);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const [data, manualSubs] = await Promise.all([
        fetchClassBillingLedger(classId, {
          period: selectedPeriod,
          status: statusFilter === "ALL" ? "" : statusFilter,
          search: searchQuery,
        }),
        fetchClassManualSubmissions(classId, "Pending").catch(() => ({
          classId,
          total: 0,
          items: [],
        })),
      ]);
      setLedger(data);
      setPendingSubmissions(manualSubs.items || []);
      if (data.activeFeePlan) {
        setPlanAmountLkr(String(data.activeFeePlan.amountMinor / 100));
        setPlanDueDay(String(data.activeFeePlan.dueDay));
        setPlanGraceDays(String(data.activeFeePlan.graceDays));
        setPlanProration(data.activeFeePlan.prorationPolicy);
        setPlanAccessPolicy(data.activeFeePlan.overdueAccessPolicy);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load class billing ledger");
    } finally {
      setLoading(false);
    }
  }, [classId, selectedPeriod, statusFilter, searchQuery]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const statusBadge = (inv: TuitionInvoiceItem) => {
    switch (inv.status) {
      case "PAID":
        return (
          <Badge className="bg-emerald-600 text-white">
            {t("classes.billing.statusPaid")}
          </Badge>
        );
      case "PARTIALLY_PAID":
        return (
          <Badge className="bg-amber-600 text-white">
            {t("classes.billing.statusPartiallyPaid")}
            {inv.isOverdue ? ` (${t("classes.billing.statusOverdue")})` : ""}
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive">
            {t("classes.billing.statusOverdue")}
          </Badge>
        );
      case "WAIVED":
        return (
          <Badge className="bg-blue-600 text-white">
            {t("classes.billing.statusWaived")}
          </Badge>
        );
      case "VOIDED":
        return (
          <Badge variant="secondary">{t("classes.billing.statusVoided")}</Badge>
        );
      default:
        return (
          <Badge variant="outline">{t("classes.billing.statusIssued")}</Badge>
        );
    }
  };

  const handleSaveFeePlan = async () => {
    const major = Number(planAmountLkr);
    if (Number.isNaN(major) || major < 0) {
      toast.error("Enter a valid LKR monthly fee amount");
      return;
    }
    setSavingPlan(true);
    try {
      await createClassFeePlan(classId, {
        amountMinor: Math.round(major * 100),
        currency: "LKR",
        frequency: "MONTHLY",
        dueDay: Math.min(28, Math.max(1, Number(planDueDay) || 10)),
        graceDays: Math.max(0, Number(planGraceDays) || 5),
        prorationPolicy: planProration,
        overdueAccessPolicy: planAccessPolicy,
      });
      toast.success("Class fee plan saved as new version");
      setPlanOpen(false);
      await loadLedger();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save fee plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      const res = await generateClassInvoices(classId, selectedPeriod);
      setLedger(res);
      toast.success(
        `Generated ${res.createdCount ?? 0} invoice(s) for ${selectedPeriod} (${res.skippedExistingCount ?? 0} already existed)`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate monthly invoices");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadClassBillingCsv(classId, {
        period: selectedPeriod,
        status: statusFilter === "ALL" ? "" : statusFilter,
        search: searchQuery,
      });
      toast.success("Billing ledger CSV downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export billing CSV");
    } finally {
      setExporting(false);
    }
  };

  const handleApplyAdjustment = async () => {
    if (!adjustInvoice) return;
    if (adjustReason.trim().length < 3) {
      toast.error("Please provide an audit justification (minimum 3 characters)");
      return;
    }
    setSavingAdjustment(true);
    try {
      const amountMinor =
        adjustType === "VOID"
          ? undefined
          : adjustAmountLkr.trim()
            ? Math.round(Number(adjustAmountLkr) * 100)
            : adjustType === "WAIVER"
              ? adjustInvoice.balanceMinor
              : 0;

      await createInvoiceAdjustment(adjustInvoice.id, {
        type: adjustType,
        amountMinor,
        reason: adjustReason.trim(),
      });
      toast.success("Invoice adjustment applied");
      setAdjustInvoice(null);
      setAdjustAmountLkr("");
      setAdjustReason("");
      await loadLedger();
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply adjustment");
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payInvoice) return;
    const major = Number(payAmountLkr);
    if (Number.isNaN(major) || major <= 0) {
      toast.error("Enter a valid positive payment amount in LKR");
      return;
    }
    setSavingPayment(true);
    try {
      await recordInvoicePayment(payInvoice.id, {
        amountMinor: Math.round(major * 100),
        channel: payChannel,
        status: "SUCCEEDED",
        externalReference: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      toast.success("Verified payment recorded and allocated to invoice");
      setPayInvoice(null);
      setPayAmountLkr("");
      setPayReference("");
      setPayNotes("");
      await loadLedger();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleApproveSubmission = async (sub: TuitionManualSubmissionItem) => {
    setApprovingSubId(sub.id);
    try {
      const res = await approveManualSubmission(
        sub.id,
        `Approved ${sub.channel} reference ${sub.referenceNumber}`,
      );
      toast.success(
        `Approved manual payment & issued official receipt ${res.receiptNumber}`,
      );
      await loadLedger();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve manual payment");
    } finally {
      setApprovingSubId(null);
    }
  };

  const handleRejectSubmission = async () => {
    if (!rejectSub) return;
    if (rejectReason.trim().length < 3) {
      toast.error("Please enter a rejection reason (minimum 3 characters)");
      return;
    }
    setSavingReject(true);
    try {
      await rejectManualSubmission(rejectSub.id, rejectReason.trim());
      toast.success("Manual payment submission rejected");
      setRejectSub(null);
      setRejectReason("");
      await loadLedger();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject manual payment submission");
    } finally {
      setSavingReject(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!refundTarget) return;
    if (refundReason.trim().length < 3) {
      toast.error("Please provide a mandatory refund/chargeback reason");
      return;
    }
    const major = refundAmountLkr.trim() ? Number(refundAmountLkr) : undefined;
    if (major !== undefined && (Number.isNaN(major) || major <= 0)) {
      toast.error("Enter a valid positive refund amount in LKR");
      return;
    }
    setSavingRefund(true);
    try {
      await refundTuitionPayment(refundTarget.payment.paymentId, {
        amountMinor: major !== undefined ? Math.round(major * 100) : undefined,
        reason: refundReason.trim(),
        isChargeback: refundIsChargeback,
      });
      toast.success(
        refundIsChargeback
          ? "Chargeback recorded and invoice balance restored"
          : "Refund processed and invoice balance updated",
      );
      setRefundTarget(null);
      setRefundAmountLkr("");
      setRefundReason("");
      setRefundIsChargeback(false);
      await loadLedger();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process refund");
    } finally {
      setSavingRefund(false);
    }
  };

  const handlePrintReceipt = async (paymentId: string) => {
    try {
      await openPrintableReceipt(paymentId);
    } catch (err: any) {
      toast.error(err?.message || "Unable to open official receipt");
    }
  };

  const activePlan = ledger?.activeFeePlan ?? null;
  const currency = ledger?.currency || "LKR";

  return (
    <div className="space-y-6">
      {/* Header & Top Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("classes.billing.title")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("classes.billing.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPlanOpen(true)}
          >
            <Settings2 className="mr-1.5 h-4 w-4" />
            {t("classes.billing.configureFeePlan")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerateInvoices}
            disabled={generating || !activePlan}
          >
            {generating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            {t("classes.billing.generateInvoices")} ({selectedPeriod})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            {t("classes.billing.exportCsv")}
          </Button>
        </div>
      </div>

      {/* Separate Accounting & Active Fee Plan Banner */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
            {activePlan ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">
                    {t("classes.billing.activeFeePlan").replace(
                      "{version}",
                      String(activePlan.version),
                    )}
                  </Badge>
                  <span className="font-bold text-base">
                    {formatMoneyMinor(
                      activePlan.amountMinor,
                      activePlan.currency,
                    )}{" "}
                    / {activePlan.frequency}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Due Day: {activePlan.dueDay} (+{activePlan.graceDays}d grace)
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {activePlan.prorationPolicy === "PRORATE_BY_DAYS"
                      ? t("classes.billing.prorationDays")
                      : t("classes.billing.prorationFull")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("classes.billing.separateAccountingNote")}
                </p>
              </div>
            ) : (
              <div className="text-sm text-amber-700">
                {t("classes.billing.noFeePlan")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardContent className="flex items-center gap-2 p-4">
            <Input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-40"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as TuitionInvoiceStatus | "ALL")
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ISSUED">
                  {t("classes.billing.statusIssued")}
                </SelectItem>
                <SelectItem value="PARTIALLY_PAID">
                  {t("classes.billing.statusPartiallyPaid")}
                </SelectItem>
                <SelectItem value="PAID">
                  {t("classes.billing.statusPaid")}
                </SelectItem>
                <SelectItem value="OVERDUE">
                  {t("classes.billing.statusOverdue")}
                </SelectItem>
                <SelectItem value="WAIVED">
                  {t("classes.billing.statusWaived")}
                </SelectItem>
                <SelectItem value="VOIDED">
                  {t("classes.billing.statusVoided")}
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* KPI Totals */}
      {ledger ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("classes.billing.invoicedTotal")}</CardDescription>
              <CardTitle className="text-xl">
                {formatMoneyMinor(ledger.summary.invoicedTotalMinor, currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {ledger.summary.totalInvoices} invoice(s) •{" "}
              {t("classes.billing.discountsWaivers")}:{" "}
              {formatMoneyMinor(ledger.summary.discountTotalMinor, currency)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("classes.billing.confirmedPaid")}</CardDescription>
              <CardTitle className="text-xl text-emerald-600">
                {formatMoneyMinor(ledger.summary.paidTotalMinor, currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Paid: {ledger.summary.paidCount} • Partial:{" "}
              {ledger.summary.partiallyPaidCount}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {t("classes.billing.outstandingBalance")}
              </CardDescription>
              <CardTitle className="text-xl text-rose-600">
                {formatMoneyMinor(ledger.summary.outstandingTotalMinor, currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Unpaid: {ledger.summary.unpaidCount} • Overdue:{" "}
              {ledger.summary.overdueCount}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Waived / Voided</CardDescription>
              <CardTitle className="text-xl">
                {ledger.summary.waivedCount} / {ledger.summary.voidedCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Scholarships & voided entries
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Phase 6: Pending Manual Bank / Cash Verifications Queue */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                {t("classes.billing.pendingVerificationsTitle")}
                <Badge variant="secondary">{pendingSubmissions.length}</Badge>
              </CardTitle>
              <CardDescription>
                {t("classes.billing.pendingVerificationNote")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingSubmissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("classes.billing.noPendingVerifications")}
            </p>
          ) : (
            <div className="space-y-2.5">
              {pendingSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border bg-amber-50/40 p-3 dark:bg-amber-950/20 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{sub.studentName}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {sub.invoiceNumber} ({sub.periodYyyyMm})
                      </Badge>
                      <Badge className="bg-amber-600 text-white text-xs">
                        {sub.channel} •{" "}
                        {formatMoneyMinor(
                          sub.amountMinor,
                          sub.currency || currency,
                        )}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ref: <span className="font-mono font-medium text-foreground">{sub.referenceNumber}</span>{" "}
                      • Paid Date: {sub.paidDate || "—"}
                      {sub.proofOriginalName
                        ? ` • Proof: ${sub.proofOriginalName}`
                        : ""}
                      {sub.note ? ` • Note: "${sub.note}"` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700 text-white"
                      disabled={approvingSubId === sub.id}
                      onClick={() => handleApproveSubmission(sub)}
                    >
                      {approvingSubId === sub.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      {t("classes.billing.approvePayment")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => {
                        setRejectSub(sub);
                        setRejectReason("");
                      }}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      {t("classes.billing.rejectPayment")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Ledger Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Student Billing Ledger ({selectedPeriod})
            </CardTitle>
            <CardDescription>
              Price snapshots protect settled invoices when fee plan rates change.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or invoice #..."
              className="pl-8 h-9 text-sm"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !ledger || ledger.invoices.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("classes.billing.noInvoices")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Invoice / Student</th>
                    <th className="px-3 py-2.5 text-right">Subtotal</th>
                    <th className="px-3 py-2.5 text-right">Discount / Waiver</th>
                    <th className="px-3 py-2.5 text-right">Total Due</th>
                    <th className="px-3 py-2.5 text-right">Confirmed Paid</th>
                    <th className="px-3 py-2.5 text-right">Balance</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ledger.invoices.map((inv) => {
                    const confirmedPayment = inv.payments.find(
                      (p) =>
                        p.status === "SUCCEEDED" ||
                        p.status === "PARTIALLY_REFUNDED",
                    );
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30">
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs font-medium text-primary">
                            {inv.invoiceNumber}
                          </div>
                          <div className="font-medium">{inv.studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {inv.studentEmail} • Due {inv.dueAt.slice(0, 10)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {formatMoneyMinor(inv.subtotalMinor, inv.currency)}
                        </td>
                        <td className="px-3 py-3 text-right text-blue-600">
                          {inv.discountMinor > 0
                            ? `-${formatMoneyMinor(inv.discountMinor, inv.currency)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          {formatMoneyMinor(inv.totalMinor, inv.currency)}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-emerald-600">
                          <div>{formatMoneyMinor(inv.paidMinor, inv.currency)}</div>
                          {inv.pendingMinor > 0 ? (
                            <div className="text-[11px] text-amber-600">
                              Pending:{" "}
                              {formatMoneyMinor(inv.pendingMinor, inv.currency)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-rose-600">
                          {formatMoneyMinor(inv.balanceMinor, inv.currency)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {statusBadge(inv)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {inv.status !== "VOIDED" && inv.balanceMinor > 0 ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setAdjustInvoice(inv);
                                    setAdjustType("DISCOUNT");
                                    setAdjustAmountLkr("");
                                    setAdjustReason("");
                                  }}
                                >
                                  <Percent className="mr-1 h-3 w-3" />
                                  Adjust
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setPayInvoice(inv);
                                    setPayAmountLkr(
                                      String((inv.balanceMinor / 100).toFixed(2)),
                                    );
                                    setPayChannel("CASH");
                                    setPayReference("");
                                    setPayNotes("");
                                  }}
                                >
                                  <Banknote className="mr-1 h-3.5 w-3.5" />
                                  Record Paid
                                </Button>
                              </>
                            ) : null}
                            {confirmedPayment ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    handlePrintReceipt(
                                      confirmedPayment.paymentId,
                                    )
                                  }
                                >
                                  <Printer className="mr-1 h-3 w-3" />
                                  {t("classes.billing.printReceipt")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-rose-600"
                                  onClick={() => {
                                    setRefundTarget({
                                      invoice: inv,
                                      payment: confirmedPayment,
                                    });
                                    setRefundAmountLkr(
                                      String(
                                        (
                                          confirmedPayment.allocatedMinor / 100
                                        ).toFixed(2),
                                      ),
                                    );
                                    setRefundReason("");
                                    setRefundIsChargeback(false);
                                  }}
                                >
                                  <RotateCcw className="mr-1 h-3 w-3" />
                                  {t("classes.billing.refundPayment")}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configure Fee Plan Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.billing.configureFeePlan")}</DialogTitle>
            <DialogDescription>
              Creates a new fee plan version for upcoming invoice generations. Existing issued or paid invoices are never altered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("classes.billing.monthlyAmountLkr")}</Label>
              <Input
                type="number"
                min="0"
                step="50"
                value={planAmountLkr}
                onChange={(e) => setPlanAmountLkr(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("classes.billing.dueDay")}</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={planDueDay}
                  onChange={(e) => setPlanDueDay(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("classes.billing.graceDays")}</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={planGraceDays}
                  onChange={(e) => setPlanGraceDays(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("classes.billing.prorationPolicy")}</Label>
              <Select
                value={planProration}
                onValueChange={(v) => setPlanProration(v as ClassProrationPolicy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_MONTH">
                    {t("classes.billing.prorationFull")}
                  </SelectItem>
                  <SelectItem value="PRORATE_BY_DAYS">
                    {t("classes.billing.prorationDays")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("classes.billing.overdueAccessPolicy")}</Label>
              <Select
                value={planAccessPolicy}
                onValueChange={(v) =>
                  setPlanAccessPolicy(v as ClassOverdueAccessPolicy)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALLOW_WITH_WARNING">
                    {t("classes.billing.accessAllowWarning")}
                  </SelectItem>
                  <SelectItem value="BLOCK_AFTER_GRACE">
                    {t("classes.billing.accessBlockAfterGrace")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFeePlan} disabled={savingPlan}>
              {savingPlan && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save Fee Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Invoice Dialog (Discount / Waiver / Void) */}
      <Dialog
        open={Boolean(adjustInvoice)}
        onOpenChange={(open) => !open && setAdjustInvoice(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.billing.adjustInvoice")}</DialogTitle>
            <DialogDescription>
              {adjustInvoice?.invoiceNumber} • {adjustInvoice?.studentName} • Balance:{" "}
              {adjustInvoice
                ? formatMoneyMinor(
                    adjustInvoice.balanceMinor,
                    adjustInvoice.currency,
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("classes.billing.adjustmentType")}</Label>
              <Select
                value={adjustType}
                onValueChange={(v) => setAdjustType(v as TuitionAdjustmentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCOUNT">Concession / Discount</SelectItem>
                  <SelectItem value="WAIVER">
                    Scholarship / Full Waiver
                  </SelectItem>
                  <SelectItem value="SURCHARGE">Additional Fee / Surcharge</SelectItem>
                  <SelectItem value="VOID">Void Unpaid Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {adjustType !== "VOID" ? (
              <div className="space-y-1.5">
                <Label>
                  {t("classes.billing.adjustmentAmountLkr")}
                  {adjustType === "WAIVER"
                    ? " (leave blank to waive full remaining balance)"
                    : ""}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={adjustAmountLkr}
                  onChange={(e) => setAdjustAmountLkr(e.target.value)}
                  placeholder={
                    adjustInvoice
                      ? String((adjustInvoice.balanceMinor / 100).toFixed(2))
                      : "500.00"
                  }
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>{t("classes.billing.adjustmentReason")}</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. 50% sibling scholarship approved by teacher"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustInvoice(null)}>
              Cancel
            </Button>
            <Button onClick={handleApplyAdjustment} disabled={savingAdjustment}>
              {savingAdjustment && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Verified Payment Dialog */}
      <Dialog
        open={Boolean(payInvoice)}
        onOpenChange={(open) => !open && setPayInvoice(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.billing.recordVerifiedPayment")}</DialogTitle>
            <DialogDescription>
              {payInvoice?.invoiceNumber} • {payInvoice?.studentName} • Remaining Balance:{" "}
              {payInvoice
                ? formatMoneyMinor(payInvoice.balanceMinor, payInvoice.currency)
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("classes.billing.paymentAmountLkr")}</Label>
              <Input
                type="number"
                min="1"
                step="50"
                value={payAmountLkr}
                onChange={(e) => setPayAmountLkr(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("classes.billing.paymentChannel")}</Label>
              <Select
                value={payChannel}
                onValueChange={(v) => setPayChannel(v as TuitionPaymentChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash (In-Class)</SelectItem>
                  <SelectItem value="BANK_TRANSFER">
                    Verified Bank Deposit / Transfer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("classes.billing.paymentReference")}</Label>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. BOC-20261031-9912"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Paid in person before Saturday class"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayInvoice(null)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={savingPayment}>
              {savingPayment && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Confirm & Allocate Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 6: Reject Manual Submission Dialog */}
      <Dialog
        open={Boolean(rejectSub)}
        onOpenChange={(open) => !open && setRejectSub(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.billing.rejectPayment")}</DialogTitle>
            <DialogDescription>
              {rejectSub?.studentName} • Ref: {rejectSub?.referenceNumber} •{" "}
              {rejectSub
                ? formatMoneyMinor(
                    rejectSub.amountMinor,
                    rejectSub.currency || currency,
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t("classes.billing.adjustmentReason")}</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Reference number not found on bank statement"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectSub(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmission}
              disabled={savingReject}
            >
              {savingReject && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Reject Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 6: Refund / Chargeback Dialog */}
      <Dialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => !open && setRefundTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.billing.refundPayment")}</DialogTitle>
            <DialogDescription>
              {refundTarget?.invoice.invoiceNumber} •{" "}
              {refundTarget?.invoice.studentName} • Active Allocation:{" "}
              {refundTarget
                ? formatMoneyMinor(
                    refundTarget.payment.allocatedMinor,
                    refundTarget.invoice.currency,
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Refund Amount (LKR)</Label>
              <Input
                type="number"
                min="1"
                step="50"
                value={refundAmountLkr}
                onChange={(e) => setRefundAmountLkr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reversal Type</Label>
              <Select
                value={refundIsChargeback ? "CHARGEBACK" : "REFUND"}
                onValueChange={(v) =>
                  setRefundIsChargeback(v === "CHARGEBACK")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REFUND">
                    Voluntary Refund (Partial or Full)
                  </SelectItem>
                  <SelectItem value="CHARGEBACK">
                    Gateway Chargeback Reversal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("classes.billing.adjustmentReason")}</Label>
              <Input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Student withdrew before month start"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefundPayment}
              disabled={savingRefund}
            >
              {savingRefund && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

