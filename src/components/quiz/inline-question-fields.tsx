"use client";

import { useState } from "react";

import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import {
  QUESTION_TYPE_META,
  emptyLocalizedText,
  mediaUrl,
  type AnswerChoiceForm,
  type MatchMode,
  type QuestionConfig,
  type QuestionForm,
  type QuestionType,
  type SupportedLocale,
} from "@/types/quiz";

function newId() {
  return crypto.randomUUID();
}

export function createEmptyChoice(): AnswerChoiceForm {
  return {
    id: newId(),
    choiceText: emptyLocalizedText(),
    imageUrl: null,
    isCorrect: false,
  };
}

export function createEmptyQuestion(sortOrder: number): QuestionForm {
  return {
    id: newId(),
    questionText: emptyLocalizedText(),
    type: "MCQ",
    points: 1,
    sortOrder,
    imageUrl: null,
    config: { contentFormat: "plain" },
    choices: [createEmptyChoice(), createEmptyChoice()],
  };
}

/** Build API config payload from a QuestionForm (for bank POST). */
export function buildQuestionConfig(q: QuestionForm): QuestionConfig {
  const contentFormat = q.config?.contentFormat === "html" ? "html" : "plain";
  const config: QuestionConfig = { contentFormat };

  if (q.type === "SHORT_TEXT") {
    config.acceptedAnswers = (q.config?.acceptedAnswers ?? [])
      .map((s) => s.trim())
      .filter(Boolean);
    config.matchMode = q.config?.matchMode ?? "case_insensitive";
  }
  if (q.type === "NUMERIC") {
    config.correctNumber = q.config?.correctNumber;
    config.tolerance = q.config?.tolerance ?? 0;
    if (q.config?.min !== undefined) config.min = q.config.min;
    if (q.config?.max !== undefined) config.max = q.config.max;
  }
  if (q.type === "SEQUENCE") {
    config.correctOrder = q.choices.map((c) => c.id);
  }
  if (q.type === "ESSAY") {
    if (q.config?.minWords !== undefined) config.minWords = q.config.minWords;
    if (q.config?.minSentences !== undefined) config.minSentences = q.config.minSentences;
  }
  return config;
}

export function validateInlineQuestion(
  q: QuestionForm,
  languages: SupportedLocale | SupportedLocale[] = "en",
): string | null {
  const langs = Array.isArray(languages) ? languages : [languages];
  for (const language of langs) {
    const prompt = q.questionText[language]?.trim() ?? "";
    if (prompt.length < 3) {
      return `Question text is required in ${language.toUpperCase()}.`;
    }
  }
  if (q.type === "MCQ") {
    if (q.choices.length < 2) return "At least two choices are required.";
    if (!q.choices.some((c) => c.isCorrect)) return "Mark one correct answer.";
    for (const c of q.choices) {
      if (c.imageUrl) continue;
      for (const language of langs) {
        if (!(c.choiceText[language]?.trim())) {
          return `Each choice needs text in ${language.toUpperCase()} or an image.`;
        }
      }
    }
  }
  if (q.type === "SEQUENCE") {
    if (q.choices.length < 2) {
      return "Add at least two sequencing items (in the correct order).";
    }
    for (const c of q.choices) {
      if (c.imageUrl) continue;
      for (const language of langs) {
        if (!(c.choiceText[language]?.trim())) {
          return `Each sequencing item needs text in ${language.toUpperCase()} or an image.`;
        }
      }
    }
  }
  if (q.type === "SHORT_TEXT") {
    const answers = (q.config?.acceptedAnswers ?? []).map((s) => s.trim()).filter(Boolean);
    if (!answers.length) return "Add at least one accepted answer (one per line).";
  }
  if (q.type === "NUMERIC" && (q.config?.correctNumber === undefined || Number.isNaN(q.config.correctNumber))) {
    return "Set the correct numeric answer.";
  }
  return null;
}

