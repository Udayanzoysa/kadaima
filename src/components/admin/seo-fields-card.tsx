"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Google truncates around these lengths — guidance only, never enforced. */
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

interface SeoFieldsCardProps {
  /** Keeps label/input ids unique when several forms render on one page. */
  idPrefix: string;
  seoTitle: string;
  seoDescription: string;
  onSeoTitleChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
  /** Shown so authors can see what a blank field falls back to. */
  fallbackTitle?: string;
  fallbackDescription?: string;
}

function CharacterCount({ length, limit }: { length: number; limit: number }) {
  if (length === 0) return null;
  return (
    <span className={cn("tabular-nums", length > limit && "font-medium text-destructive")}>
      {length}/{limit}
      {length > limit ? " — may be truncated in search results" : null}
    </span>
  );
}

/**
 * Optional per-page search-engine overrides. Blank fields intentionally persist
 * as empty so the public page keeps deriving metadata from its own content.
 */
export function SeoFieldsCard({
  idPrefix,
  seoTitle,
  seoDescription,
  onSeoTitleChange,
  onSeoDescriptionChange,
  fallbackTitle,
  fallbackDescription,
}: SeoFieldsCardProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Search engine listing</CardTitle>
        <CardDescription>
          Optional. Controls the title and description shown by Google and on shared links. Leave blank to generate them
          from the content above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-seo-title`}>SEO title</FieldLabel>
          <Input
            id={`${idPrefix}-seo-title`}
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder={fallbackTitle ?? "e.g. Grade 11 Maths Past Paper Quiz"}
          />
          <FieldDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CharacterCount length={seoTitle.trim().length} limit={TITLE_LIMIT} />
            {seoTitle.trim() ? null : (
              <span>
                Falls back to{" "}
                {fallbackTitle ? <strong className="font-medium">{fallbackTitle}</strong> : "the title above"}.
              </span>
            )}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-seo-description`}>SEO meta description</FieldLabel>
          <Textarea
            id={`${idPrefix}-seo-description`}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder={fallbackDescription ?? "A one or two sentence summary for search results."}
            rows={3}
          />
          <FieldDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CharacterCount length={seoDescription.trim().length} limit={DESCRIPTION_LIMIT} />
            {seoDescription.trim() ? null : <span>Falls back to the description above.</span>}
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  );
}
