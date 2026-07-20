"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import {
  toBankQuestionPayload,
  validateInlineQuestion,
} from "@/components/quiz/inline-question-fields";
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
import { hideGlobalLoader, showGlobalLoader } from "@/stores/global-loader-store";
import {
  type BankQuestion,
  type Course,
  type CourseModule,
  type LocalizedText,
  type QuizFormState,
  type QuizSectionForm,
  type SupportedLocale,
  createEmptySection,
  emptyLocalizedText,
  hasAllLocaleContent,
  hasLocaleContent,
  initialQuizFormState,
  localize,
  mediaUrl,
  multiLocalizedText,
  normalizeQuizLanguages,
  resolveQuizLanguage,
} from "@/types/quiz";

import { QuizSectionsPanel } from "./quiz-sections-panel";

function plainTextFromHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const QUIZ_DRAFT_COVER_KEY = "quiz-draft-cover";

function readDraftCover(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(QUIZ_DRAFT_COVER_KEY);
  } catch {
    return null;
  }
}

function writeDraftCover(url: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (url) sessionStorage.setItem(QUIZ_DRAFT_COVER_KEY, url);
    else sessionStorage.removeItem(QUIZ_DRAFT_COVER_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

interface QuizBuilderProps {
  quizId?: string;
}

export function QuizBuilder({ quizId }: QuizBuilderProps) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const isEdit = Boolean(quizId);
  const [quizDetails, setQuizDetails] = useState<QuizFormState>(initialQuizFormState());
  const contentLang = quizDetails.language;
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(isEdit);
  const [paymentMode, setPaymentMode] = useState<"MIXED" | "MONTHLY_ONLY" | "QUIZ_ONLY">("MIXED");

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${APP_CONFIG.apiUrl}/quizzes/courses`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((courseData: Course[]) => setCourses(courseData))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false));

    fetch(`${APP_CONFIG.apiUrl}/public/billing/monthly-fee`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const mode = String(data?.paymentMode || "MIXED").toUpperCase();
        if (mode === "MONTHLY_ONLY" || mode === "QUIZ_ONLY" || mode === "MIXED") {
          setPaymentMode(mode);
        }
      })
      .catch(() => undefined);
  }, []);

  // Load modules for selected course
  useEffect(() => {
    if (!quizDetails.courseId) {
      setModules([]);
      return;
    }
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoadingModules(true);
    fetch(`${APP_CONFIG.apiUrl}/courses/${quizDetails.courseId}/modules`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CourseModule[]) => setModules(Array.isArray(data) ? data : []))
      .catch(() => setModules([]))
      .finally(() => setLoadingModules(false));
  }, [quizDetails.courseId]);

  // Restore draft cover on Add Quiz (survives refresh before Create).
  useEffect(() => {
    if (isEdit) return;
    const draft = readDraftCover();
    if (!draft) return;
    setQuizDetails((prev) =>
      prev.coverImageUrl ? prev : { ...prev, coverImageUrl: draft },
    );
  }, [isEdit]);

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
        const languages = normalizeQuizLanguages(data.languages, data.language);
        const language = resolveQuizLanguage(data.title, data.language, data.languages);
        const toBank = (q: BankQuestion & { sortOrder?: number }): BankQuestion => ({
          id: q.id,
          questionText: q.questionText,
          type: q.type,
          points: q.points,
          status: q.status ?? "Published",
          imageUrl: q.imageUrl,
          config: q.config,
          choices: q.choices,
        });

        const apiSections = Array.isArray(data.sections) ? data.sections : [];
        let sections: QuizSectionForm[];
        if (apiSections.length > 0) {
          sections = apiSections.map(
            (
              s: {
                id: string;
                instruction?: LocalizedText;
                questions?: Array<BankQuestion & { sortOrder?: number }>;
              },
              index: number,
            ) => ({
              id: s.id || createEmptySection(index).id,
              instruction: s.instruction ?? emptyLocalizedText(),
              attached: (s.questions ?? []).map(toBank),
              questions: [],
            }),
          );
        } else {
          const flat = (data.questions ?? []) as Array<BankQuestion & { sortOrder?: number }>;
          sections =
            flat.length > 0
              ? [
                  {
                    ...createEmptySection(0),
                    instruction: {
                      ...emptyLocalizedText(),
                      [language]: "Questions",
                    },
                    attached: flat.map(toBank),
                    questions: [],
                  },
                ]
              : [];
        }

        setQuizDetails({
          languages,
          language,
          title: data.title,
          description: data.description ?? emptyLocalizedText(),
          coverImageUrl: data.coverImageUrl ?? null,
          courseId: data.courseId ?? data.course?.id ?? "",
          moduleId: data.moduleId ?? data.module?.id ?? "",
          durationMinutes: data.durationMinutes,
          passingScorePercentage: data.passingScorePercentage,
          maxAttempts: data.maxAttempts ?? 1,
          status: data.status,
          shuffleQuestions: Boolean(data.shuffleQuestions),
          requiresUnlock: Boolean(data.requiresUnlock),
          priceLkr: data.priceLkr != null ? Number(data.priceLkr) : null,
          sections,
          questions: [],
          attachedQuestionIds: sections.flatMap((s) => s.attached.map((q) => q.id)),
        });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoadingQuiz(false));
  }, [quizId]);

  const handleTextChange = (field: "title" | "description", val: string) => {
    setQuizDetails((prev) => ({
      ...prev,
      [field]: { ...prev[field], [prev.language]: val },
    }));
  };

  /** Toggle a quiz content language on/off (multi-select). */
  const handleLanguageToggle = (lang: SupportedLocale) => {
    setQuizDetails((prev) => {
      const has = prev.languages.includes(lang);
      if (has && prev.languages.length === 1) {
        toast.error("Select at least one quiz language.");
        return prev;
      }

      const languages = has
        ? prev.languages.filter((l) => l !== lang)
        : normalizeQuizLanguages([...prev.languages, lang]);
      const language = languages.includes(prev.language) ? prev.language : languages[0];

      let removedBank = 0;
      const sections = prev.sections.map((section) => {
        const keptAttached = section.attached.filter((q) =>
          hasAllLocaleContent(q.questionText as LocalizedText, languages, 3),
        );
        removedBank += section.attached.length - keptAttached.length;
        return {
          ...section,
          instruction: multiLocalizedText(section.instruction, languages),
          attached: keptAttached,
          questions: section.questions.map((q) => ({
            ...q,
            questionText: multiLocalizedText(q.questionText, languages),
            choices: q.choices.map((c) => ({
              ...c,
              choiceText: multiLocalizedText(c.choiceText, languages),
            })),
          })),
        };
      });

      if (removedBank > 0) {
        const list = languages.map((l) => l.toUpperCase()).join(" + ");
        toast.message(
          `Removed ${removedBank} bank question${removedBank === 1 ? "" : "s"} missing ${list} text.`,
        );
      }

      return {
        ...prev,
        languages,
        language,
        title: multiLocalizedText(prev.title, languages),
        description: multiLocalizedText(prev.description, languages),
        sections,
        questions: [],
        attachedQuestionIds: sections.flatMap((s) => s.attached.map((q) => q.id)),
      };
    });
  };

  const persistCoverToQuiz = async (url: string | null, token: string) => {
    if (!quizId) return;
    const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ coverImageUrl: url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to save preview image");
    }
  };

  const handleCoverUpload = async (file: File) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setUploadingCover(true);
    showGlobalLoader(`Uploading “${file.name}”… don’t close this page`);
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
      const url = data.url;

      if (isEdit && quizId) {
        await persistCoverToQuiz(url, token);
        setQuizDetails((prev) => ({ ...prev, coverImageUrl: url }));
        toast.success("Preview image saved");
      } else {
        writeDraftCover(url);
        setQuizDetails((prev) => ({ ...prev, coverImageUrl: url }));
        toast.success("Preview image uploaded — click Create Quiz to keep it");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCover(false);
      hideGlobalLoader();
    }
  };

  const handleCoverRemove = async () => {
    const token = getClientCookie("session_token");
    setQuizDetails((prev) => ({ ...prev, coverImageUrl: null }));
    writeDraftCover(null);
    if (!isEdit || !quizId || !token) return;
    try {
      await persistCoverToQuiz(null, token);
      toast.success("Preview image removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove image");
    }
  };

  const coverPreview = mediaUrl(quizDetails.coverImageUrl, APP_CONFIG.apiUrl);

  const handleQuestionImageUpload = async (
    _sectionId: string,
    questionId: string,
    file: File,
  ) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setUploadingQuestionId(questionId);
    showGlobalLoader(`Uploading “${file.name}”… don’t close this page`);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("No image URL returned");
      setQuizDetails((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          questions: section.questions.map((q) =>
            q.id === questionId ? { ...q, imageUrl: data.url! } : q,
          ),
        })),
      }));
      toast.success("Question image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingQuestionId(null);
      hideGlobalLoader();
    }
  };

  const validate = useCallback((): string | null => {
    const langs = quizDetails.languages;
    if (!langs.length) return "Select at least one quiz language.";

    for (const lang of langs) {
      if (!hasLocaleContent(quizDetails.title, lang, 3)) {
        return `Quiz title is required in ${lang.toUpperCase()}.`;
      }
      if (plainTextFromHtml(quizDetails.description[lang] ?? "").length < 10) {
        return `Quiz description is required in ${lang.toUpperCase()} (min 10 characters).`;
      }
    }
    if (!quizDetails.courseId) return t("quiz.validation.courseRequired");
    if (quizDetails.durationMinutes < 5) return t("quiz.validation.durationMin");
    if (quizDetails.passingScorePercentage < 1 || quizDetails.passingScorePercentage > 100) {
      return t("quiz.validation.passingScoreRange");
    }
    if (quizDetails.maxAttempts < 1 || quizDetails.maxAttempts > 50) {
      return "Attempt count must be between 1 and 50.";
    }
    if (
      quizDetails.requiresUnlock &&
      paymentMode === "QUIZ_ONLY" &&
      (!quizDetails.priceLkr || quizDetails.priceLkr <= 0)
    ) {
      return "Per-quiz payment mode requires a Price (LKR) for locked quizzes.";
    }
    if (
      quizDetails.requiresUnlock &&
      quizDetails.priceLkr != null &&
      quizDetails.priceLkr <= 0
    ) {
      return "Price must be greater than 0, or leave it empty for monthly subscription unlock.";
    }

    if (quizDetails.sections.length === 0) {
      return "Add at least one instruction block with questions.";
    }

    let totalQuestions = 0;
    for (let i = 0; i < quizDetails.sections.length; i += 1) {
      const section = quizDetails.sections[i];
      for (const lang of langs) {
        if (!hasLocaleContent(section.instruction, lang, 1)) {
          return `Section ${i + 1}: add an instruction in ${lang.toUpperCase()}.`;
        }
      }
      const count = section.attached.length + section.questions.length;
      if (count === 0) {
        return `Section ${i + 1}: add at least one question.`;
      }
      totalQuestions += count;

      for (const q of section.attached) {
        if (!hasAllLocaleContent(q.questionText as LocalizedText, langs, 3)) {
          return `Section ${i + 1}: attached questions must include ${langs.map((l) => l.toUpperCase()).join(" + ")} text.`;
        }
      }
      for (const q of section.questions) {
        const qErr = validateInlineQuestion(q, langs);
        if (qErr) return `Section ${i + 1}: ${qErr}`;
      }
    }

    if (totalQuestions === 0) return t("quiz.validation.questionRequired");
    return null;
  }, [quizDetails, t, paymentMode]);

  const buildSectionsPayload = async (
    headers: Record<string, string>,
  ): Promise<Array<{ instruction: LocalizedText; questionIds: string[] }>> => {
    const status = quizDetails.status === "Published" ? "Published" : "Draft";
    const payload: Array<{ instruction: LocalizedText; questionIds: string[] }> = [];

    for (const section of quizDetails.sections) {
      const createdIds: string[] = [];
      for (const q of section.questions) {
        const res = await fetch(`${APP_CONFIG.apiUrl}/questions`, {
          method: "POST",
          headers,
          body: JSON.stringify(
            toBankQuestionPayload(q, status, quizDetails.languages),
          ),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            Array.isArray(err.message)
              ? err.message.join(", ")
              : err.message || "Failed to create question",
          );
        }
        const created = await res.json();
        createdIds.push(created.id);
      }

      payload.push({
        instruction: multiLocalizedText(section.instruction, quizDetails.languages),
        questionIds: [...section.attached.map((q) => q.id), ...createdIds],
      });
    }

    return payload;
  };

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
      const sections = await buildSectionsPayload(headers);
      if (sections.length === 0 || sections.every((s) => s.questionIds.length === 0)) {
        throw new Error(t("quiz.validation.questionRequired"));
      }

      const quizBody = {
        courseId: quizDetails.courseId,
        moduleId: quizDetails.moduleId || null,
        language: quizDetails.languages[0],
        languages: quizDetails.languages,
        title: multiLocalizedText(quizDetails.title, quizDetails.languages),
        description: multiLocalizedText(
          quizDetails.description,
          quizDetails.languages,
        ),
        coverImageUrl: quizDetails.coverImageUrl,
        durationMinutes: quizDetails.durationMinutes,
        passingScorePercentage: quizDetails.passingScorePercentage,
        maxAttempts: quizDetails.maxAttempts,
        status: quizDetails.status,
        shuffleQuestions: quizDetails.shuffleQuestions,
        requiresUnlock: quizDetails.requiresUnlock,
        priceLkr:
          quizDetails.requiresUnlock && paymentMode !== "MONTHLY_ONLY"
            ? quizDetails.priceLkr
            : null,
        sections,
      };

      if (isEdit && quizId) {
        const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(quizBody),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            Array.isArray(err.message) ? err.message.join(", ") : err.message || "Update failed",
          );
        }
        toast.success("Quiz updated");
        router.push("/admin/quizzes/manage");
        return;
      }

      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes`, {
        method: "POST",
        headers,
        body: JSON.stringify(quizBody),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("quiz.createError"));
      }

      toast.success(t("quiz.createSuccess"), {
        description: localize(quizDetails.title, quizDetails.language),
      });
      writeDraftCover(null);
      router.push("/admin/quizzes/manage");
    } catch (err) {
      toast.error(isEdit ? "Update failed" : t("quiz.createError"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const langLabel = (lang: SupportedLocale) => {
    if (lang === "en") return t("quiz.english");
    if (lang === "si") return t("quiz.sinhala");
    return t("quiz.tamil");
  };

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
          <p className="text-muted-foreground text-xs">{t("quiz.uiLanguageHint")}</p>

          <Field>
            <FieldLabel>{t("quiz.contentLanguage")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(["en", "si", "ta"] as const).map((lang) => {
                const selected = quizDetails.languages.includes(lang);
                return (
                  <Button
                    key={lang}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => handleLanguageToggle(lang)}
                  >
                    {langLabel(lang)}
                    {selected ? " ✓" : ""}
                  </Button>
                );
              })}
            </div>
            <FieldDescription>
              Select every language this quiz uses. Questions attached to it must
              include text in each selected language.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Editing language</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {quizDetails.languages.map((lang) => (
                <Button
                  key={lang}
                  type="button"
                  size="sm"
                  variant={contentLang === lang ? "default" : "outline"}
                  onClick={() =>
                    setQuizDetails((prev) => ({ ...prev, language: lang }))
                  }
                >
                  {langLabel(lang)}
                </Button>
              ))}
            </div>
            <FieldDescription>
              Switch tabs to fill title, description, and instructions for each
              selected language.
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>
                {t("quiz.quizTitle")} ({contentLang.toUpperCase()})
              </FieldLabel>
              <Input
                value={quizDetails.title[contentLang]}
                onChange={(e) => handleTextChange("title", e.target.value)}
                placeholder={t("quiz.titlePlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel>{t("quiz.course")}</FieldLabel>
              <Select
                value={quizDetails.courseId}
                onValueChange={(val) =>
                  setQuizDetails((prev) => ({ ...prev, courseId: val, moduleId: "" }))
                }
                disabled={loadingCourses}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("quiz.selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {localize(course.title, "en")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Module (optional)</FieldLabel>
              <Select
                value={quizDetails.moduleId || "__none__"}
                onValueChange={(val) =>
                  setQuizDetails((prev) => ({
                    ...prev,
                    moduleId: val === "__none__" ? "" : val,
                  }))
                }
                disabled={!quizDetails.courseId || loadingModules}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No module</SelectItem>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {localize(mod.title, "en")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Shown under the quiz title on the home page.</FieldDescription>
            </Field>
          </div>

          <Field>
            <FieldLabel>
              {t("quiz.description")} ({contentLang.toUpperCase()})
            </FieldLabel>
            <RichTextEditor
              key={`desc-${contentLang}-${quizId ?? "new"}`}
              value={quizDetails.description[contentLang]}
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
                  onClick={() => void handleCoverRemove()}
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
              {isEdit
                ? "Saved to this quiz as soon as you upload. Shown on the public home hero."
                : "Upload stores the file; click Create Quiz to keep it on the quiz. Shown on the public home hero."}
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <FieldLabel>Attempt count</FieldLabel>
              <Input
                type="number"
                min={1}
                max={50}
                value={quizDetails.maxAttempts}
                onChange={(e) =>
                  setQuizDetails((prev) => ({
                    ...prev,
                    maxAttempts: Number(e.target.value),
                  }))
                }
              />
              <FieldDescription>
                Total tries per student (e.g. 3 = three attempts).
              </FieldDescription>
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

          <div className="space-y-3 rounded-lg border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={quizDetails.requiresUnlock}
                onCheckedChange={(checked) =>
                  setQuizDetails((prev) => ({
                    ...prev,
                    requiresUnlock: checked === true,
                    priceLkr:
                      checked === true
                        ? paymentMode === "QUIZ_ONLY"
                          ? prev.priceLkr ?? 500
                          : null
                        : null,
                  }))
                }
              />
              Requires unlock (payment verification)
            </label>
            {quizDetails.requiresUnlock && (
              <>
                {paymentMode === "MONTHLY_ONLY" ? (
                  <p className="text-xs text-muted-foreground">
                    Platform mode is <span className="font-medium">monthly only</span>. Students
                    unlock this quiz with the monthly subscription (no separate quiz price).
                  </p>
                ) : (
                  <Field>
                    <FieldLabel>
                      {paymentMode === "QUIZ_ONLY"
                        ? "Price (LKR) — required"
                        : "Special price (LKR) — optional"}
                    </FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      step={0.01}
                      placeholder={
                        paymentMode === "QUIZ_ONLY" ? "e.g. 500" : "Leave empty for monthly unlock"
                      }
                      value={quizDetails.priceLkr ?? ""}
                      onChange={(e) =>
                        setQuizDetails((prev) => ({
                          ...prev,
                          priceLkr: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                    />
                    <FieldDescription>
                      {paymentMode === "QUIZ_ONLY"
                        ? "Students must pay this amount to unlock this quiz only."
                        : "Leave empty to unlock with the monthly subscription. Enter a price only if this quiz needs a separate payment beyond the monthly plan."}
                    </FieldDescription>
                  </Field>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <QuizSectionsPanel
        sections={quizDetails.sections}
        contentLang={contentLang}
        languages={quizDetails.languages}
        langLabel={langLabel(contentLang)}
        uploadingQuestionId={uploadingQuestionId}
        onChange={(sections) => setQuizDetails((prev) => ({ ...prev, sections }))}
        onUploadImage={(sectionId, questionId, file) =>
          void handleQuestionImageUpload(sectionId, questionId, file)
        }
      />

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