export function toBankQuestionPayload(
  q: QuestionForm,
  status: "Draft" | "Published" | "Archived",
  languages: SupportedLocale | SupportedLocale[] = "en",
) {
  const langs = Array.isArray(languages) ? languages : [languages];
  const set = new Set(langs);
  const needsChoices = q.type === "MCQ" || q.type === "SEQUENCE";
  const scoped = (text: typeof q.questionText) => ({
    en: set.has("en") ? text.en : "",
    si: set.has("si") ? text.si : "",
    ta: set.has("ta") ? text.ta : "",
  });
  return {
    questionText: scoped(q.questionText),
    points: q.points,
    status,
    type: q.type,
    imageUrl: q.imageUrl,
    config: buildQuestionConfig(q),
    choices: needsChoices
      ? q.choices.map((c) => ({
          choiceText: scoped(c.choiceText),
          imageUrl: c.imageUrl ?? null,
          isCorrect: q.type === "MCQ" ? c.isCorrect : false,
        }))
      : [],
  };
}

type Props = {
  question: QuestionForm;
  activeLang: SupportedLocale;
  uploading?: boolean;
  onChange: (next: QuestionForm) => void;
  onUploadImage: (file: File) => void;
};

export function InlineQuestionFields({
  question,
  activeLang,
  uploading,
  onChange,
  onUploadImage,
}: Props) {
  const [uploadingChoiceId, setUploadingChoiceId] = useState<string | null>(null);
  const type = question.type;
  const contentFormat = question.config?.contentFormat === "html" ? "html" : "plain";
  const previewImg = mediaUrl(question.imageUrl, APP_CONFIG.apiUrl);

  const uploadChoiceImage = async (choiceId: string, file: File) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setUploadingChoiceId(choiceId);
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
      onChange({
        ...question,
        choices: question.choices.map((c) =>
          c.id === choiceId ? { ...c, imageUrl: data.url! } : c,
        ),
      });
      toast.success("Choice image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingChoiceId(null);
    }
  };
  const acceptedAnswersText = (question.config?.acceptedAnswers ?? []).join("\n");

  const patch = (partial: Partial<QuestionForm>) => onChange({ ...question, ...partial });
  const patchConfig = (partial: QuestionConfig) =>
    onChange({ ...question, config: { ...question.config, ...partial } });

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Question type</FieldLabel>
        <Select
          value={type}
          onValueChange={(val: QuestionType) => {
            const next: QuestionForm = { ...question, type: val };
            if ((val === "MCQ" || val === "SEQUENCE") && question.choices.length < 2) {
              next.choices = [createEmptyChoice(), createEmptyChoice()];
            }
            onChange(next);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(QUESTION_TYPE_META) as QuestionType[]).map((key) => (
              <SelectItem key={key} value={key}>
                {QUESTION_TYPE_META[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{QUESTION_TYPE_META[type].description}</p>
      </Field>

      <Field>
        <FieldLabel>Prompt format</FieldLabel>
        <Select
          value={contentFormat}
          onValueChange={(v: "plain" | "html") => patchConfig({ contentFormat: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">Plain text</SelectItem>
            <SelectItem value="html">HTML (tables / grids)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Question ({activeLang.toUpperCase()})</FieldLabel>
        <Textarea
          rows={contentFormat === "html" ? 6 : 3}
          value={question.questionText[activeLang]}
          onChange={(e) =>
            patch({
              questionText: { ...question.questionText, [activeLang]: e.target.value },
            })
          }
          placeholder={
            contentFormat === "html"
              ? "<p>Question…</p><table>…</table>"
              : "Enter question text"
          }
          className={contentFormat === "html" ? "font-mono text-xs" : undefined}
        />
      </Field>

      <Field>
        <FieldLabel>Prompt image (optional)</FieldLabel>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
            <ImagePlus className="size-4" />
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
              }}
            />
          </label>
          {question.imageUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => patch({ imageUrl: null })}>
              Remove
            </Button>
          )}
        </div>
        {previewImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewImg}
            alt="Prompt preview"
            className="mt-2 max-h-48 rounded-md border object-contain"
          />
        )}
      </Field>

      <Field>
        <FieldLabel>Points</FieldLabel>
        <Input
          type="number"
          min={1}
          className="w-32"
          value={question.points}
          onChange={(e) => patch({ points: Number(e.target.value) })}
        />
      </Field>

      {type === "SHORT_TEXT" && (
        <div className="space-y-3 rounded-lg border p-4">
          <Field>
            <FieldLabel>Accepted answers (one per line)</FieldLabel>
            <Textarea
              rows={4}
              value={acceptedAnswersText}
              onChange={(e) =>
                patchConfig({
                  acceptedAnswers: e.target.value.split("\n"),
                })
              }
              placeholder={"apple\nApple"}
            />
          </Field>
          <Field>
            <FieldLabel>Match mode</FieldLabel>
            <Select
              value={question.config?.matchMode ?? "case_insensitive"}
              onValueChange={(v: MatchMode) => patchConfig({ matchMode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="case_insensitive">Case-insensitive</SelectItem>
                <SelectItem value="exact">Exact</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {type === "NUMERIC" && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Correct number</FieldLabel>
            <Input
              type="number"
              step="any"
              value={question.config?.correctNumber ?? ""}
              onChange={(e) =>
                patchConfig({
                  correctNumber: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Tolerance (±)</FieldLabel>
            <Input
              type="number"
              step="any"
              value={question.config?.tolerance ?? 0}
              onChange={(e) => patchConfig({ tolerance: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field>
            <FieldLabel>Min (optional)</FieldLabel>
            <Input
              type="number"
              value={question.config?.min ?? ""}
              onChange={(e) =>
                patchConfig({ min: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Max (optional)</FieldLabel>
            <Input
              type="number"
              value={question.config?.max ?? ""}
              onChange={(e) =>
                patchConfig({ max: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </Field>
        </div>
      )}

      {type === "ESSAY" && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Min words (optional)</FieldLabel>
            <Input
              type="number"
              min={0}
              value={question.config?.minWords ?? ""}
              onChange={(e) =>
                patchConfig({
                  minWords: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Min sentences (optional)</FieldLabel>
            <Input
              type="number"
              min={0}
              value={question.config?.minSentences ?? ""}
              onChange={(e) =>
                patchConfig({
                  minSentences: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </Field>
          <p className="text-muted-foreground text-xs sm:col-span-2">
            Essays skip auto-grading and are flagged for instructor review.
          </p>
        </div>
      )}

      {(type === "MCQ" || type === "SEQUENCE") && (
        <div className="space-y-2">
          <span className="font-medium text-sm">
            {type === "SEQUENCE"
              ? "Items in the correct order (students will reorder them)"
              : "Answer choices"}
          </span>
          {question.choices.map((choice) => {
            const choiceImg = mediaUrl(choice.imageUrl, APP_CONFIG.apiUrl);
            return (
            <div key={choice.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
              {type === "MCQ" && (
                <Checkbox
                  checked={choice.isCorrect}
                  onCheckedChange={() =>
                    patch({
                      choices: question.choices.map((c) => ({
                        ...c,
                        isCorrect: c.id === choice.id,
                      })),
                    })
                  }
                />
              )}
              <Input
                className="flex-1"
                value={choice.choiceText[activeLang]}
                onChange={(e) =>
                  patch({
                    choices: question.choices.map((c) =>
                      c.id === choice.id
                        ? {
                            ...c,
                            choiceText: { ...c.choiceText, [activeLang]: e.target.value },
                          }
                        : c,
                    ),
                  })
                }
                placeholder={
                  type === "SEQUENCE"
                    ? "Label (optional if image)"
                    : "Choice text (optional if image)"
                }
              />
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1.5 text-xs hover:bg-muted/40">
                <ImagePlus className="size-3.5" />
                {uploadingChoiceId === choice.id ? "…" : "Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingChoiceId === choice.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadChoiceImage(choice.id, file);
                    e.target.value = "";
                  }}
                />
              </label>
              {question.choices.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    patch({
                      choices: question.choices.filter((c) => c.id !== choice.id),
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              </div>
              {choiceImg && (
                <div className="flex items-start gap-2 pl-7">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={choiceImg}
                    alt="Choice"
                    className="max-h-28 rounded-md border object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch({
                        choices: question.choices.map((c) =>
                          c.id === choice.id ? { ...c, imageUrl: null } : c,
                        ),
                      })
                    }
                  >
                    Remove image
                  </Button>
                </div>
              )}
            </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patch({ choices: [...question.choices, createEmptyChoice()] })}
          >
            <Plus className="size-4" />
            {type === "SEQUENCE" ? "Add item" : "Add choice"}
          </Button>
        </div>
      )}
    </div>
  );
}
