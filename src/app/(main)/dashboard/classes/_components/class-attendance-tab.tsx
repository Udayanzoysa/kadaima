"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Save,
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
import { useI18n } from "@/hooks/use-i18n";
import {
  createManualClassSession,
  downloadClassAttendanceCsv,
  fetchClassAttendanceSummary,
  fetchClassSessions,
  fetchSessionAttendance,
  generateClassSessionsFromSchedule,
  saveSessionAttendance,
  updateClassSession,
} from "@/lib/classes-api";
import type {
  AttendanceStatus,
  ClassAttendanceSummaryResponse,
  ClassSessionItem,
  SessionAttendanceDetailResponse,
} from "@/types/classes";
import { localize, type SupportedLocale } from "@/types/quiz";

interface ClassAttendanceTabProps {
  classId: string;
}

const ATTENDANCE_STATUS_OPTIONS: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
  "UNMARKED",
];

function getMonthBounds(yyyyMm: string): { from: string; to: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    return getMonthBounds(ym);
  }
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${dd}`,
  };
}

function formatTimeRange(startsAtUtc: string, endsAtUtc: string, tz = "Asia/Colombo") {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${fmt.format(new Date(startsAtUtc))} – ${fmt.format(new Date(endsAtUtc))}`;
  } catch {
    return `${startsAtUtc.slice(11, 16)} – ${endsAtUtc.slice(11, 16)}`;
  }
}

