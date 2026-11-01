"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { CalendarClock, ClipboardList, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import {
  createClassQuizAssignment,
  deleteClassQuizAssignment,
  fetchClassLearning,
} from "@/lib/classes-api";
import { getClientCookie } from "@/lib/cookie.client";
import type { ClassLearningResponse } from "@/types/classes";
import { type LocalizedText, localize } from "@/types/quiz";

interface AvailableQuizOption {
  id: string;
  title: LocalizedText;
  durationMinutes: number;
  passingScorePercentage: number;
  status: string;
}

interface ClassQuizzesTabProps {
  classId: string;
  courseId: string;
  isArchived: boolean;
}

export function ClassQuizzesTab({ classId, courseId, isArchived }: ClassQuizzesTabProps) {
  const { locale, t } = useI18n();
  const [learning, setLearning] = useState<ClassLearningResponse | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<AvailableQuizOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("NONE");
  const [displayTitleEn, setDisplayTitleEn] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getClientCookie("session_token");
      const [learningRes, quizzesRes] = await Promise.all([
        fetchClassLearning(classId),
        fetch(`${APP_CONFIG.apiUrl}/quizzes?courseId=${courseId}&status=Published`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : [])),
      ]);

      setLearning(learningRes);
      const quizList = Array.isArray(quizzesRes) ? quizzesRes : (quizzesRes?.items ?? []);
      setAvailableQuizzes(quizList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load class quizzes");
    } finally {
      setLoading(false);
    }
  }, [classId, courseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAssignQuiz = async () => {
    if (!selectedQuizId) {
      toast.error("Please select an existing published quiz");
      return;
    }
    setAssigning(true);
    try {
      await createClassQuizAssignment(classId, {
        quizId: selectedQuizId,
        lessonId: selectedLessonId === "NONE" ? null : selectedLessonId,
        displayTitle: displayTitleEn.trim()
          ? {
              en: displayTitleEn.trim(),
              si: displayTitleEn.trim(),
              ta: displayTitleEn.trim(),
            }
          : null,
        availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      });
      toast.success("Quiz assigned to class");
      setSelectedQuizId("");
      setSelectedLessonId("NONE");
      setDisplayTitleEn("");
      setAvailableFrom("");
      setDueAt("");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign quiz");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await deleteClassQuizAssignment(classId, assignmentId);
      toast.success("Quiz assignment removed");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove assignment");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-5" />
        <span className="text-muted-foreground text-sm">Loading assigned quizzes…</span>
      </div>
    );
  }

  const allLessons = (learning?.modules ?? []).flatMap((m) => m.lessons);
  const assignments = learning?.quizAssignments ?? [];

  return (
    <div className="space-y-6">
      {!isArchived ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" />
              {t("classes.quizzes.assignQuiz")}
            </CardTitle>
            <CardDescription>{t("classes.quizzes.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("classes.quizzes.selectQuiz")}</FieldLabel>
                <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("classes.quizzes.selectQuiz")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuizzes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {localize(q.title, locale) || "Untitled Quiz"} ({q.durationMinutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>{t("classes.quizzes.attachToLesson")}</FieldLabel>
                <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t("classes.quizzes.batchLevel")}</SelectItem>
                    {allLessons.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {localize(l.title, locale) || "Lesson"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t("classes.quizzes.displayTitle")}</FieldLabel>
                <Input
                  value={displayTitleEn}
                  onChange={(e) => setDisplayTitleEn(e.target.value)}
                  placeholder="Optional custom title..."
                />
              </Field>
              <Field>
                <FieldLabel>{t("classes.quizzes.availableFrom")}</FieldLabel>
                <Input
                  type="datetime-local"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>{t("classes.quizzes.dueAt")}</FieldLabel>
                <Input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex justify-end pt-1">
              <Button size="sm" disabled={assigning} onClick={handleAssignQuiz}>
                <Plus className="mr-1.5 size-4" />
                {t("classes.quizzes.assignQuiz")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("classes.quizzes.title")} ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              {t("classes.quizzes.noAssignments")}
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((qa) => {
                const titleText = localize(qa.displayTitle, locale) || "Assigned Quiz";
                return (
                  <div
                    key={qa.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{titleText}</span>
                        <Badge
                          variant={
                            qa.availabilityState === "OPEN"
                              ? "default"
                              : qa.availabilityState === "UPCOMING"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {qa.availabilityState === "OPEN"
                            ? t("classes.quizzes.statusOpen")
                            : qa.availabilityState === "UPCOMING"
                              ? t("classes.quizzes.statusUpcoming")
                              : t("classes.quizzes.statusPastDue")}
                        </Badge>
                        {qa.quiz ? (
                          <Badge variant="outline">
                            {qa.quiz.durationMinutes} min · Pass {qa.quiz.passingScorePercentage}%
                          </Badge>
                        ) : null}
                      </div>
                      <p className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                        {qa.availableFrom ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3" />
                            From: {new Date(qa.availableFrom).toLocaleString()}
                          </span>
                        ) : null}
                        {qa.dueAt ? (
                          <span>Due: {new Date(qa.dueAt).toLocaleString()}</span>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/quiz/${qa.quizId}`} target="_blank">
                          <ExternalLink className="mr-1.5 size-3.5" />
                          Preview Quiz
                        </Link>
                      </Button>
                      {!isArchived ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleRemoveAssignment(qa.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
