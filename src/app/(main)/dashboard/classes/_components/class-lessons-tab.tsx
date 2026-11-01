"use client";

import { useCallback, useEffect, useState } from "react";

import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Link2,
  Lock,
  Plus,
  StickyNote,
  Trash2,
  Upload,
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
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import {
  addLessonResource,
  createModuleLesson,
  deleteLessonResource,
  deleteModuleLesson,
  fetchClassLearning,
  openProtectedLessonResource,
  updateModuleLesson,
} from "@/lib/classes-api";
import { getClientCookie } from "@/lib/cookie.client";
import type {
  ClassLearningResponse,
  LessonItem,
  LessonResourceAccessPolicy,
  LessonResourceType,
  LessonStatus,
} from "@/types/classes";
import { emptyLocalizedText, type LocalizedText, localize, type SupportedLocale } from "@/types/quiz";

interface ClassLessonsTabProps {
  classId: string;
  courseId: string;
  isArchived: boolean;
}

export function ClassLessonsTab({ classId, courseId, isArchived }: ClassLessonsTabProps) {
  const { locale, t } = useI18n();
  const [learning, setLearning] = useState<ClassLearningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState<SupportedLocale>("en");

  // Quick Add Module state
  const [newModuleTitleEn, setNewModuleTitleEn] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);

  // Add Lesson state
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState<LocalizedText>(emptyLocalizedText());
  const [lessonSummary, setLessonSummary] = useState<LocalizedText>(emptyLocalizedText());
  const [lessonBody, setLessonBody] = useState<LocalizedText>(emptyLocalizedText());
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>("Published");
  const [estimatedMinutes, setEstimatedMinutes] = useState("45");
  const [sortOrder, setSortOrder] = useState("0");
  const [savingLesson, setSavingLesson] = useState(false);

  // Attach Resource state
  const [targetLessonId, setTargetLessonId] = useState<string | null>(null);
  const [resTitle, setRtcTitle] = useState<LocalizedText>(emptyLocalizedText());
  const [resType, setResType] = useState<LessonResourceType>("PDF");
  const [resPolicy, setResPolicy] = useState<LessonResourceAccessPolicy>("DOWNLOADABLE");
  const [resExternalUrl, setResExternalUrl] = useState("");
  const [resNoteText, setResNoteText] = useState<LocalizedText>(emptyLocalizedText());
  const [resFile, setResFile] = useState<File | null>(null);
  const [savingResource, setSavingResource] = useState(false);

  const loadLearning = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClassLearning(classId);
      setLearning(data);
      if (!selectedModuleId && data.modules.length > 0) {
        setSelectedModuleId(data.modules[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load lessons");
    } finally {
      setLoading(false);
    }
  }, [classId, selectedModuleId]);

  useEffect(() => {
    void loadLearning();
  }, [loadLearning]);

  const handleQuickCreateModule = async () => {
    if (!newModuleTitleEn.trim()) {
      toast.error("Enter a module title in English");
      return;
    }
    setCreatingModule(true);
    try {
      const token = getClientCookie("session_token");
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses/${courseId}/modules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: {
            en: newModuleTitleEn.trim(),
            si: newModuleTitleEn.trim(),
            ta: newModuleTitleEn.trim(),
          },
          status: "Published",
          sortOrder: learning?.modules.length ?? 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to create module");
      }
      const created = await res.json();
      setNewModuleTitleEn("");
      setSelectedModuleId(created.id);
      toast.success("Module created");
      await loadLearning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create module");
    } finally {
      setCreatingModule(false);
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedModuleId) {
      toast.error("Please select or create a course module first");
      return;
    }
    if (!lessonTitle.en.trim()) {
      toast.error("Lesson title in English is required");
      return;
    }
    setSavingLesson(true);
    try {
      await createModuleLesson(selectedModuleId, {
        title: {
          en: lessonTitle.en.trim(),
          si: lessonTitle.si.trim() || lessonTitle.en.trim(),
          ta: lessonTitle.ta.trim() || lessonTitle.en.trim(),
        },
        summary: lessonSummary.en.trim()
          ? {
              en: lessonSummary.en.trim(),
              si: lessonSummary.si.trim() || lessonSummary.en.trim(),
              ta: lessonSummary.ta.trim() || lessonSummary.en.trim(),
            }
          : null,
        body: lessonBody.en.trim()
          ? {
              en: lessonBody.en.trim(),
              si: lessonBody.si.trim() || lessonBody.en.trim(),
              ta: lessonBody.ta.trim() || lessonBody.en.trim(),
            }
          : null,
        status: lessonStatus,
        estimatedMinutes: estimatedMinutes.trim() ? Number(estimatedMinutes) : null,
        sortOrder: Number(sortOrder) || 0,
      });
      toast.success("Lesson created");
      setLessonTitle(emptyLocalizedText());
      setLessonSummary(emptyLocalizedText());
      setLessonBody(emptyLocalizedText());
      await loadLearning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lesson");
    } finally {
      setSavingLesson(false);
    }
  };

  const handleToggleLessonStatus = async (lesson: LessonItem) => {
    const nextStatus: LessonStatus = lesson.status === "Published" ? "Draft" : "Published";
    try {
      await updateModuleLesson(lesson.id, { status: nextStatus });
      toast.success(`Lesson status set to ${nextStatus}`);
      await loadLearning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lesson");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteModuleLesson(lessonId);
      toast.success("Lesson deleted");
      await loadLearning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete lesson");
    }
  };

  const handleAttachResource = async () => {
    if (!targetLessonId) return;
    if (!resTitle.en.trim()) {
      toast.error("Material title in English is required");
      return;
    }
    setSavingResource(true);
    try {
      await addLessonResource(targetLessonId, {
        title: {
          en: resTitle.en.trim(),
          si: resTitle.si.trim() || resTitle.en.trim(),
          ta: resTitle.ta.trim() || resTitle.en.trim(),
        },
        type: resType,
        accessPolicy: resPolicy,
        externalUrl: resExternalUrl.trim() || undefined,
        noteText: resNoteText.en.trim()
          ? {
              en: resNoteText.en.trim(),
              si: resNoteText.si.trim() || resNoteText.en.trim(),
              ta: resNoteText.ta.trim() || resNoteText.en.trim(),
            }
          : undefined,
        file: resFile,
      });
      toast.success("Material attached to lesson");
      setTargetLessonId(null);
      setRtcTitle(emptyLocalizedText());
      setResExternalUrl("");
      setResNoteText(emptyLocalizedText());
      setResFile(null);
      await loadLearning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach material");
    } finally {
      setSavingResource(false);
    }
  };

  const handleDeleteResource = async (lessonId: string, resourceId: string) => {
    try {
      await deleteLessonResource(lessonId, resourceId);
      toast.success("Material removed");
      await loadLearning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove material");
    }
  };

  const handleOpenResource = async (lessonId: string, resourceId: string) => {
    try {
      await openProtectedLessonResource(lessonId, resourceId, classId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to open material");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-5" />
        <span className="text-muted-foreground text-sm">Loading modules and lessons…</span>
      </div>
    );
  }

  const modules = learning?.modules ?? [];

  return (
    <div className="space-y-6">
      {!isArchived ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Author Lesson Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="size-4" />
                    {t("classes.learning.addLesson")}
                  </CardTitle>
                  <CardDescription>{t("classes.learning.subtitle")}</CardDescription>
                </div>

                <div className="flex items-center gap-1 rounded-lg border p-1">
                  {(["en", "si", "ta"] as const).map((lng) => (
                    <Button
                      key={lng}
                      type="button"
                      size="sm"
                      variant={activeLang === lng ? "default" : "ghost"}
                      className="h-7 px-2.5 text-xs uppercase"
                      onClick={() => setActiveLang(lng)}
                    >
                      {lng}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel>Module</FieldLabel>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {localize(m.title, locale) || "Untitled Module"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>{t("classes.status")}</FieldLabel>
                  <Select
                    value={lessonStatus}
                    onValueChange={(v) => setLessonStatus(v as LessonStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Published">{t("classes.statusPublished")}</SelectItem>
                      <SelectItem value="Draft">{t("classes.statusDraft")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>{t("classes.learning.estimatedMinutes")}</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Field className="sm:col-span-3">
                  <FieldLabel>
                    {t("classes.learning.lessonTitle")} ({activeLang.toUpperCase()})
                  </FieldLabel>
                  <Input
                    value={lessonTitle[activeLang]}
                    onChange={(e) =>
                      setLessonTitle((prev) => ({ ...prev, [activeLang]: e.target.value }))
                    }
                    placeholder="e.g. Introduction to Quadratic Equations"
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("classes.learning.sortOrder")}</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>
                  {t("classes.learning.lessonSummary")} ({activeLang.toUpperCase()})
                </FieldLabel>
                <Input
                  value={lessonSummary[activeLang]}
                  onChange={(e) =>
                    setLessonSummary((prev) => ({ ...prev, [activeLang]: e.target.value }))
                  }
                  placeholder="Optional brief summary..."
                />
              </Field>

              <Field>
                <FieldLabel>
                  {t("classes.learning.lessonBody")} ({activeLang.toUpperCase()})
                </FieldLabel>
                <Textarea
                  rows={3}
                  value={lessonBody[activeLang]}
                  onChange={(e) =>
                    setLessonBody((prev) => ({ ...prev, [activeLang]: e.target.value }))
                  }
                  placeholder="Lesson instructions, formulas, or key study notes..."
                />
              </Field>

              <div className="flex justify-end pt-1">
                <Button size="sm" disabled={savingLesson} onClick={handleCreateLesson}>
                  <Plus className="mr-1.5 size-4" />
                  {t("classes.learning.addLesson")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Course Module */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderPlus className="size-4" />
                {t("classes.learning.addModule")}
              </CardTitle>
              <CardDescription>
                Add a new module to this course if needed before authoring lessons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field>
                <FieldLabel>Module Title (EN)</FieldLabel>
                <Input
                  value={newModuleTitleEn}
                  onChange={(e) => setNewModuleTitleEn(e.target.value)}
                  placeholder="e.g. Unit 1: Algebra Foundations"
                />
              </Field>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={creatingModule}
                onClick={handleQuickCreateModule}
              >
                <Plus className="mr-1.5 size-4" />
                {t("classes.learning.addModule")}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Attach Material Modal/Card when targetLessonId is selected */}
      {targetLessonId && !isArchived ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("classes.learning.addResource")}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setTargetLessonId(null)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t("classes.learning.resourceTitle")} (EN)</FieldLabel>
                <Input
                  value={resTitle.en}
                  onChange={(e) => setRtcTitle((prev) => ({ ...prev, en: e.target.value }))}
                  placeholder="e.g. Past Paper Worksheet PDF"
                />
              </Field>

              <Field>
                <FieldLabel>{t("classes.learning.resourceType")}</FieldLabel>
                <Select
                  value={resType}
                  onValueChange={(v) => setResType(v as LessonResourceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF Document</SelectItem>
                    <SelectItem value="DOCUMENT">Word / Text Document</SelectItem>
                    <SelectItem value="IMAGE">Diagram / Image</SelectItem>
                    <SelectItem value="VIDEO_EMBED">Video Link / Embed (HTTPS)</SelectItem>
                    <SelectItem value="EXTERNAL_LINK">External Reference Link (HTTPS)</SelectItem>
                    <SelectItem value="TEACHER_NOTE">Teacher Note</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>{t("classes.learning.accessPolicy")}</FieldLabel>
                <Select
                  value={resPolicy}
                  onValueChange={(v) => setResPolicy(v as LessonResourceAccessPolicy)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOWNLOADABLE">{t("classes.learning.downloadable")}</SelectItem>
                    <SelectItem value="VIEW_ONLY">{t("classes.learning.viewOnly")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {resType === "PDF" || resType === "DOCUMENT" || resType === "IMAGE" ? (
              <Field>
                <FieldLabel>{t("classes.learning.uploadFile")}</FieldLabel>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setResFile(e.target.files?.[0] ?? null)}
                />
              </Field>
            ) : resType === "VIDEO_EMBED" || resType === "EXTERNAL_LINK" ? (
              <Field>
                <FieldLabel>{t("classes.learning.externalUrl")}</FieldLabel>
                <Input
                  type="url"
                  value={resExternalUrl}
                  onChange={(e) => setResExternalUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel>{t("classes.learning.teacherNote")}</FieldLabel>
                <Textarea
                  rows={3}
                  value={resNoteText.en}
                  onChange={(e) => setResNoteText((prev) => ({ ...prev, en: e.target.value }))}
                  placeholder="Enter important formula or homework reminder..."
                />
              </Field>
            )}

            <div className="flex justify-end">
              <Button size="sm" disabled={savingResource} onClick={handleAttachResource}>
                <Upload className="mr-1.5 size-4" />
                {t("classes.learning.addResource")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Modules & Lessons Hierarchy */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            {t("classes.learning.noModules")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, mIdx) => (
            <Card key={mod.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="mb-1">
                      Module {mIdx + 1}
                    </Badge>
                    <CardTitle className="text-base">
                      {localize(mod.title, locale) || "Untitled Module"}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">{mod.lessons.length} lesson(s)</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {mod.lessons.length === 0 ? (
                  <p className="text-muted-foreground text-xs">{t("classes.learning.noLessons")}</p>
                ) : (
                  mod.lessons.map((lesson, lIdx) => {
                    const lTitle = localize(lesson.title, locale) || "Untitled Lesson";
                    const lSummary = localize(lesson.summary, locale);
                    const lBody = localize(lesson.body, locale);

                    return (
                      <div key={lesson.id} className="space-y-3 rounded-xl border p-4">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm">
                                {lIdx + 1}. {lTitle}
                              </span>
                              <Badge
                                variant={lesson.status === "Published" ? "default" : "secondary"}
                              >
                                {lesson.status}
                              </Badge>
                              {lesson.estimatedMinutes ? (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Clock className="size-3" />
                                  {lesson.estimatedMinutes} min
                                </Badge>
                              ) : null}
                            </div>
                            {lSummary ? (
                              <p className="text-muted-foreground text-xs">{lSummary}</p>
                            ) : null}
                            {lBody ? (
                              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/40 p-2.5 text-xs">
                                {lBody}
                              </p>
                            ) : null}
                          </div>

                          {!isArchived ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => setTargetLessonId(lesson.id)}
                              >
                                <Plus className="mr-1 size-3.5" />
                                {t("classes.learning.addResource")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => handleToggleLessonStatus(lesson)}
                              >
                                <CheckCircle2 className="mr-1 size-3.5" />
                                {lesson.status === "Published"
                                  ? t("classes.learning.unpublishLesson")
                                  : t("classes.learning.publishLesson")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-destructive text-xs"
                                onClick={() => handleDeleteLesson(lesson.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {/* Attached Resources */}
                        {lesson.resources.length > 0 ? (
                          <div className="space-y-2 border-t pt-2.5">
                            {lesson.resources.map((res) => {
                              const rTitle = localize(res.title, locale) || "Resource";
                              const rNote = localize(res.noteText, locale);
                              return (
                                <div
                                  key={res.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    {res.type === "PDF" || res.type === "DOCUMENT" ? (
                                      <FileText className="size-3.5 text-primary" />
                                    ) : res.type === "IMAGE" ? (
                                      <ImageIcon className="size-3.5 text-primary" />
                                    ) : res.type === "VIDEO_EMBED" ? (
                                      <Video className="size-3.5 text-primary" />
                                    ) : res.type === "EXTERNAL_LINK" ? (
                                      <Link2 className="size-3.5 text-primary" />
                                    ) : (
                                      <StickyNote className="size-3.5 text-amber-600" />
                                    )}
                                    <span className="font-medium">{rTitle}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {res.type}
                                    </Badge>
                                    {res.hasPrivateFile ? (
                                      <Badge variant="secondary" className="gap-1 text-[10px]">
                                        <Lock className="size-2.5" />
                                        {res.accessPolicy === "VIEW_ONLY"
                                          ? t("classes.learning.viewOnly")
                                          : t("classes.learning.downloadable")}
                                      </Badge>
                                    ) : null}
                                    {rNote ? (
                                      <span className="text-muted-foreground">— {rNote}</span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {res.type !== "TEACHER_NOTE" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => handleOpenResource(lesson.id, res.id)}
                                      >
                                        {res.hasPrivateFile ? (
                                          res.accessPolicy === "VIEW_ONLY" ? (
                                            <Eye className="mr-1 size-3" />
                                          ) : (
                                            <Download className="mr-1 size-3" />
                                          )
                                        ) : (
                                          <ExternalLink className="mr-1 size-3" />
                                        )}
                                        {t("classes.learning.openResource")}
                                      </Button>
                                    ) : null}
                                    {!isArchived ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-destructive"
                                        onClick={() => handleDeleteResource(lesson.id, res.id)}
                                      >
                                        <Trash2 className="size-3" />
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

