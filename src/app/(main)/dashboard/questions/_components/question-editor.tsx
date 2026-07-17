"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BulkImportQuestions } from "./bulk-import-questions";
import { AiImportPdfQuestions } from "./ai-import-pdf-questions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { hideGlobalLoader, showGlobalLoader } from "@/stores/global-loader-store";
import {
  QUESTION_TYPE_META,
  emptyLocalizedText,
  mediaUrl,
  type AnswerChoiceForm,
  type BankQuestion,
  type LocalizedText,
  type MatchMode,
  type QuestionConfig,
  type QuestionStatus,
  type QuestionType,
} from "@/types/quiz";

type ContentLang = "en" | "si" | "ta";

function newId() {
  return crypto.randomUUID();
}

function createChoice(): AnswerChoiceForm {
  return { id: newId(), choiceText: emptyLocalizedText(), isCorrect: false };
}

interface QuestionEditorProps {
  questionId?: string;
}

export function QuestionEditor({ questionId }: QuestionEditorProps) {
  const router = useRouter();
  const isEdit = Boolean(questionId);
  const [activeLang, setActiveLang] = useState<ContentLang>("en");
  const [questionText, setQuestionText] = useState<LocalizedText>(emptyLocalizedText());
  const [type, setType] = useState<QuestionType>("MCQ");
  const [points, setPoints] = useState(1);
  const [status, setStatus] = useState<QuestionStatus>("Draft");
  const [choices, setChoices] = useState<AnswerChoiceForm[]>([createChoice(), createChoice()]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [contentFormat, setContentFormat] = useState<"plain" | "html">("plain");
  const [acceptedAnswers, setAcceptedAnswers] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("case_insensitive");
  const [correctNumber, setCorrectNumber] = useState("");
  const [tolerance, setTolerance] = useState("0");
  const [numMin, setNumMin] = useState("");
  const [numMax, setNumMax] = useState("");
  const [minWords, setMinWords] = useState("");
  const [minSentences, setMinSentences] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    const token = getClientCookie("session_token");
    if (!token) return;

    fetch(`${APP_CONFIG.apiUrl}/questions/${questionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load question");
        const data: BankQuestion = await res.json();
        setQuestionText(data.questionText);
        setType(data.type);
        setPoints(data.points);
        setStatus(data.status);
        setImageUrl(data.imageUrl ?? null);
        setContentFormat(data.config?.contentFormat === "html" ? "html" : "plain");
        setAcceptedAnswers((data.config?.acceptedAnswers ?? []).join("\n"));
        setMatchMode(data.config?.matchMode ?? "case_insensitive");
        setCorrectNumber(
          data.config?.correctNumber !== undefined ? String(data.config.correctNumber) : "",
        );
        setTolerance(String(data.config?.tolerance ?? 0));
        setNumMin(data.config?.min !== undefined ? String(data.config.min) : "");
        setNumMax(data.config?.max !== undefined ? String(data.config.max) : "");
        setMinWords(data.config?.minWords !== undefined ? String(data.config.minWords) : "");
        setMinSentences(
          data.config?.minSentences !== undefined ? String(data.config.minSentences) : "",
        );
        setChoices(
          data.choices.length
            ? data.choices.map((c) => ({
                id: c.id,
                choiceText: c.choiceText,
                isCorrect: c.isCorrect,
              }))
            : [createChoice(), createChoice()],
        );
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [questionId]);

  const buildConfig = useCallback((): QuestionConfig => {
    const config: QuestionConfig = { contentFormat };
    if (type === "SHORT_TEXT") {
      config.acceptedAnswers = acceptedAnswers
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      config.matchMode = matchMode;
    }
    if (type === "NUMERIC") {
      config.correctNumber = Number(correctNumber);
      config.tolerance = Number(tolerance) || 0;
      if (numMin !== "") config.min = Number(numMin);
      if (numMax !== "") config.max = Number(numMax);
    }
    if (type === "SEQUENCE") {
      config.correctOrder = choices.map((c) => c.id);
    }
    if (type === "ESSAY") {
      if (minWords !== "") config.minWords = Number(minWords);
      if (minSentences !== "") config.minSentences = Number(minSentences);
    }
    return config;
  }, [
    type,
    contentFormat,
    acceptedAnswers,
    matchMode,
    correctNumber,
    tolerance,
    numMin,
    numMax,
    choices,
    minWords,
    minSentences,
  ]);

  const validate = useCallback((): string | null => {
    if (questionText.en.trim().length < 3) return "English question text is required.";
    if (type === "MCQ") {
      if (choices.length < 2) return "At least two choices are required.";
      if (!choices.some((c) => c.isCorrect)) return "Mark one correct answer.";
    }
    if (type === "SEQUENCE" && choices.length < 2) {
      return "Add at least two sequencing items (in the correct order).";
    }
    if (type === "SHORT_TEXT") {
      const answers = acceptedAnswers.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!answers.length) return "Add at least one accepted answer (one per line).";
    }
    if (type === "NUMERIC" && correctNumber === "") {
      return "Set the correct numeric answer.";
    }
    return null;
  }, [questionText, type, choices, acceptedAnswers, correctNumber]);

  const handleUpload = async (file: File) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setUploading(true);
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
      setImageUrl(data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      hideGlobalLoader();
    }
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    const token = getClientCookie("session_token");
    if (!token) return;

    setSaving(true);
    try {
      const needsChoices = type === "MCQ" || type === "SEQUENCE";
      const payload = {
        questionText,
        points,
        status,
        type,
        imageUrl,
        config: buildConfig(),
        choices: needsChoices
          ? choices.map((c) => ({
              choiceText: c.choiceText,
              isCorrect: type === "MCQ" ? c.isCorrect : false,
            }))
          : [],
      };

      const res = await fetch(
        isEdit ? `${APP_CONFIG.apiUrl}/questions/${questionId}` : `${APP_CONFIG.apiUrl}/questions`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(err.message) ? err.message.join(", ") : err.message || "Save failed",
        );
      }
      toast.success(isEdit ? "Question updated" : "Question created");
      router.push("/admin/questions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewImg = mediaUrl(imageUrl, APP_CONFIG.apiUrl);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
            {isEdit ? "Edit Question" : "Add Question"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Support MCQ (text / image / tables), fill-in-blank, numeric, sequencing, and essays.
          </p>
        </div>
        {!isEdit && (
          <div className="flex flex-wrap gap-2">
            <AiImportPdfQuestions
              variant="outline"
              onImported={() => router.push("/admin/questions")}
            />
            <BulkImportQuestions
              variant="outline"
              onImported={() => router.push("/admin/questions")}
            />
          </div>
        )}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Question details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>Question type</FieldLabel>
            <Select
              value={type}
              onValueChange={(val: QuestionType) => {
                setType(val);
                if ((val === "MCQ" || val === "SEQUENCE") && choices.length < 2) {
                  setChoices([createChoice(), createChoice()]);
                }
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

          <div className="flex flex-wrap gap-2">
            {(["en", "si", "ta"] as const).map((lang) => (
              <Button
                key={lang}
                type="button"
                size="sm"
                variant={activeLang === lang ? "default" : "outline"}
                onClick={() => setActiveLang(lang)}
              >
                {lang.toUpperCase()}
              </Button>
            ))}
          </div>

          <Field>
            <FieldLabel>Prompt format</FieldLabel>
            <Select
              value={contentFormat}
              onValueChange={(v: "plain" | "html") => setContentFormat(v)}
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
            {contentFormat === "html" ? (
              <Textarea
                rows={6}
                value={questionText[activeLang]}
                onChange={(e) =>
                  setQuestionText((prev) => ({ ...prev, [activeLang]: e.target.value }))
                }
                placeholder="<p>Question…</p><table>…</table>"
                className="font-mono text-xs"
              />
            ) : (
              <Textarea
                rows={3}
                value={questionText[activeLang]}
                onChange={(e) =>
                  setQuestionText((prev) => ({ ...prev, [activeLang]: e.target.value }))
                }
                placeholder="Enter question text"
              />
            )}
          </Field>

          <Field>
            <FieldLabel>Prompt image (optional — spatial / diagram MCQ)</FieldLabel>
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
                    if (file) void handleUpload(file);
                  }}
                />
              </label>
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Points</FieldLabel>
              <Input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onValueChange={(val: QuestionStatus) => setStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Public</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {type === "SHORT_TEXT" && (
            <div className="space-y-3 rounded-lg border p-4">
              <Field>
                <FieldLabel>Accepted answers (one per line)</FieldLabel>
                <Textarea
                  rows={4}
                  value={acceptedAnswers}
                  onChange={(e) => setAcceptedAnswers(e.target.value)}
                  placeholder={"apple\nApple\nആപ്പിൾ"}
                />
              </Field>
              <Field>
                <FieldLabel>Match mode</FieldLabel>
                <Select value={matchMode} onValueChange={(v: MatchMode) => setMatchMode(v)}>
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
                  value={correctNumber}
                  onChange={(e) => setCorrectNumber(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Tolerance (±)</FieldLabel>
                <Input
                  type="number"
                  step="any"
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Min (optional)</FieldLabel>
                <Input type="number" value={numMin} onChange={(e) => setNumMin(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Max (optional)</FieldLabel>
                <Input type="number" value={numMax} onChange={(e) => setNumMax(e.target.value)} />
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
                  value={minWords}
                  onChange={(e) => setMinWords(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Min sentences (optional)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={minSentences}
                  onChange={(e) => setMinSentences(e.target.value)}
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
              {choices.map((choice) => (
                <div key={choice.id} className="flex items-center gap-2">
                  {type === "MCQ" && (
                    <Checkbox
                      checked={choice.isCorrect}
                      onCheckedChange={() =>
                        setChoices((prev) =>
                          prev.map((c) => ({ ...c, isCorrect: c.id === choice.id })),
                        )
                      }
                    />
                  )}
                  <Input
                    className="flex-1"
                    value={choice.choiceText[activeLang]}
                    onChange={(e) =>
                      setChoices((prev) =>
                        prev.map((c) =>
                          c.id === choice.id
                            ? {
                                ...c,
                                choiceText: { ...c.choiceText, [activeLang]: e.target.value },
                              }
                            : c,
                        ),
                      )
                    }
                    placeholder={type === "SEQUENCE" ? "Sequence item" : "Choice text"}
                  />
                  {choices.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setChoices((prev) => prev.filter((c) => c.id !== choice.id))}
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
                onClick={() => setChoices((prev) => [...prev, createChoice()])}
              >
                <Plus className="size-4" />
                {type === "SEQUENCE" ? "Add item" : "Add choice"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/questions")}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Spinner className="size-4" /> : null}
          {isEdit ? "Save changes" : "Create question"}
        </Button>
      </div>
    </div>
  );
}
