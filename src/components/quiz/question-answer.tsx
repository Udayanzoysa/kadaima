"use client";

import { useEffect, useMemo, useState } from "react";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { cn } from "@/lib/utils";
import {
  localize,
  mediaUrl,
  sanitizeQuestionHtml,
  type AttemptQuestion,
  type SupportedLocale,
} from "@/types/quiz";

function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function SortableItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm",
        isDragging && "z-10 opacity-90 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1">{label}</span>
    </div>
  );
}

export function QuestionPrompt({
  question,
  locale,
  className,
}: {
  question: AttemptQuestion;
  locale: SupportedLocale;
  className?: string;
}) {
  const text = localize(question.questionText, locale);
  const isHtml = question.config?.contentFormat === "html";
  const img = mediaUrl(question.imageUrl, APP_CONFIG.apiUrl);

  return (
    <div className={cn("space-y-3", className)}>
      {isHtml ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2"
          dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(text) }}
        />
      ) : (
        <p className="whitespace-pre-wrap font-medium text-sm leading-relaxed md:text-base">
          {text}
        </p>
      )}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt="Question diagram"
          className="max-h-[420px] w-full rounded-lg border bg-muted/30 object-contain"
        />
      )}
    </div>
  );
}

export type AnswerValue = {
  choiceId?: string;
  textResponse?: string;
};

interface QuestionAnswerProps {
  question: AttemptQuestion;
  locale: SupportedLocale;
  value: AnswerValue;
  onChange: (next: AnswerValue) => void;
  disabled?: boolean;
}

export function QuestionAnswerInput({
  question,
  locale,
  value,
  onChange,
  disabled,
}: QuestionAnswerProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const initialOrder = useMemo(() => {
    if (question.type !== "SEQUENCE") return [] as string[];
    if (value.textResponse) {
      try {
        const parsed = JSON.parse(value.textResponse) as string[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {
        /* ignore */
      }
    }
    return seededShuffle(
      question.choices.map((c) => c.id),
      question.id,
    );
  }, [question, value.textResponse]);

  const [order, setOrder] = useState<string[]>(initialOrder);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  if (question.type === "MCQ") {
    return (
      <RadioGroup
        value={value.choiceId}
        onValueChange={(choiceId) => onChange({ choiceId })}
        disabled={disabled}
      >
        {question.choices.map((choice) => {
          const isSelected = value.choiceId === choice.id;
          return (
            <label
              key={choice.id}
              htmlFor={`${question.id}-${choice.id}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
              )}
            >
              <RadioGroupItem value={choice.id} id={`${question.id}-${choice.id}`} />
              <span>{localize(choice.choiceText, locale)}</span>
            </label>
          );
        })}
      </RadioGroup>
    );
  }

  if (question.type === "SHORT_TEXT") {
    return (
      <Input
        value={value.textResponse ?? ""}
        onChange={(e) => onChange({ textResponse: e.target.value })}
        placeholder="Type your answer"
        disabled={disabled}
      />
    );
  }

  if (question.type === "NUMERIC") {
    return (
      <Input
        type="number"
        inputMode="decimal"
        value={value.textResponse ?? ""}
        min={question.config?.min}
        max={question.config?.max}
        step="any"
        onChange={(e) => onChange({ textResponse: e.target.value })}
        placeholder="Enter a number"
        disabled={disabled}
        className="max-w-xs"
      />
    );
  }

  if (question.type === "SEQUENCE") {
    const byId = new Map(question.choices.map((c) => [c.id, c]));

    const onDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = order.indexOf(String(active.id));
      const newIndex = order.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(order, oldIndex, newIndex);
      setOrder(next);
      onChange({ textResponse: JSON.stringify(next) });
    };

    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">Drag items into the correct order.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {order.map((id) => {
                const choice = byId.get(id);
                if (!choice) return null;
                return (
                  <SortableItem key={id} id={id} label={localize(choice.choiceText, locale)} />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Textarea
        value={value.textResponse ?? ""}
        onChange={(e) => onChange({ textResponse: e.target.value })}
        placeholder="Write your answer…"
        rows={6}
        disabled={disabled}
      />
      {(question.config?.minWords || question.config?.minSentences) && (
        <p className="text-muted-foreground text-xs">
          {question.config.minWords ? `Aim for at least ${question.config.minWords} words. ` : null}
          {question.config.minSentences
            ? `At least ${question.config.minSentences} sentence(s). `
            : null}
          This answer is graded manually.
        </p>
      )}
    </div>
  );
}
