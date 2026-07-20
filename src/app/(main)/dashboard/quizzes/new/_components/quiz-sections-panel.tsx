"use client";

import { FileText, Plus, Trash2 } from "lucide-react";

import { createEmptyQuestion, InlineQuestionFields } from "@/components/quiz/inline-question-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  type BankQuestion,
  createEmptySection,
  type LocalizedText,
  localize,
  type QuestionForm,
  type QuizSectionForm,
  type SupportedLocale,
} from "@/types/quiz";

import { AttachFromBankModal } from "./attach-from-bank-modal";

type Props = {
  sections: QuizSectionForm[];
  /** Active editing language tab. */
  contentLang: SupportedLocale;
  /** All languages required for this quiz. */
  languages: SupportedLocale[];
  langLabel: string;
  uploadingQuestionId: string | null;
  onChange: (sections: QuizSectionForm[]) => void;
  onUploadImage: (sectionId: string, questionId: string, file: File) => void;
};

function sectionQuestionCount(section: QuizSectionForm) {
  return section.attached.length + section.questions.length;
}

export function QuizSectionsPanel({
  sections,
  contentLang,
  languages,
  langLabel,
  uploadingQuestionId,
  onChange,
  onUploadImage,
}: Props) {
  const allExcludeIds = sections.flatMap((s) => [...s.attached.map((q) => q.id), ...s.questions.map((q) => q.id)]);

  let globalIndex = 0;

  const updateSection = (sectionId: string, patch: Partial<QuizSectionForm>) => {
    onChange(sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  };

  const addSection = () => {
    onChange([...sections, createEmptySection(sections.length)]);
  };

  const removeSection = (sectionId: string) => {
    onChange(sections.filter((s) => s.id !== sectionId));
  };

  const attachToSection = (sectionId: string, questions: BankQuestion[]) => {
    onChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        const existing = new Set(s.attached.map((q) => q.id));
        const next = [...s.attached];
        for (const q of questions) {
          if (!existing.has(q.id)) next.push(q);
        }
        return { ...s, attached: next };
      }),
    );
  };

  const detachFromSection = (sectionId: string, questionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      attached: section.attached.filter((q) => q.id !== questionId),
    });
  };

  const addInlineQuestion = (sectionId: string) => {
    onChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        const index = s.attached.length + s.questions.length;
        return { ...s, questions: [...s.questions, createEmptyQuestion(index)] };
      }),
    );
  };

  const removeInlineQuestion = (sectionId: string, questionId: string) => {
    onChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.filter((q) => q.id !== questionId).map((q, i) => ({ ...q, sortOrder: i })),
        };
      }),
    );
  };

  const updateInlineQuestion = (sectionId: string, questionId: string, next: QuestionForm) => {
    onChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.map((q) => (q.id === questionId ? next : q)),
        };
      }),
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Instruction blocks</CardTitle>
            <CardDescription>
              Group questions under a shared instruction or reading passage (e.g. comprehension). Students see the
              instruction above that section&apos;s questions.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addSection}>
            <Plus className="size-4" />
            Add instruction block
          </Button>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No instruction blocks yet. Add a block, write the instruction, then attach or create questions under it.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {sections.map((section, sectionIndex) => {
        const instructionValue = localize(section.instruction, contentLang);
        const startIndex = globalIndex;

        return (
          <Card key={section.id} className="border-border border-l-4 border-l-[#1563b8]">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 size-5 shrink-0 text-[#1563b8]" />
                <div>
                  <CardTitle className="text-base">Section {sectionIndex + 1}</CardTitle>
                  <CardDescription>
                    {sectionQuestionCount(section)} question
                    {sectionQuestionCount(section) === 1 ? "" : "s"}
                    {sectionQuestionCount(section) > 0
                      ? ` · Q${startIndex + 1}–Q${startIndex + sectionQuestionCount(section)}`
                      : ""}
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeSection(section.id)}
              >
                <Trash2 className="size-4" />
                Remove section
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field>
                <FieldLabel>Instruction / passage ({langLabel})</FieldLabel>
                <Textarea
                  rows={4}
                  placeholder="e.g. Read the following paragraph and answer the questions…"
                  value={instructionValue}
                  onChange={(e) =>
                    updateSection(section.id, {
                      instruction: {
                        ...section.instruction,
                        [contentLang]: e.target.value,
                      },
                    })
                  }
                />
                <FieldDescription>Shown above this section&apos;s questions on the student quiz page.</FieldDescription>
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <AttachFromBankModal
                  excludeIds={allExcludeIds}
                  languages={languages}
                  onAttach={(qs) => attachToSection(section.id, qs)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addInlineQuestion(section.id)}>
                  <Plus className="size-4" />
                  Add question
                </Button>
              </div>

              {sectionQuestionCount(section) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No questions in this section yet. Attach from the bank or add a new question.
                </p>
              ) : null}

              <ul className="space-y-2">
                {section.attached.map((q) => {
                  globalIndex += 1;
                  const n = globalIndex;
                  return (
                    <li
                      key={q.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                    >
                      <div className="min-w-0 space-y-0.5 text-sm">
                        <div>
                          <span className="text-muted-foreground">Q{n}</span>{" "}
                          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            Bank
                          </span>{" "}
                          <span className="font-medium">{localize(q.questionText as LocalizedText, contentLang)}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => detachFromSection(section.id, q.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>

              {section.questions.map((question) => {
                globalIndex += 1;
                const n = globalIndex;
                return (
                  <div key={question.id} className="space-y-4 rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Q{n} · New question</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInlineQuestion(section.id, question.id)}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                    <InlineQuestionFields
                      question={question}
                      activeLang={contentLang}
                      uploading={uploadingQuestionId === question.id}
                      onChange={(next) => updateInlineQuestion(section.id, question.id, next)}
                      onUploadImage={(file) => onUploadImage(section.id, question.id, file)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {sections.length > 0 ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={addSection}>
            <Plus className="size-4" />
            Add another instruction block
          </Button>
        </div>
      ) : null}
    </div>
  );
}