export function ClassAttendanceTab({ classId }: ClassAttendanceTabProps) {
  const { t, locale } = useI18n();
  const activeLocale = (locale as SupportedLocale) || "en";

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [viewMode, setViewMode] = useState<"rollcall" | "summary">("rollcall");

  const [sessions, setSessions] = useState<ClassSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [syncingSchedule, setSyncingSchedule] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] =
    useState<SessionAttendanceDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Editable draft state for selected session
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [correctionReason, setCorrectionReason] = useState("");
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Monthly summary state
  const [summaryData, setSummaryData] =
    useState<ClassAttendanceSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Manual session modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualStartTime, setManualStartTime] = useState("09:00");
  const [manualEndTime, setManualEndTime] = useState("11:00");
  const [manualTitleEn, setManualTitleEn] = useState("");
  const [creatingManual, setCreatingManual] = useState(false);

  // Cancel session modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingSession, setCancellingSession] = useState(false);

  const statusLabel = useCallback(
    (st: AttendanceStatus | null | undefined) => {
      switch (st) {
        case "PRESENT":
          return t("classes.attendance.statusPresent");
        case "ABSENT":
          return t("classes.attendance.statusAbsent");
        case "LATE":
          return t("classes.attendance.statusLate");
        case "EXCUSED":
          return t("classes.attendance.statusExcused");
        default:
          return t("classes.attendance.statusUnmarked");
      }
    },
    [t],
  );

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const { from, to } = getMonthBounds(selectedMonth);
      const res = await fetchClassSessions(classId, {
        from,
        to,
        autoGenerate: true,
      });
      setSessions(res.sessions);
      if (res.sessions.length > 0) {
        setSelectedSessionId((prev) =>
          prev && res.sessions.some((s) => s.id === prev)
            ? prev
            : res.sessions[0].id,
        );
      } else {
        setSelectedSessionId(null);
        setSessionDetail(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load class sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, [classId, selectedMonth]);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchSessionAttendance(sessionId);
      setSessionDetail(detail);
      const nextStatuses: Record<string, AttendanceStatus> = {};
      const nextNotes: Record<string, string> = {};
      for (const r of detail.roster) {
        nextStatuses[r.studentId] = r.status;
        nextNotes[r.studentId] = r.note || "";
      }
      setDraftStatuses(nextStatuses);
      setDraftNotes(nextNotes);
      setCorrectionReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to load session attendance");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await fetchClassAttendanceSummary(classId, selectedMonth);
      setSummaryData(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load attendance summary");
    } finally {
      setLoadingSummary(false);
    }
  }, [classId, selectedMonth]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (selectedSessionId && viewMode === "rollcall") {
      void loadSessionDetail(selectedSessionId);
    }
  }, [selectedSessionId, viewMode, loadSessionDetail]);

  useEffect(() => {
    if (viewMode === "summary") {
      void loadSummary();
    }
  }, [viewMode, loadSummary]);

  const handleSyncFromSchedule = async () => {
    setSyncingSchedule(true);
    try {
      const { from, to } = getMonthBounds(selectedMonth);
      const res = await generateClassSessionsFromSchedule(classId, from, to);
      setSessions(res.sessions);
      if (res.sessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(res.sessions[0].id);
      }
      toast.success(
        `Synced ${res.generatedCount ?? res.sessions.length} session(s) from recurring schedule`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync sessions from schedule");
    } finally {
      setSyncingSchedule(false);
    }
  };

  const handleCreateManualSession = async () => {
    if (!manualDate || !manualStartTime || !manualEndTime) return;
    setCreatingManual(true);
    try {
      // Asia/Colombo is UTC+05:30
      const startsAtUtc = new Date(`${manualDate}T${manualStartTime}:00+05:30`).toISOString();
      const endsAtUtc = new Date(`${manualDate}T${manualEndTime}:00+05:30`).toISOString();

      const created = await createManualClassSession(classId, {
        startsAtUtc,
        endsAtUtc,
        localDate: manualDate,
        timezone: "Asia/Colombo",
        title: manualTitleEn.trim()
          ? { en: manualTitleEn.trim(), si: "", ta: "" }
          : null,
      });
      toast.success("Manual class session created");
      setManualOpen(false);
      setManualTitleEn("");
      await loadSessions();
      setSelectedSessionId(created.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create manual session");
    } finally {
      setCreatingManual(false);
    }
  };

  const handleBulkMarkAllPresent = () => {
    if (!sessionDetail) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const r of sessionDetail.roster) {
      next[r.studentId] = "PRESENT";
    }
    setDraftStatuses(next);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId || !sessionDetail) return;
    setSavingAttendance(true);
    try {
      const records = sessionDetail.roster.map((r) => ({
        studentId: r.studentId,
        status: draftStatuses[r.studentId] ?? r.status ?? "UNMARKED",
        note: draftNotes[r.studentId]?.trim() || null,
      }));
      const updated = await saveSessionAttendance(selectedSessionId, {
        records,
        reason: correctionReason.trim() || null,
        markSessionCompleted: true,
      });
      setSessionDetail(updated);
      setCorrectionReason("");
      await loadSessions();
      toast.success("Session attendance saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleCancelSession = async () => {
    if (!selectedSessionId || !cancelReason.trim()) {
      toast.error(t("classes.attendance.cancellationReasonPrompt"));
      return;
    }
    setCancellingSession(true);
    try {
      await updateClassSession(classId, selectedSessionId, {
        status: "CANCELLED",
        cancellationReason: cancelReason.trim(),
      });
      toast.success("Session cancelled");
      setCancelOpen(false);
      setCancelReason("");
      await loadSessions();
      await loadSessionDetail(selectedSessionId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel session");
    } finally {
      setCancellingSession(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await downloadClassAttendanceCsv(classId, selectedMonth);
      toast.success("Attendance CSV downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("classes.attendance.title")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("classes.attendance.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-44"
          />

          <div className="inline-flex rounded-lg border p-1">
            <Button
              type="button"
              variant={viewMode === "rollcall" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("rollcall")}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {t("classes.attendance.tabSessions")}
            </Button>
            <Button
              type="button"
              variant={viewMode === "summary" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("summary")}
            >
              <Users className="mr-1.5 h-4 w-4" />
              {t("classes.attendance.tabSummary")}
            </Button>
          </div>

          {viewMode === "rollcall" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncFromSchedule}
                disabled={syncingSchedule}
              >
                {syncingSchedule ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                {t("classes.attendance.generateFromSchedule")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setManualOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t("classes.attendance.newManualSession")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exportingCsv}
            >
              {exportingCsv ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              {t("classes.attendance.exportCsv")}
            </Button>
          )}
        </div>
      </div>

      {/* Consistent Formula Explanation Note */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <span>{t("classes.attendance.formulaHint")}</span>
      </div>

      {viewMode === "rollcall" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left column: Session List */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedMonth} ({sessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("classes.attendance.noSessions")}
                </p>
              ) : (
                sessions.map((sess) => {
                  const isSelected = sess.id === selectedSessionId;
                  const titleText = sess.title
                    ? localize(sess.title, activeLocale)
                    : null;
                  return (
                    <button
                      key={sess.id}
                      type="button"
                      onClick={() => setSelectedSessionId(sess.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {sess.localDate}
                        </span>
                        <Badge
                          variant={
                            sess.status === "COMPLETED"
                              ? "default"
                              : sess.status === "CANCELLED"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[11px]"
                        >
                          {sess.status === "COMPLETED"
                            ? t("classes.attendance.sessionCompleted")
                            : sess.status === "CANCELLED"
                              ? t("classes.attendance.sessionCancelled")
                              : t("classes.attendance.sessionScheduled")}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimeRange(
                          sess.startsAtUtc,
                          sess.endsAtUtc,
                          sess.timezone,
                        )}
                      </div>
                      {titleText && (
                        <p className="mt-1 truncate text-xs font-medium">
                          {titleText}
                        </p>
                      )}
                      {sess.status !== "CANCELLED" && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="text-emerald-600 font-medium">
                            P: {sess.counts.present}
                          </span>
                          <span className="text-amber-600 font-medium">
                            L: {sess.counts.late}
                          </span>
                          <span className="text-rose-600 font-medium">
                            A: {sess.counts.absent}
                          </span>
                          <span>E: {sess.counts.excused}</span>
                          <span>U: {sess.counts.unmarked}</span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Right column: Selected Session Roll Call & Audit Trail */}
          <div className="space-y-6 lg:col-span-8">
            {!selectedSessionId ? (
              <Card>
                <CardContent className="py-14 text-center text-sm text-muted-foreground">
                  {t("classes.attendance.selectSessionPrompt")}
                </CardContent>
              </Card>
            ) : loadingDetail || !sessionDetail ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {sessionDetail.session.localDate} •{" "}
                          {formatTimeRange(
                            sessionDetail.session.startsAtUtc,
                            sessionDetail.session.endsAtUtc,
                            sessionDetail.session.timezone,
                          )}
                        </CardTitle>
                        <Badge
                          variant={
                            sessionDetail.session.status === "COMPLETED"
                              ? "default"
                              : sessionDetail.session.status === "CANCELLED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {sessionDetail.session.status}
                        </Badge>
                      </div>
                      {sessionDetail.session.cancellationReason && (
                        <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {sessionDetail.session.cancellationReason}
                        </p>
                      )}
                    </div>

                    {sessionDetail.session.status !== "CANCELLED" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleBulkMarkAllPresent}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                          {t("classes.attendance.markAllPresent")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelOpen(true)}
                        >
                          <Ban className="mr-1.5 h-4 w-4 text-destructive" />
                          {t("classes.attendance.cancelSession")}
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    {sessionDetail.roster.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No active students enrolled in this class batch yet.
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {sessionDetail.roster.map((student) => {
                          const currentStatus =
                            draftStatuses[student.studentId] ??
                            student.status ??
                            "UNMARKED";
                          const disabled =
                            sessionDetail.session.status === "CANCELLED";

                          return (
                            <div
                              key={student.studentId}
                              className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">
                                    {student.name}
                                  </span>
                                  {student.studentCode && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {student.studentCode}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {student.email}
                                </p>
                                <Input
                                  value={draftNotes[student.studentId] ?? ""}
                                  onChange={(e) =>
                                    setDraftNotes((prev) => ({
                                      ...prev,
                                      [student.studentId]: e.target.value,
                                    }))
                                  }
                                  disabled={disabled}
                                  placeholder={t("classes.attendance.notePlaceholder")}
                                  className="mt-2 h-8 text-xs max-w-sm"
                                />
                              </div>

                              <div className="flex flex-wrap items-center gap-1">
                                {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
                                  const active = currentStatus === opt;
                                  let activeClass = "";
                                  if (active) {
                                    if (opt === "PRESENT")
                                      activeClass =
                                        "bg-emerald-600 text-white hover:bg-emerald-700";
                                    else if (opt === "LATE")
                                      activeClass =
                                        "bg-amber-600 text-white hover:bg-amber-700";
                                    else if (opt === "ABSENT")
                                      activeClass =
                                        "bg-rose-600 text-white hover:bg-rose-700";
                                    else if (opt === "EXCUSED")
                                      activeClass =
                                        "bg-blue-600 text-white hover:bg-blue-700";
                                    else
                                      activeClass =
                                        "bg-slate-700 text-white hover:bg-slate-800";
                                  }
                                  return (
                                    <Button
                                      key={opt}
                                      type="button"
                                      size="sm"
                                      variant={active ? "default" : "outline"}
                                      disabled={disabled}
                                      className={`h-8 px-2.5 text-xs ${activeClass}`}
                                      onClick={() =>
                                        setDraftStatuses((prev) => ({
                                          ...prev,
                                          [student.studentId]: opt,
                                        }))
                                      }
                                    >
                                      {statusLabel(opt)}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {sessionDetail.session.status !== "CANCELLED" &&
                      sessionDetail.roster.length > 0 && (
                        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3.5 sm:flex-row sm:items-end sm:justify-between">
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-xs">
                              {t("classes.attendance.correctionReason")}
                            </Label>
                            <Input
                              value={correctionReason}
                              onChange={(e) => setCorrectionReason(e.target.value)}
                              placeholder={t(
                                "classes.attendance.correctionReasonPlaceholder",
                              )}
                              className="h-9 text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleSaveAttendance}
                            disabled={savingAttendance}
                          >
                            {savingAttendance ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-1.5 h-4 w-4" />
                            )}
                            {savingAttendance
                              ? t("classes.attendance.saving")
                              : t("classes.attendance.saveAttendance")}
                          </Button>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* Correction Audit Trail */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      {t("classes.attendance.auditTrailTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sessionDetail.auditLog.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("classes.attendance.noAuditEntries")}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sessionDetail.auditLog.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex flex-col justify-between gap-1 rounded-md border p-2.5 text-xs sm:flex-row sm:items-center"
                          >
                            <div>
                              <span className="font-medium">
                                {entry.studentName}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                ({statusLabel(entry.previousStatus)} →{" "}
                                <strong className="text-foreground">
                                  {statusLabel(entry.newStatus)}
                                </strong>
                                )
                              </span>
                              {entry.reason && (
                                <p className="mt-0.5 text-muted-foreground italic">
                                  “{entry.reason}”
                                </p>
                              )}
                            </div>
                            <div className="text-right text-[11px] text-muted-foreground">
                              <div>{entry.actor?.name || "Teacher"}</div>
                              <div>
                                {new Date(entry.changedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Monthly Summary & Export View */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("classes.attendance.tabSummary")} ({selectedMonth})
            </CardTitle>
            <CardDescription>{t("classes.attendance.formulaHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingSummary || !summaryData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      Active Sessions
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {summaryData.totals.activeSessions}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      Completed
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {summaryData.totals.completedSessions}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      Students
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {summaryData.totals.studentCount}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      {t("classes.attendance.attendanceRate")}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-primary">
                      {summaryData.totals.averageAttendancePercentage !== null
                        ? `${summaryData.totals.averageAttendancePercentage}%`
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Student</th>
                        <th className="px-3 py-2.5 text-center">
                          {t("classes.attendance.statusPresent")}
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          {t("classes.attendance.statusLate")}
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          {t("classes.attendance.statusAbsent")}
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          {t("classes.attendance.statusExcused")}
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          {t("classes.attendance.statusUnmarked")}
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          Attended / Eligible
                        </th>
                        <th className="px-3 py-2.5 text-right">
                          {t("classes.attendance.attendanceRate")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summaryData.students.map((st) => (
                        <tr key={st.studentId} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5">
                            <div className="font-medium">{st.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {st.email}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium text-emerald-600">
                            {st.present}
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium text-amber-600">
                            {st.late}
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium text-rose-600">
                            {st.absent}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {st.excused}
                          </td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground">
                            {st.unmarked}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs">
                            {st.attended} / {st.eligible}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Badge
                              variant={
                                st.attendancePercentage === null
                                  ? "secondary"
                                  : st.attendancePercentage >= 75
                                    ? "default"
                                    : "destructive"
                              }
                            >
                              {st.attendancePercentage !== null
                                ? `${st.attendancePercentage}%`
                                : "N/A"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Session Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.attendance.newManualSession")}</DialogTitle>
            <DialogDescription>
              Create an extra or makeup class session in Asia/Colombo time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Date (YYYY-MM-DD)</Label>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Time (HH:mm)</Label>
                <Input
                  type="time"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Time (HH:mm)</Label>
                <Input
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Session Topic / Title (optional)</Label>
              <Input
                value={manualTitleEn}
                onChange={(e) => setManualTitleEn(e.target.value)}
                placeholder="e.g. Revision Paper Discussion"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateManualSession} disabled={creatingManual}>
              {creatingManual && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Session Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.attendance.cancelSession")}</DialogTitle>
            <DialogDescription>
              Cancelled sessions are excluded from student attendance percentage denominators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t("classes.attendance.cancellationReasonPrompt")}</Label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Public holiday — Poya Day"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSession}
              disabled={cancellingSession || !cancelReason.trim()}
            >
              {cancellingSession && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {t("classes.attendance.cancelSession")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
