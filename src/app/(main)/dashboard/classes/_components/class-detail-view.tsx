"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import {
  Archive,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  Globe,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";
import {
  archiveClassBatch,
  createClassSchedule,
  deleteClassSchedule,
  duplicateClassBatch,
  fetchClassBatchById,
  updateClassBatch,
  updateClassSchedule,
} from "@/lib/classes-api";
import type { ClassBatch, ClassLocationType, ClassSchedule } from "@/types/classes";
import { emptyLocalizedText, type LocalizedText, localize, type SupportedLocale } from "@/types/quiz";
import { ClassAttendanceTab } from "./class-attendance-tab";
import { ClassLessonsTab } from "./class-lessons-tab";
import { ClassPaymentsTab } from "./class-payments-tab";
import { ClassQuizzesTab } from "./class-quizzes-tab";
import { ClassRosterTab } from "./class-roster-tab";

export function ClassDetailView({ classId }: { classId: string }) {
  const { locale, t } = useI18n();
  const [batch, setBatch] = useState<ClassBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Settings tab inline form state
  const [settingsLang, setSettingsLang] = useState<SupportedLocale>("en");
  const [settingsTitle, setSettingsTitle] = useState<LocalizedText>(emptyLocalizedText());
  const [settingsDesc, setSettingsDesc] = useState<LocalizedText>(emptyLocalizedText());
  const [settingsGrade, setSettingsGrade] = useState("");
  const [settingsSubject, setSettingsSubject] = useState("");
  const [settingsAcademicYear, setSettingsAcademicYear] = useState<string>("2026");
  const [settingsCapacity, setSettingsCapacity] = useState<string>("");
  const [settingsStartDate, setSettingsStartDate] = useState<string>("");
  const [settingsEndDate, setSettingsEndDate] = useState<string>("");
  const [settingsLanguages, setSettingsLanguages] = useState<SupportedLocale[]>(["en"]);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Schedule form state
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [weekday, setWeekday] = useState<number>(6);
  const [localStartTime, setLocalStartTime] = useState("09:00");
  const [localEndTime, setLocalEndTime] = useState("11:00");
  const [timezone, setTimezone] = useState("Asia/Colombo");
  const [locationType, setLocationType] = useState<ClassLocationType>("ONLINE");
  const [locationValue, setLocationValue] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState("");
  const [slotSaving, setSlotSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      const validTabs = [
        "overview",
        "students",
        "timetable",
        "lessons",
        "quizzes",
        "attendance",
        "payments",
        "settings",
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const loadBatch = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchClassBatchById(classId);
      setBatch(data);
      setSettingsTitle({
        en: data.title?.en ?? "",
        si: data.title?.si ?? "",
        ta: data.title?.ta ?? "",
      });
      setSettingsDesc({
        en: data.description?.en ?? "",
        si: data.description?.si ?? "",
        ta: data.description?.ta ?? "",
      });
      setSettingsGrade(data.grade ?? "");
      setSettingsSubject(data.subject ?? "");
      setSettingsAcademicYear(String(data.academicYear ?? new Date().getFullYear()));
      setSettingsCapacity(data.capacity != null ? String(data.capacity) : "");
      setSettingsStartDate(data.startDate ? data.startDate.slice(0, 10) : "");
      setSettingsEndDate(data.endDate ? data.endDate.slice(0, 10) : "");
      setSettingsLanguages(
        data.languages?.length ? (data.languages as SupportedLocale[]) : ["en"],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load class batch";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  const resetScheduleForm = () => {
    setEditingSlotId(null);
    setWeekday(6);
    setLocalStartTime("09:00");
    setLocalEndTime("11:00");
    setTimezone("Asia/Colombo");
    setLocationType("ONLINE");
    setLocationValue("");
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setEffectiveTo("");
  };

  const startEditSlot = (slot: ClassSchedule) => {
    setEditingSlotId(slot.id);
    setWeekday(slot.weekday);
    setLocalStartTime(slot.localStartTime);
    setLocalEndTime(slot.localEndTime);
    setTimezone(slot.timezone || "Asia/Colombo");
    setLocationType(slot.locationType);
    setLocationValue(slot.locationValue ?? "");
    setEffectiveFrom(slot.effectiveFrom ? slot.effectiveFrom.slice(0, 10) : "");
    setEffectiveTo(slot.effectiveTo ? slot.effectiveTo.slice(0, 10) : "");
  };

  const handleSaveSlot = async () => {
    if (!batch) return;
    setSlotSaving(true);
    try {
      const payload = {
        weekday: Number(weekday),
        localStartTime,
        localEndTime,
        timezone: timezone.trim() || "Asia/Colombo",
        locationType,
        locationValue: locationValue.trim() || null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      };

      if (editingSlotId) {
        await updateClassSchedule(batch.id, editingSlotId, payload);
        toast.success("Schedule slot updated");
      } else {
        await createClassSchedule(batch.id, payload);
        toast.success("Schedule slot added");
      }
      resetScheduleForm();
      await loadBatch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save schedule slot");
    } finally {
      setSlotSaving(false);
    }
  };

  const handleDeleteSlot = async (scheduleId: string) => {
    if (!batch) return;
    try {
      await deleteClassSchedule(batch.id, scheduleId);
      toast.success("Schedule slot removed");
      if (editingSlotId === scheduleId) resetScheduleForm();
      await loadBatch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete schedule slot");
    }
  };

  const handleStatusChange = async (nextStatus: "Draft" | "Published" | "Archived") => {
    if (!batch) return;
    setStatusBusy(true);
    try {
      if (nextStatus === "Archived") {
        await archiveClassBatch(batch.id);
      } else {
        await updateClassBatch(batch.id, { status: nextStatus });
      }
      toast.success(`Class status updated to ${nextStatus}`);
      await loadBatch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!batch) return;
    if (!settingsTitle.en.trim()) {
      toast.error("English class title is required");
      return;
    }
    setSettingsSaving(true);
    try {
      await updateClassBatch(batch.id, {
        title: {
          en: settingsTitle.en.trim(),
          si: settingsTitle.si.trim() || settingsTitle.en.trim(),
          ta: settingsTitle.ta.trim() || settingsTitle.en.trim(),
        },
        description: settingsDesc.en.trim()
          ? {
              en: settingsDesc.en.trim(),
              si: settingsDesc.si.trim() || settingsDesc.en.trim(),
              ta: settingsDesc.ta.trim() || settingsDesc.en.trim(),
            }
          : null,
        grade: settingsGrade.trim() || null,
        subject: settingsSubject.trim() || null,
        academicYear: Number(settingsAcademicYear) || batch.academicYear,
        capacity: settingsCapacity.trim() ? Number(settingsCapacity) : null,
        startDate: settingsStartDate ? new Date(settingsStartDate).toISOString() : null,
        endDate: settingsEndDate ? new Date(settingsEndDate).toISOString() : null,
        languages: settingsLanguages.length ? settingsLanguages : ["en"],
      });
      toast.success("Class settings saved");
      await loadBatch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save class settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDuplicateBatch = async () => {
    if (!batch) return;
    setStatusBusy(true);
    try {
      await duplicateClassBatch(batch.id);
      toast.success("Class batch duplicated as Draft");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate class batch");
    } finally {
      setStatusBusy(false);
    }
  };

  if (loading && !batch) {
    return (
      <div className="flex h-48 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading class details…</span>
      </div>
    );
  }

  if (loadError || !batch) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="font-medium text-sm text-destructive">
            {loadError || "Unable to load class details."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadBatch()}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Retry
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/classes">{t("classes.backToClasses")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const titleText = localize(batch.title, locale) || "Untitled Class";
  const descText = localize(batch.description, locale);
  const courseTitleText = localize(batch.course?.title, locale) || "Course";
  const isArchived = batch.status === "Archived";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-2xl tracking-tight">{titleText}</h1>
            <Badge
              variant={
                batch.status === "Published"
                  ? "default"
                  : batch.status === "Archived"
                    ? "secondary"
                    : "outline"
              }
            >
              {batch.status === "Published"
                ? t("classes.statusPublished")
                : batch.status === "Archived"
                  ? t("classes.statusArchived")
                  : t("classes.statusDraft")}
            </Badge>
            <Badge variant="outline">{batch.academicYear}</Badge>
            {batch.grade ? <Badge variant="secondary">{batch.grade}</Badge> : null}
            {batch.subject ? <Badge variant="outline">{batch.subject}</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {t("classes.course")}: <strong className="text-foreground">{courseTitleText}</strong> ·{" "}
            {batch.primaryTeacher.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/classes">{t("classes.backToClasses")}</Link>
          </Button>
          {!isArchived ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/classes/${batch.id}/edit`}>
                <Pencil className="mr-1 size-3.5" />
                {t("classes.editClass")}
              </Link>
            </Button>
          ) : null}
          {batch.status === "Draft" ? (
            <Button size="sm" disabled={statusBusy} onClick={() => handleStatusChange("Published")}>
              <CheckCircle2 className="mr-1 size-3.5" />
              {t("classes.publish")}
            </Button>
          ) : null}
          {!isArchived ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={statusBusy}
              onClick={() => handleStatusChange("Archived")}
            >
              <Archive className="mr-1 size-3.5" />
              {t("classes.archive")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={statusBusy}
              onClick={() => handleStatusChange("Draft")}
            >
              <RotateCcw className="mr-1 size-3.5" />
              {t("classes.restoreToDraft")}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">{t("classes.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="students">{t("classes.tabs.students")}</TabsTrigger>
          <TabsTrigger value="timetable">{t("classes.tabs.timetable")}</TabsTrigger>
          <TabsTrigger value="lessons">{t("classes.tabs.lessons")}</TabsTrigger>
          <TabsTrigger value="quizzes">{t("classes.tabs.quizzes")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("classes.tabs.attendance")}</TabsTrigger>
          <TabsTrigger value="payments">{t("classes.tabs.payments")}</TabsTrigger>
          <TabsTrigger value="settings">{t("classes.tabs.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("classes.tabs.students")}</CardDescription>
                <CardTitle className="text-2xl">
                  {batch.activeEnrollmentCount}
                  {batch.capacity ? ` / ${batch.capacity}` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                Active enrolled students
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("classes.schedule.title")}</CardDescription>
                <CardTitle className="text-2xl">{batch.schedules.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                Weekly recurring time slots
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("classes.teachingLanguages")}</CardDescription>
                <CardTitle className="text-2xl">
                  {batch.languages.map((l) => l.toUpperCase()).join(", ")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                Start: {batch.startDate ? batch.startDate.slice(0, 10) : "—"} · End:{" "}
                {batch.endDate ? batch.endDate.slice(0, 10) : "—"}
              </CardContent>
            </Card>
          </div>

          {descText ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("classes.description")}</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{descText}</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="timetable" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-5" />
                  {t("classes.schedule.title")}
                </CardTitle>
                <CardDescription>{t("classes.schedule.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {batch.schedules.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground text-sm">
                    {t("classes.schedule.noSlots")}
                  </p>
                ) : (
                  batch.schedules.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-col justify-between gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm">
                            {t(`classes.schedule.days.${slot.weekday}`)}
                          </span>
                          <Badge variant="secondary">
                            {slot.localStartTime} – {slot.localEndTime}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Globe className="mr-1 size-3" />
                            {slot.timezone}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {slot.locationType === "ONLINE" ? (
                              <Video className="mr-1 size-3" />
                            ) : (
                              <MapPin className="mr-1 size-3" />
                            )}
                            {slot.locationType === "ONLINE"
                              ? t("classes.schedule.online")
                              : slot.locationType === "PHYSICAL"
                                ? t("classes.schedule.physical")
                                : t("classes.schedule.hybrid")}
                          </Badge>
                        </div>
                        {slot.locationValue ? (
                          <p className="truncate text-muted-foreground text-xs">{slot.locationValue}</p>
                        ) : null}
                      </div>

                      {!isArchived ? (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditSlot(slot)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {!isArchived ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {editingSlotId ? t("classes.schedule.editSlot") : t("classes.schedule.addSlot")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Field>
                    <FieldLabel>{t("classes.schedule.weekday")}</FieldLabel>
                    <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {t(`classes.schedule.days.${d}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>{t("classes.schedule.startTime")}</FieldLabel>
                      <Input
                        type="time"
                        value={localStartTime}
                        onChange={(e) => setLocalStartTime(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t("classes.schedule.endTime")}</FieldLabel>
                      <Input
                        type="time"
                        value={localEndTime}
                        onChange={(e) => setLocalEndTime(e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>{t("classes.schedule.locationType")}</FieldLabel>
                    <Select
                      value={locationType}
                      onValueChange={(v) => setLocationType(v as ClassLocationType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONLINE">{t("classes.schedule.online")}</SelectItem>
                        <SelectItem value="PHYSICAL">{t("classes.schedule.physical")}</SelectItem>
                        <SelectItem value="HYBRID">{t("classes.schedule.hybrid")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>{t("classes.schedule.locationValue")}</FieldLabel>
                    <Input
                      value={locationValue}
                      onChange={(e) => setLocationValue(e.target.value)}
                      placeholder={t("classes.schedule.locationPlaceholder")}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>{t("classes.schedule.timezone")}</FieldLabel>
                    <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>{t("classes.schedule.effectiveFrom")}</FieldLabel>
                      <Input
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t("classes.schedule.effectiveTo")}</FieldLabel>
                      <Input
                        type="date"
                        value={effectiveTo}
                        onChange={(e) => setEffectiveTo(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingSlotId ? (
                      <Button variant="ghost" size="sm" onClick={resetScheduleForm}>
                        Cancel
                      </Button>
                    ) : null}
                    <Button size="sm" disabled={slotSaving} onClick={handleSaveSlot}>
                      <Plus className="mr-1 size-4" />
                      {editingSlotId ? t("classes.schedule.editSlot") : t("classes.schedule.addSlot")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="students">
          <ClassRosterTab
            classId={batch.id}
            isArchived={isArchived}
            onRosterMutated={() => void loadBatch()}
          />
        </TabsContent>

        <TabsContent value="lessons">
          <ClassLessonsTab
            classId={batch.id}
            courseId={batch.courseId}
            isArchived={isArchived}
          />
        </TabsContent>

        <TabsContent value="attendance">
          <ClassAttendanceTab classId={batch.id} />
        </TabsContent>

        <TabsContent value="payments">
          <ClassPaymentsTab classId={batch.id} />
        </TabsContent>

        <TabsContent value="quizzes">
          <ClassQuizzesTab
            classId={batch.id}
            courseId={batch.courseId}
            isArchived={isArchived}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="size-4" />
                {t("classes.tabs.settings")} — {titleText}
              </CardTitle>
              <CardDescription>
                Configure localized class title/description (EN / SI / TA), capacity, academic year, and batch lifecycle status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {(["en", "si", "ta"] as const).map((lang) => (
                  <Button
                    key={lang}
                    type="button"
                    size="sm"
                    variant={settingsLang === lang ? "default" : "outline"}
                    onClick={() => setSettingsLang(lang)}
                  >
                    {lang === "en" ? "English" : lang === "si" ? "සිංහල" : "தமிழ்"}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>
                    {t("classes.classTitle")} ({settingsLang.toUpperCase()})
                  </FieldLabel>
                  <Input
                    disabled={isArchived}
                    value={settingsTitle[settingsLang]}
                    onChange={(e) =>
                      setSettingsTitle((prev) => ({
                        ...prev,
                        [settingsLang]: e.target.value,
                      }))
                    }
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>{t("classes.grade")}</FieldLabel>
                    <Input
                      disabled={isArchived}
                      value={settingsGrade}
                      onChange={(e) => setSettingsGrade(e.target.value)}
                      placeholder={t("classes.gradePlaceholder")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t("classes.subject")}</FieldLabel>
                    <Input
                      disabled={isArchived}
                      value={settingsSubject}
                      onChange={(e) => setSettingsSubject(e.target.value)}
                      placeholder={t("classes.subjectPlaceholder")}
                    />
                  </Field>
                </div>
              </div>

              <Field>
                <FieldLabel>
                  {t("classes.description")} ({settingsLang.toUpperCase()})
                </FieldLabel>
                <Textarea
                  rows={3}
                  disabled={isArchived}
                  value={settingsDesc[settingsLang]}
                  onChange={(e) =>
                    setSettingsDesc((prev) => ({
                      ...prev,
                      [settingsLang]: e.target.value,
                    }))
                  }
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field>
                  <FieldLabel>{t("classes.academicYear")}</FieldLabel>
                  <Input
                    type="number"
                    disabled={isArchived}
                    value={settingsAcademicYear}
                    onChange={(e) => setSettingsAcademicYear(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("classes.capacity")}</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    disabled={isArchived}
                    value={settingsCapacity}
                    onChange={(e) => setSettingsCapacity(e.target.value)}
                    placeholder={t("classes.capacityPlaceholder")}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("classes.startDate")}</FieldLabel>
                  <Input
                    type="date"
                    disabled={isArchived}
                    value={settingsStartDate}
                    onChange={(e) => setSettingsStartDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("classes.endDate")}</FieldLabel>
                  <Input
                    type="date"
                    disabled={isArchived}
                    value={settingsEndDate}
                    onChange={(e) => setSettingsEndDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>{t("classes.teachingLanguages")}</FieldLabel>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {(["en", "si", "ta"] as const).map((lang) => {
                    const checked = settingsLanguages.includes(lang);
                    return (
                      <Button
                        key={lang}
                        type="button"
                        size="sm"
                        disabled={isArchived}
                        variant={checked ? "default" : "outline"}
                        onClick={() => {
                          setSettingsLanguages((prev) =>
                            prev.includes(lang)
                              ? prev.length > 1
                                ? prev.filter((l) => l !== lang)
                                : prev
                              : [...prev, lang],
                          );
                        }}
                      >
                        {lang.toUpperCase()}
                      </Button>
                    );
                  })}
                </div>
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={statusBusy}
                    onClick={handleDuplicateBatch}
                  >
                    <Copy className="mr-1.5 size-3.5" />
                    {t("classes.duplicate")}
                  </Button>
                  {!isArchived ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={statusBusy}
                      onClick={() => handleStatusChange("Archived")}
                    >
                      <Archive className="mr-1.5 size-3.5" />
                      {t("classes.archive")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={statusBusy}
                      onClick={() => handleStatusChange("Draft")}
                    >
                      <RotateCcw className="mr-1.5 size-3.5" />
                      {t("classes.restoreToDraft")}
                    </Button>
                  )}
                </div>

                {!isArchived ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={settingsSaving}
                    onClick={handleSaveSettings}
                  >
                    <Save className="mr-1.5 size-3.5" />
                    {settingsSaving ? t("classes.saving") : t("classes.saveClass")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

