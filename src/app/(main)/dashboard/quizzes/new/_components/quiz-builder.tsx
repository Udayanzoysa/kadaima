"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/hooks/use-i18n";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { LOCALES } from "@/lib/i18n";
import {
  type AnswerChoiceForm,
  type BankQuestion,
  type Course,
  type LocalizedText,
  type QuestionForm,
  type QuizFormState,
  emptyLocalizedText,
  initialQuizFormState,
  localize,
  mediaUrl,
} from "@/types/quiz";

function plainTextFromHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type ContentLang = "en" | "si" | "ta";

function newId() {
  return crypto.randomUUID();
}

function createChoice(): AnswerChoiceForm {
  return { id: newId(), choiceText: emptyLocalizedText(), isCorrect: false };
}

function createQuestion(sortOrder: number): QuestionForm {
  return {
    id: newId(),
    questionText: emptyLocalizedText(),
    points: 1,
    sortOrder,
    choices: [createChoice(), createChoice()],
  };
}

interface QuizBuilderProps {
  quizId?: string;
}

export function QuizBuilder({ quizId }: QuizBuilderProps) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const isEdit = Boolean(quizId);
  const [activeLang, setActiveLang] = useState<ContentLang>("en");
  const [quizDetails, setQuizDetails] = useState<QuizFormState>(initialQuizFormState());
  const [courses, setCourses] = useState<Course[]>([]);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [attached, setAttached] = useState<BankQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(isEdit);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${APP_CONFIG.apiUrl}/quizzes/courses`, { headers }).then((res) =>
        res.ok ? res.json() : [],
      ),
      fetch(`${APP_CONFIG.apiUrl}/questions?status=Published`, { headers }).then((res) =>
        res.ok ? res.json() : [],
      ),
    ])
      .then(([courseData, questionData]: [Course[], BankQuestion[]]) => {
        setCourses(courseData);
        setBankQuestions(questionData);
      })
      .catch(() => {
        setCourses([]);
        setBankQuestions([]);
      })
      .finally(() => setLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!quizId) return;
    const token = getClientCookie("session_token");
    if (!token) return;

    fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load quiz");
        const data = await res.json();
        setQuizDetails({
          title: data.title,
          description: data.description ?? emptyLocalizedText(),
          coverImageUrl: data.coverImageUrl ?? null,
          courseId: data.courseId ?? data.course?.id ?? "",
          durationMinutes: data.durationMinutes,
          passingScorePercentage: data.passingScorePercentage,
          status: data.status,
          shuffleQuestions: Boolean(data.shuffleQuestions),
          questions: [],
          attachedQuestionIds: (data.questions ?? []).map((q: { id: string }) => q.id),
        });
        setAttached(
          (data.questions ?? []).map((q: BankQuestion & { sortOrder?: number }) => ({
            id: q.id,
            questionText: q.questionText,
            type: q.type,
            points: q.points,
            status: q.status ?? "Published",
            choices: q.choices,
          })),
        );
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoadingQuiz(false));
  }, [quizId]);

  const handleTextChange = (field: "title" | "description", val: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      [field]: { ...prev[field], [activeLang]: val },
    }));
  };

  const handleCoverUpload = async (file: File) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/upload-cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("No image URL returned");
      setQuizDetails((prev) => ({ ...prev, coverImageUrl: data.url! }));
      toast.success("Preview image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const coverPreview = mediaUrl(quizDetails.coverImageUrl, APP_CONFIG.apiUrl);

  const handleQuestionTextChange = (questionId: string, val: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? { ...q, questionText: { ...q.questionText, [activeLang]: val } }
          : q,
      ),
    }));
  };

  const handleChoiceTextChange = (questionId: string, choiceId: string, val: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              choices: q.choices.map((c) =>
                c.id === choiceId
                  ? { ...c, choiceText: { ...c.choiceText, [activeLang]: val } }
                  : c,
              ),
            }
          : q,
      ),
    }));
  };

  const addQuestion = () => {
    setQuizDetails((prev) => ({
      ...prev,
      questions: [...prev.questions, createQuestion(prev.questions.length)],
    }));
  };

  const removeQuestion = (questionId: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      questions: prev.questions
        .filter((q) => q.id !== questionId)
        .map((q, i) => ({ ...q, sortOrder: i })),
    }));
  };

  const addChoice = (questionId: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, choices: [...q.choices, createChoice()] } : q,
      ),
    }));
  };

  const removeChoice = (questionId: string, choiceId: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? { ...q, choices: q.choices.filter((c) => c.id !== choiceId) }
          : q,
      ),
    }));
  };

  const setCorrectChoice = (questionId: string, choiceId: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              choices: q.choices.map((c) => ({ ...c, isCorrect: c.id === choiceId })),
            }
          : q,
      ),
    }));
  };

  const attachFromBank = (questionId: string) => {
    if (attached.some((q) => q.id === questionId)) return;
    const found = bankQuestions.find((q) => q.id === questionId);
    if (!found) return;
    setAttached((prev) => [...prev, found]);
  };

  const detachQuestion = (questionId: string) => {
    setAttached((prev) => prev.filter((q) => q.id !== questionId));
  };

  const validate = useCallback((): string | null => {
    if (quizDetails.title.en.trim().length < 3) return t("quiz.validation.titleRequired");
    if (plainTextFromHtml(quizDetails.description.en).length < 10) {
      return t("quiz.validation.descriptionRequired");
    }
    if (!quizDetails.courseId) return t("quiz.validation.courseRequired");
    if (quizDetails.durationMinutes < 5) return t("quiz.validation.durationMin");
    if (quizDetails.passingScorePercentage < 1 || quizDetails.passingScorePercentage > 100) {
      return t("quiz.validation.passingScoreRange");
    }
    const totalQuestions = quizDetails.questions.length + attached.length;
    if (totalQuestions === 0) return t("quiz.validation.questionRequired");

    for (const q of quizDetails.questions) {
      if (q.choices.length < 2) return t("quiz.validation.choiceRequired");
      if (!q.choices.some((c) => c.isCorrect)) return t("quiz.validation.correctRequired");
    }
    return null;
  }, [quizDetails, attached, t]);

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const token = getClientCookie("session_token");
    if (!token) return;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    setIsSubmitting(true);
    try {
      if (isEdit && quizId) {
        // Create any new inline questions in the bank first, then attach all IDs.
        const createdIds: string[] = [];
        for (const q of quizDetails.questions) {
          const res = await fetch(`${APP_CONFIG.apiUrl}/questions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              questionText: q.questionText,
              points: q.points,
              status: quizDetails.status === "Published" ? "Published" : "Draft",
              choices: q.choices.map((c) => ({
                choiceText: c.choiceText,
                isCorrect: c.isCorrect,
              })),
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to create question");
          }
          const created = await res.json();
          createdIds.push(created.id);
        }

        const questionIds = [...attached.map((q) => q.id), ...createdIds];
        const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            courseId: quizDetails.courseId,
            title: quizDetails.title,
            description: quizDetails.description,
            coverImageUrl: quizDetails.coverImageUrl,
            durationMinutes: quizDetails.durationMinutes,
            passingScorePercentage: quizDetails.passingScorePercentage,
            status: quizDetails.status,
            shuffleQuestions: quizDetails.shuffleQuestions,
            questionIds,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Update failed");
        }
        toast.success("Quiz updated");
        router.push("/admin/quizzes/manage");
        return;
      }

      const payload = {
        courseId: quizDetails.courseId,
        title: quizDetails.title,
        description: quizDetails.description,
        coverImageUrl: quizDetails.coverImageUrl,
        durationMinutes: quizDetails.durationMinutes,
        passingScorePercentage: quizDetails.passingScorePercentage,
        status: quizDetails.status,
        shuffleQuestions: quizDetails.shuffleQuestions,
        questionIds: attached.map((q) => q.id),
        questions: quizDetails.questions.map((q) => ({
          questionText: q.questionText,
          sortOrder: q.sortOrder,
          points: q.points,
          choices: q.choices.map((c) => ({
            choiceText: c.choiceText,
            isCorrect: c.isCorrect,
          })),
        })),
      };

      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("quiz.createError"));
      }

      toast.success(t("quiz.createSuccess"), {
        description: quizDetails.title.en,
      });
      router.push("/admin/quizzes/manage");
    } catch (err) {
      toast.error(isEdit ? "Update failed" : t("quiz.createError"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const langLabel = (lang: ContentLang) => {
    if (lang === "en") return t("quiz.english");
    if (lang === "si") return t("quiz.sinhala");
    return t("quiz.tamil");
  };

  const availableBank = bankQuestions.filter((q) => !attached.some((a) => a.id === q.id));

  if (loadingQuiz) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading quiz…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
          {isEdit ? "Edit Quiz" : t("quiz.addQuiz")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isEdit
            ? "Update quiz details, shuffle, and attached bank questions."
            : t("quiz.addQuizDescription")}
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t("quiz.quizDetails")}</CardTitle>
          <CardDescription>{t("quiz.quizDetailsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <Button
                key={l.code}
                type="button"
                size="sm"
                variant={locale === l.code ? "default" : "outline"}
                onClick={() => setLocale(l.code)}
              >
                {l.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(["en", "si", "ta"] as const).map((lang) => (
              <Button
                key={lang}
                type="button"
                size="sm"
                variant={activeLang === lang ? "default" : "outline"}
                onClick={() => setActiveLang(lang)}
              >
                {langLabel(lang)}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>
                {t("quiz.quizTitle")} ({activeLang.toUpperCase()})
              </FieldLabel>
              <Input
                value={quizDetails.title[activeLang]}
                onChange={(e) => handleTextChange("title", e.target.value)}
                placeholder={t("quiz.titlePlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel>{t("quiz.course")}</FieldLabel>
              <Select
                value={quizDetails.courseId}
                onValueChange={(val) => setQuizDetails((prev) => ({ ...prev, courseId: val }))}
                disabled={loadingCourses}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("quiz.selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>
              {t("quiz.description")} ({activeLang.toUpperCase()})
            </FieldLabel>
            <RichTextEditor
              key={`desc-${activeLang}-${quizId ?? "new"}`}
              value={quizDetails.description[activeLang]}
              onChange={(html) => handleTextChange("description", html)}
              placeholder={t("quiz.descriptionPlaceholder")}
              minHeightClass="min-h-[160px]"
            />
            <FieldDescription>Shown on the public quiz intro page.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Preview image (public hero)</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                <ImagePlus className="size-4" />
                {uploadingCover ? "Uploading…" : "Upload preview image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCover}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                  }}
                />
              </label>
              {quizDetails.coverImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setQuizDetails((prev) => ({ ...prev, coverImageUrl: null }))
                  }
                >
                  Remove
                </Button>
              )}
            </div>
            {coverPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt="Quiz preview"
                className="mt-2 max-h-48 w-full max-w-md rounded-lg border object-cover"
              />
            )}
            <FieldDescription>
              Shown on the right side of the public home hero carousel.
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>{t("quiz.duration")}</FieldLabel>
              <Input
                type="number"
                min={5}
                value={quizDetails.durationMinutes}
                onChange={(e) =>
                  setQuizDetails((prev) => ({
                    ...prev,
                    durationMinutes: Number(e.target.value),
                  }))
                }
              />
              <FieldDescription>{t("quiz.durationHint")}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>{t("quiz.passingScore")}</FieldLabel>
              <Input
                type="number"
                min={1}
                max={100}
                value={quizDetails.passingScorePercentage}
                onChange={(e) =>
                  setQuizDetails((prev) => ({
                    ...prev,
                    passingScorePercentage: Number(e.target.value),
                  }))
                }
              />
              <FieldDescription>{t("quiz.passingScoreHint")}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>{t("quiz.status")}</FieldLabel>
              <Select
                value={quizDetails.status}
                onValueChange={(val: QuizFormState["status"]) =>
                  setQuizDetails((prev) => ({ ...prev, status: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">{t("quiz.draft")}</SelectItem>
                  <SelectItem value="Published">Public</SelectItem>
                  <SelectItem value="Archived">{t("quiz.archived")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={quizDetails.shuffleQuestions}
              onCheckedChange={(checked) =>
                setQuizDetails((prev) => ({
                  ...prev,
                  shuffleQuestions: checked === true,
                }))
              }
            />
            Shuffle question order for each attempt
          </label>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Attached bank questions</CardTitle>
          <CardDescription>
            Reuse questions from the bank. One question can belong to many quizzes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {attached.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bank questions attached yet.</p>
          ) : (
            <ul className="space-y-2">
              {attached.map((q, index) => (
                <li
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm">
                    <span className="text-muted-foreground">#{index + 1}</span>{" "}
                    {localize(q.questionText as LocalizedText, "en")}
                  </span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => detachQuestion(q.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {availableBank.length > 0 && (
            <Select onValueChange={(val) => attachFromBank(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Attach from question bank…" />
              </SelectTrigger>
              <SelectContent>
                {availableBank.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {localize(q.questionText, "en")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{isEdit ? "New questions to add" : t("quiz.questions")}</CardTitle>
            <CardDescription>
              {isEdit
                ? "These are created in the bank and attached when you save."
                : "Inline questions are saved to the bank and linked to this quiz."}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="size-4" />
            {t("quiz.addQuestion")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {quizDetails.questions.length === 0 && attached.length === 0 && (
            <p className="text-muted-foreground text-sm">{t("quiz.validation.questionRequired")}</p>
          )}

          {quizDetails.questions.map((question, qIndex) => (
            <div key={question.id} className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {t("quiz.questionText")} #{qIndex + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(question.id)}
                >
                  <Trash2 className="size-4" />
                  {t("quiz.removeQuestion")}
                </Button>
              </div>

              <Input
                value={question.questionText[activeLang]}
                onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                placeholder={t("quiz.questionPlaceholder")}
              />

              <div className="space-y-2">
                <span className="font-medium text-sm">{t("quiz.answerChoices")}</span>
                {question.choices.map((choice) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={choice.isCorrect}
                      onCheckedChange={() => setCorrectChoice(question.id, choice.id)}
                    />
                    <Input
                      className="flex-1"
                      value={choice.choiceText[activeLang]}
                      onChange={(e) =>
                        handleChoiceTextChange(question.id, choice.id, e.target.value)
                      }
                      placeholder={t("quiz.choicePlaceholder")}
                    />
                    <span className="text-muted-foreground text-xs">{t("quiz.correct")}</span>
                    {question.choices.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChoice(question.id, choice.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addChoice(question.id)}
                >
                  <Plus className="size-4" />
                  {t("quiz.addChoice")}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/quizzes/manage")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="size-4" />
              {isEdit ? "Saving…" : t("quiz.creating")}
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            t("quiz.createQuiz")
          )}
        </Button>
      </div>
    </div>
  );
}
