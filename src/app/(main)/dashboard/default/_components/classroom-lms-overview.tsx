"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import {
  AlertTriangle,
  Banknote,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/hooks/use-i18n";
import {
  approveManualSubmission,
  fetchClassroomDashboardSummary,
  formatMoneyMinor,
} from "@/lib/classes-api";
import type { ClassroomDashboardSummaryResponse } from "@/types/classes";
import { localize } from "@/types/quiz";

const ALL_TEACHERS = "__ALL__";

export function ClassroomLmsOverviewPanel() {
  const { locale, t } = useI18n();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(ALL_TEACHERS);
  const [summary, setSummary] = useState<ClassroomDashboardSummaryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClassroomDashboardSummary({
        period,
        teacherUserId:
          selectedTeacherId !== ALL_TEACHERS ? selectedTeacherId : undefined,
      });
      setSummary(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Classroom LMS overview",
      );
    } finally {
      setLoading(false);
    }
  }, [period, selectedTeacherId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleQuickApprove = async (submissionId: string) => {
    setApprovingId(submissionId);
    try {
      const res = await approveManualSubmission(
        submissionId,
        "Verified from Classroom Dashboard",
      );
      toast.success(`Payment verified — Receipt ${res.receiptNumber} issued`);
      await loadSummary();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not approve payment",
      );
    } finally {
      setApprovingId(null);
    }
  };

  if (loading && !summary) {
    return (
      <Card>
        <CardContent className="flex h-44 items-center justify-center gap-2">
          <Spinner className="size-5" />
          <span className="text-muted-foreground text-sm">
            Loading Classroom LMS summary…
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error && !summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <AlertTriangle className="size-6 text-amber-600" />
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadSummary()}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const { kpis, todaysSessions, pendingManualVerifications, classesOverview, adminGovernance } =
    summary;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="size-5 text-primary" />
                  {t("classes.dashboard.classroomTitle")}
                </CardTitle>
                <Badge variant="outline" className="gap-1 text-xs">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  {summary.isSuperAdmin ? "Admin Multi-Teacher Scope" : "Teacher Scope"}
                </Badge>
              </div>
              <CardDescription>
                {t("classes.dashboard.classroomSubtitle")}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {summary.isSuperAdmin && adminGovernance ? (
                <Select
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                >
                  <SelectTrigger className="h-9 w-[220px] text-xs">
                    <SelectValue placeholder={t("classes.dashboard.filterByTeacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TEACHERS}>
                      {t("classes.dashboard.allTeachers")}
                    </SelectItem>
                    {adminGovernance.teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.activeClassesCount} classes)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-9 w-[155px] text-xs"
                aria-label="Billing and attendance month"
              />

              <Button asChild variant="outline" size="sm">
                <Link href="/admin/classes">
                  <BookOpen className="mr-1.5 size-3.5" />
                  {t("classes.title")}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/classes/new">
                  <Plus className="mr-1.5 size-3.5" />
                  {t("classes.createClass")}
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 6 Summary KPI Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{t("classes.dashboard.activeClasses")}</span>
                <GraduationCap className="size-4 text-primary" />
              </div>
              <div className="mt-1.5 font-bold text-2xl tabular-nums">
                {kpis.activeClassesCount}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {kpis.totalClassesCount} total batch(es)
              </p>
            </div>

            <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{t("classes.dashboard.enrolledStudents")}</span>
                <Users className="size-4 text-primary" />
              </div>
              <div className="mt-1.5 font-bold text-2xl tabular-nums">
                {kpis.enrolledStudentsCount}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {kpis.pendingEnrollmentRequestsCount > 0 ? (
                  <span className="font-medium text-amber-600">
                    {kpis.pendingEnrollmentRequestsCount} pending approval
                  </span>
                ) : (
                  "All roster requests reviewed"
                )}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{t("classes.dashboard.todaysSessions")}</span>
                <CalendarClock className="size-4 text-primary" />
              </div>
              <div className="mt-1.5 font-bold text-2xl tabular-nums">
                {kpis.todaysSessionsCount}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {summary.todayLocalDate} (Asia/Colombo)
              </p>
            </div>

            <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{t("classes.dashboard.attendancePending")}</span>
                <ClipboardCheck className="size-4 text-amber-600" />
              </div>
              <div className="mt-1.5 font-bold text-2xl tabular-nums">
                {kpis.attendancePendingCount}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {kpis.attendancePendingCount > 0
                  ? "Sessions with unmarked students"
                  : "All held sessions marked"}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{t("classes.dashboard.tuitionReceivedMonth")}</span>
                <Banknote className="size-4 text-emerald-600" />
              </div>
              <div className="mt-1.5 font-bold text-xl text-emerald-700 tabular-nums dark:text-emerald-400">
                {formatMoneyMinor(kpis.paymentsReceivedThisMonthMinor, kpis.currency)}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Billed {formatMoneyMinor(kpis.totalBilledThisMonthMinor, kpis.currency)} ({period})
              </p>
            </div>

            <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{t("classes.dashboard.outstandingInvoices")}</span>
                <CreditCard className="size-4 text-rose-600" />
              </div>
              <div className="mt-1.5 font-bold text-xl text-rose-600 tabular-nums dark:text-rose-400">
                {formatMoneyMinor(kpis.outstandingBalanceMinor, kpis.currency)}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {kpis.outstandingInvoicesCount} open · {kpis.overdueInvoicesCount} overdue
              </p>
            </div>
          </div>

          {/* Today's Sessions + Pending Manual Verifications */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Today's Sessions Quick Attendance */}
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <CalendarClock className="size-4 text-primary" />
                  {t("classes.dashboard.todaysScheduleTitle")} ({summary.todayLocalDate})
                </h3>
                <Badge variant="outline">{todaysSessions.length}</Badge>
              </div>

              {todaysSessions.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground text-xs">
                  {t("classes.dashboard.noSessionsToday")}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {todaysSessions.map((sess, idx) => {
                    const clsTitle = localize(sess.classTitle, locale) || "Class";
                    return (
                      <div
                        key={sess.sessionId ?? `${sess.classId}-${idx}`}
                        className="flex flex-col justify-between gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs">{clsTitle}</span>
                            {sess.attendancePending ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-300 bg-amber-50 text-amber-800 text-[10px]"
                              >
                                <Clock className="size-2.5" />
                                {sess.unmarkedCount} Unmarked
                              </Badge>
                            ) : (
                              <Badge className="gap-1 bg-emerald-600 text-white text-[10px]">
                                <CheckCircle2 className="size-2.5" />
                                Marked ({sess.markedCount}/{sess.rosterCount})
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(sess.startsAtUtc).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {new Date(sess.endsAtUtc).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {sess.rosterCount} student(s)
                          </p>
                        </div>

                        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                          <Link href={`/admin/classes/${sess.classId}?tab=attendance`}>
                            <ClipboardCheck className="mr-1.5 size-3.5" />
                            {t("classes.dashboard.markAttendanceBtn")}
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Manual Payment Verifications */}
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <Banknote className="size-4 text-amber-600" />
                  {t("classes.dashboard.pendingManualVerifications")}
                </h3>
                <Badge
                  variant={
                    kpis.pendingManualVerificationsCount > 0 ? "default" : "outline"
                  }
                >
                  {kpis.pendingManualVerificationsCount}
                </Badge>
              </div>

              {pendingManualVerifications.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground text-xs">
                  {t("classes.billing.noPendingVerifications")}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {pendingManualVerifications.map((sub) => {
                    const clsTitle = localize(sub.classTitle, locale) || "Class";
                    return (
                      <div
                        key={sub.id}
                        className="flex flex-col justify-between gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs">
                              {sub.student?.name || "Student"}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {sub.channel}
                            </Badge>
                            <span className="font-bold text-emerald-700 text-xs">
                              {formatMoneyMinor(sub.amountMinor, sub.currency)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {clsTitle} · {sub.invoiceNumber} ({sub.periodYyyyMm}) · Ref:{" "}
                            <span className="font-mono">{sub.referenceNumber}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 bg-emerald-600 px-2.5 text-white text-xs hover:bg-emerald-700"
                            disabled={approvingId === sub.id}
                            onClick={() => void handleQuickApprove(sub.id)}
                          >
                            <CheckCircle2 className="mr-1 size-3" />
                            Approve
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                            <Link href={`/admin/classes/${sub.classId}?tab=payments`}>
                              {t("classes.dashboard.reviewPaymentBtn")}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Classes Quick-Jump Table / Mobile Cards */}
          {classesOverview.length > 0 ? (
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                  {t("classes.title")} — Quick Actions
                </h3>
                <Link
                  href="/admin/classes"
                  className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                >
                  View all ({kpis.totalClassesCount})
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Class Batch</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Students</th>
                      <th className="px-2 py-2 font-medium">Next Session</th>
                      <th className="px-2 py-2 text-right font-medium">Direct Workspace Tabs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classesOverview.slice(0, 6).map((cls) => {
                      const cTitle = localize(cls.title, locale) || "Untitled Class";
                      return (
                        <tr key={cls.id} className="border-b border-border/60">
                          <td className="px-2 py-2.5">
                            <Link
                              href={`/admin/classes/${cls.id}`}
                              className="font-semibold text-foreground hover:text-primary hover:underline"
                            >
                              {cTitle}
                            </Link>
                            <div className="text-[11px] text-muted-foreground">
                              {cls.grade ? `${cls.grade} · ` : ""}
                              {cls.subject ? `${cls.subject} · ` : ""}
                              {cls.primaryTeacher.name}
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <Badge
                              variant={
                                cls.status === "Published"
                                  ? "default"
                                  : cls.status === "Archived"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-[10px]"
                            >
                              {cls.status === "Published"
                                ? t("classes.statusPublished")
                                : cls.status === "Archived"
                                  ? t("classes.statusArchived")
                                  : t("classes.statusDraft")}
                            </Badge>
                          </td>
                          <td className="px-2 py-2.5 tabular-nums">
                            {cls.activeEnrollmentCount}
                            {cls.capacity ? ` / ${cls.capacity}` : ""}
                          </td>
                          <td className="px-2 py-2.5 text-muted-foreground">
                            {cls.nextSession
                              ? `${cls.nextSession.localDate} (${cls.nextSession.localStartTime})`
                              : "—"}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                                <Link href={`/admin/classes/${cls.id}?tab=students`}>
                                  {t("classes.tabs.students")}
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                                <Link href={`/admin/classes/${cls.id}?tab=lessons`}>
                                  {t("classes.tabs.lessons")}
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                                <Link href={`/admin/classes/${cls.id}?tab=attendance`}>
                                  {t("classes.tabs.attendance")}
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                                <Link href={`/admin/classes/${cls.id}?tab=payments`}>
                                  {t("classes.tabs.payments")}
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Admin Multi-Tenant Governance, Billing Reconciliation & Gateway Queue */}
          {summary.isSuperAdmin && adminGovernance ? (
            <div className="space-y-4 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <ShieldCheck className="size-4 text-primary" />
                  {t("classes.dashboard.adminGovernanceTitle")} ({period})
                </h3>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href="/admin/roles">Permissions & Roles</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href="/admin/logs">Audit Logs</Link>
                  </Button>
                </div>
              </div>

              {/* Billing Reconciliation Table */}
              <div className="rounded-xl border p-3.5">
                <h4 className="mb-2 font-medium text-xs">
                  {t("classes.dashboard.billingReconciliationTitle")}
                </h4>
                {adminGovernance.billingReconciliation.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-xs">
                    No class batches found for reconciliation.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="border-b text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">Class</th>
                          <th className="px-2 py-1.5 font-medium">Teacher</th>
                          <th className="px-2 py-1.5 font-medium">Invoices</th>
                          <th className="px-2 py-1.5 font-medium">Billed</th>
                          <th className="px-2 py-1.5 font-medium">Confirmed Paid</th>
                          <th className="px-2 py-1.5 font-medium">Balance Due</th>
                          <th className="px-2 py-1.5 text-right font-medium">Ledger</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminGovernance.billingReconciliation.slice(0, 8).map((row) => (
                          <tr key={row.classId} className="border-b border-border/50">
                            <td className="px-2 py-2 font-medium">
                              {localize(row.classTitle, locale) || "Class"}
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">
                              {row.teacherName}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {row.invoiceCount} ({row.paidCount} paid
                              {row.overdueCount > 0 ? `, ${row.overdueCount} overdue` : ""})
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {formatMoneyMinor(row.totalBilledMinor, "LKR")}
                            </td>
                            <td className="px-2 py-2 font-medium text-emerald-700 tabular-nums">
                              {formatMoneyMinor(row.totalPaidMinor, "LKR")}
                            </td>
                            <td className="px-2 py-2 font-medium text-rose-600 tabular-nums">
                              {formatMoneyMinor(row.totalBalanceMinor, "LKR")}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                <Link href={`/admin/classes/${row.classId}?tab=payments`}>
                                  {t("classes.dashboard.openLedgerBtn")}
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Gateway Event Failure Queue */}
                <div className="rounded-xl border p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 font-medium text-xs">
                      <ShieldAlert className="size-3.5 text-amber-600" />
                      {t("classes.dashboard.failedGatewayEventsTitle")}
                    </h4>
                    <Badge
                      variant={
                        adminGovernance.failedGatewayEventsCount > 0
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {adminGovernance.failedGatewayEventsCount}
                    </Badge>
                  </div>
                  {adminGovernance.failedGatewayEvents.length === 0 ? (
                    <p className="flex items-center gap-1.5 py-3 text-emerald-700 text-xs">
                      <CheckCircle2 className="size-3.5" />
                      {t("classes.dashboard.noFailedGatewayEvents")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {adminGovernance.failedGatewayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded-lg border border-rose-200 bg-rose-50/40 p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold">
                              {ev.provider} · {ev.externalEventId}
                            </span>
                            <Badge variant="destructive" className="text-[10px]">
                              {ev.status}
                            </Badge>
                          </div>
                          {ev.errorMessage ? (
                            <p className="mt-1 text-rose-700 text-[11px]">
                              {ev.errorMessage}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Classroom Audit Trail */}
                <div className="rounded-xl border p-3.5">
                  <h4 className="mb-2 font-medium text-xs">
                    {t("classes.dashboard.recentAuditEventsTitle")}
                  </h4>
                  {adminGovernance.recentAuditEvents.length === 0 ? (
                    <p className="py-3 text-muted-foreground text-xs">
                      No classroom audit events recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {adminGovernance.recentAuditEvents.slice(0, 5).map((aud) => (
                        <div
                          key={aud.id}
                          className="flex items-start justify-between gap-2 border-b border-border/50 pb-1.5 text-xs last:border-0"
                        >
                          <div>
                            <Badge variant="outline" className="mr-1.5 text-[10px]">
                              {aud.action}
                            </Badge>
                            <span>{aud.description || aud.subject}</span>
                            <div className="text-[10px] text-muted-foreground">
                              by {aud.actorName} ({aud.actorEmail})
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(aud.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

