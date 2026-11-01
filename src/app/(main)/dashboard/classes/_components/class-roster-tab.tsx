"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Ban,
  Check,
  Copy,
  KeyRound,
  Link2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/hooks/use-i18n";
import {
  addStudentToClass,
  createClassInvitation,
  fetchClassEnrollments,
  fetchClassInvitations,
  revokeClassInvitation,
  updateClassEnrollment,
} from "@/lib/classes-api";
import type {
  ClassEnrollmentRecord,
  ClassEnrollmentStatus,
  ClassInvitation,
  PaginatedClassEnrollments,
} from "@/types/classes";

interface ClassRosterTabProps {
  classId: string;
  isArchived: boolean;
  onRosterMutated?: () => void;
}

export function ClassRosterTab({ classId, isArchived, onRosterMutated }: ClassRosterTabProps) {
  const { t } = useI18n();

  // Roster state
  const [rosterData, setRosterData] = useState<PaginatedClassEnrollments | null>(null);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClassEnrollmentStatus | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyEnrollmentId, setBusyEnrollmentId] = useState<string | null>(null);

  // Add student state
  const [studentEmail, setStudentEmail] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [initialStatus, setInitialStatus] = useState<"ACTIVE" | "INVITED">("ACTIVE");
  const [note, setNote] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  // Invitations state
  const [invitations, setInvitations] = useState<ClassInvitation[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invLabel, setInvLabel] = useState("");
  const [invRequiresApproval, setInvRequiresApproval] = useState(true);
  const [invExpiresHours, setInvExpiresHours] = useState("168");
  const [invMaxUses, setInvMaxUses] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<ClassInvitation | null>(null);

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const res = await fetchClassEnrollments(classId, {
        status: statusFilter === "ALL" ? "" : statusFilter,
        search: appliedSearch,
        page,
        pageSize: 20,
      });
      setRosterData(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load student roster");
    } finally {
      setRosterLoading(false);
    }
  }, [classId, statusFilter, appliedSearch, page]);

  const loadInvitations = useCallback(async () => {
    setInvLoading(true);
    try {
      const list = await fetchClassInvitations(classId);
      setInvitations(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invitations");
    } finally {
      setInvLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const handleAddStudent = async () => {
    if (!studentEmail.trim()) {
      toast.error("Please enter the student's email address");
      return;
    }
    setAddingStudent(true);
    try {
      await addStudentToClass(classId, {
        email: studentEmail.trim(),
        status: initialStatus,
        studentCode: studentCode.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success(
        initialStatus === "ACTIVE"
          ? "Student enrolled in class"
          : "Class invitation sent to student",
      );
      setStudentEmail("");
      setStudentCode("");
      setNote("");
      await loadRoster();
      onRosterMutated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  };

  const handleEnrollmentTransition = async (
    enrollment: ClassEnrollmentRecord,
    nextStatus: ClassEnrollmentStatus,
  ) => {
    setBusyEnrollmentId(enrollment.id);
    try {
      await updateClassEnrollment(classId, enrollment.id, { status: nextStatus });
      toast.success(`Updated enrollment to ${nextStatus}`);
      await loadRoster();
      onRosterMutated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update enrollment");
    } finally {
      setBusyEnrollmentId(null);
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingCode(true);
    try {
      const maxUsesNum = invMaxUses.trim() ? Number(invMaxUses.trim()) : null;
      const created = await createClassInvitation(classId, {
        label: invLabel.trim() || undefined,
        requiresApproval: invRequiresApproval,
        expiresInHours: Number(invExpiresHours) || 168,
        maxUses: maxUsesNum,
      });
      setNewlyCreatedCode(created);
      setInvLabel("");
      setInvMaxUses("");
      toast.success("Invitation code generated");
      await loadInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      await revokeClassInvitation(classId, invitationId);
      toast.success("Invitation code revoked");
      if (newlyCreatedCode?.id === invitationId) {
        setNewlyCreatedCode(null);
      }
      await loadInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke code");
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Unable to copy to clipboard");
    }
  };

  const activeCount = rosterData?.summary?.ACTIVE ?? 0;
  const pendingCount = rosterData?.summary?.PENDING ?? 0;
  const invitedCount = rosterData?.summary?.INVITED ?? 0;
  const suspendedCount = rosterData?.summary?.SUSPENDED ?? 0;
  const capacity = rosterData?.capacity ?? null;

  return (
    <div className="space-y-6">
      {/* Summary KPI bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">{t("classes.studentPortal.statusActive")}</CardDescription>
            <CardTitle className="text-xl">
              {activeCount}
              {capacity ? ` / ${capacity}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-muted-foreground text-xs">
            {capacity
              ? t("classes.roster.seatsUsed")
                  .replace("{active}", String(activeCount))
                  .replace("{capacity}", String(capacity))
              : t("classes.roster.unlimitedSeats").replace("{active}", String(activeCount))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">{t("classes.studentPortal.statusPending")}</CardDescription>
            <CardTitle className="text-xl text-amber-600">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-muted-foreground text-xs">
            {t("classes.roster.pendingRequests").replace("{count}", String(pendingCount))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">{t("classes.studentPortal.statusInvited")}</CardDescription>
            <CardTitle className="text-xl text-blue-600">{invitedCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-muted-foreground text-xs">
            Awaiting student acceptance
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">{t("classes.studentPortal.statusSuspended")}</CardDescription>
            <CardTitle className="text-xl text-rose-600">{suspendedCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-muted-foreground text-xs">
            Access restricted
          </CardContent>
        </Card>
      </div>

      {/* Add student + Invitation Generator side-by-side */}
      {!isArchived ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Add Existing Student */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="size-4" />
                {t("classes.roster.addStudentTitle")}
              </CardTitle>
              <CardDescription>{t("classes.roster.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{t("classes.roster.studentEmail")}</FieldLabel>
                  <Input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder={t("classes.roster.studentEmailPlaceholder")}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("classes.roster.studentCode")}</FieldLabel>
                  <Input
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder={t("classes.roster.studentCodePlaceholder")}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{t("classes.roster.initialStatus")}</FieldLabel>
                  <Select
                    value={initialStatus}
                    onValueChange={(v) => setInitialStatus(v as "ACTIVE" | "INVITED")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{t("classes.roster.enrollImmediately")}</SelectItem>
                      <SelectItem value="INVITED">{t("classes.roster.sendInvitation")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t("classes.roster.note")}</FieldLabel>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note..."
                  />
                </Field>
              </div>

              <div className="flex justify-end pt-1">
                <Button size="sm" disabled={addingStudent} onClick={handleAddStudent}>
                  <Plus className="mr-1.5 size-4" />
                  {t("classes.roster.addStudent")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generate & Manage Join Codes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4" />
                {t("classes.invitations.title")}
              </CardTitle>
              <CardDescription>{t("classes.invitations.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {newlyCreatedCode?.code ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-emerald-950">
                  <p className="font-medium text-xs">{t("classes.invitations.newCodeBannerTitle")}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <code className="rounded bg-white px-2.5 py-1 font-bold font-mono text-base tracking-wider shadow-xs">
                      {newlyCreatedCode.code}
                    </code>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 bg-white text-xs"
                        onClick={() => copyToClipboard(newlyCreatedCode.code!, "Code")}
                      >
                        <Copy className="mr-1 size-3.5" />
                        {t("classes.invitations.copyCode")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 bg-white text-xs"
                        onClick={() => {
                          const url = `${window.location.origin}/classes?join=${encodeURIComponent(newlyCreatedCode.code!)}`;
                          void copyToClipboard(url, "Join link");
                        }}
                      >
                        <Link2 className="mr-1 size-3.5" />
                        {t("classes.invitations.copyLink")}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel>{t("classes.invitations.label")}</FieldLabel>
                  <Input
                    value={invLabel}
                    onChange={(e) => setInvLabel(e.target.value)}
                    placeholder={t("classes.invitations.labelPlaceholder")}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("classes.invitations.expiresInHours")}</FieldLabel>
                  <Select value={invExpiresHours} onValueChange={setInvExpiresHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 Hours</SelectItem>
                      <SelectItem value="168">7 Days</SelectItem>
                      <SelectItem value="720">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t("classes.invitations.maxUses")}</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={invMaxUses}
                    onChange={(e) => setInvMaxUses(e.target.value)}
                    placeholder={t("classes.invitations.maxUsesPlaceholder")}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label htmlFor="inv-requires-approval" className="flex cursor-pointer items-center gap-2 text-xs">
                  <Checkbox
                    id="inv-requires-approval"
                    checked={invRequiresApproval}
                    onCheckedChange={(v) => setInvRequiresApproval(Boolean(v))}
                  />
                  <span>{t("classes.invitations.requiresApproval")}</span>
                </label>

                <Button size="sm" disabled={generatingCode} onClick={handleGenerateInvite}>
                  <KeyRound className="mr-1.5 size-3.5" />
                  {t("classes.invitations.generateCode")}
                </Button>
              </div>

              {/* Existing invitations list */}
              {invLoading ? (
                <div className="flex items-center gap-2 py-2 text-muted-foreground text-xs">
                  <Spinner className="size-3.5" /> Loading codes…
                </div>
              ) : invitations.length > 0 ? (
                <div className="max-h-44 space-y-2 overflow-y-auto border-t pt-3">
                  {invitations.map((inv) => {
                    const isRevoked = Boolean(inv.revokedAt);
                    const isExpired = new Date(inv.expiresAt).getTime() <= Date.now();
                    return (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">{inv.codeHint}</span>
                            {inv.label ? (
                              <span className="text-muted-foreground">({inv.label})</span>
                            ) : null}
                            {isRevoked ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {t("classes.invitations.revoked")}
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="outline" className="text-[10px]">
                                {t("classes.invitations.expired")}
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-[10px]">
                                {t("classes.invitations.active")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {inv.maxUses
                              ? t("classes.invitations.uses")
                                  .replace("{used}", String(inv.usedCount))
                                  .replace("{max}", String(inv.maxUses))
                              : t("classes.invitations.usesUnlimited").replace(
                                  "{used}",
                                  String(inv.usedCount),
                                )}{" "}
                            · Exp: {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!isRevoked && !isExpired ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-destructive text-xs"
                            onClick={() => handleRevokeInvite(inv.id)}
                          >
                            {t("classes.invitations.revoke")}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Roster List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                {t("classes.roster.title")} ({rosterData?.total ?? 0})
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      setAppliedSearch(searchInput);
                    }
                  }}
                  placeholder={t("classes.roster.searchPlaceholder")}
                  className="pl-8"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setPage(1);
                  setStatusFilter(v as ClassEnrollmentStatus | "ALL");
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("classes.roster.allStatuses")}</SelectItem>
                  <SelectItem value="ACTIVE">{t("classes.studentPortal.statusActive")}</SelectItem>
                  <SelectItem value="PENDING">{t("classes.studentPortal.statusPending")}</SelectItem>
                  <SelectItem value="INVITED">{t("classes.studentPortal.statusInvited")}</SelectItem>
                  <SelectItem value="SUSPENDED">{t("classes.studentPortal.statusSuspended")}</SelectItem>
                  <SelectItem value="LEFT">Left</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(1);
                  setAppliedSearch(searchInput);
                  void loadRoster();
                }}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {rosterLoading ? (
            <div className="flex h-36 items-center justify-center gap-2">
              <Spinner className="size-5" />
              <span className="text-muted-foreground text-sm">Loading student roster…</span>
            </div>
          ) : !rosterData || rosterData.items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              {t("classes.roster.noStudents")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {rosterData.items.map((item) => {
                const isBusy = busyEnrollmentId === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">
                          {item.student?.name || "Student"}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.studentCode}
                        </Badge>
                        <Badge
                          variant={
                            item.status === "ACTIVE"
                              ? "default"
                              : item.status === "PENDING" || item.status === "INVITED"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
                        {item.student?.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3" />
                            {item.student.email}
                          </span>
                        ) : null}
                        {item.student?.phoneNumber ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3" />
                            {item.student.phoneNumber}
                          </span>
                        ) : null}
                        <span>Joined: {new Date(item.joinedAt).toLocaleDateString()}</span>
                        {item.note ? <span>Note: {item.note}</span> : null}
                      </div>
                    </div>

                    {!isArchived ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {item.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleEnrollmentTransition(item, "ACTIVE")}
                            >
                              <Check className="mr-1 size-3.5" />
                              {t("classes.roster.approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              disabled={isBusy}
                              onClick={() => handleEnrollmentTransition(item, "REJECTED")}
                            >
                              <X className="mr-1 size-3.5" />
                              {t("classes.roster.reject")}
                            </Button>
                          </>
                        ) : null}

                        {item.status === "INVITED" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleEnrollmentTransition(item, "ACTIVE")}
                            >
                              <UserCheck className="mr-1 size-3.5" />
                              {t("classes.roster.approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={isBusy}
                              onClick={() => handleEnrollmentTransition(item, "LEFT")}
                            >
                              <UserMinus className="mr-1 size-3.5" />
                              {t("classes.roster.remove")}
                            </Button>
                          </>
                        ) : null}

                        {item.status === "ACTIVE" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleEnrollmentTransition(item, "SUSPENDED")}
                            >
                              <Ban className="mr-1 size-3.5" />
                              {t("classes.roster.suspend")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={isBusy}
                              onClick={() => handleEnrollmentTransition(item, "LEFT")}
                            >
                              <UserMinus className="mr-1 size-3.5" />
                              {t("classes.roster.remove")}
                            </Button>
                          </>
                        ) : null}

                        {item.status === "SUSPENDED" ||
                        item.status === "LEFT" ||
                        item.status === "REJECTED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleEnrollmentTransition(item, "ACTIVE")}
                          >
                            <ShieldAlert className="mr-1 size-3.5" />
                            {t("classes.roster.reactivate")}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {rosterData.totalPages > 1 ? (
                <div className="flex items-center justify-between pt-3 text-xs">
                  <span className="text-muted-foreground">
                    Page {rosterData.page} of {rosterData.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= rosterData.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
