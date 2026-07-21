"use client";

import { useEffect, useMemo, useState } from "react";

import { GraduationCap, Lightbulb } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getClientCookie } from "@/lib/cookie.client";
import { LOCALES, type Locale } from "@/lib/i18n";
import { safeJson } from "@/lib/safe-json";
import { cn } from "@/lib/utils";
import {
  hasLocaleContent,
  normalizeQuizLanguages,
  resolveQuizLanguage,
  type LocalizedText,
  type SupportedLocale,
} from "@/types/quiz";

export type AiQuizReviewItem = {
  questionId: string;
  questionNumber: number;
  concept: string;
  explanation: string;
  tip: string;
};

export type AiQuizReviewPayload = {
  summary: string;
  items: AiQuizReviewItem[];
  locale: Locale;
  skipped?: boolean;
  reason?: string;
};

type Props = {
  /** Public result token (guest / public take). */
  resultToken?: string | null;
  /** Logged-in attempt id (dashboard result). */
  attemptId?: string | null;
  /** Number of incorrect answers — skip fetch when 0. */
  incorrectCount: number;
  /** Quiz paper language(s) — review follows the paper, not the UI switcher. */
  quizLanguage?: SupportedLocale | string | null;
  quizLanguages?: Array<SupportedLocale | string> | null;
  quizTitle?: LocalizedText | null;
  sampleQuestionText?: LocalizedText | null;
  className?: string;
};

/** Resolve AI review language from the quiz paper (SI paper → Sinhala review). */
export function resolveReviewLocale(input: {
  quizLanguage?: SupportedLocale | string | null;
  quizLanguages?: Array<SupportedLocale | string> | null;
  quizTitle?: LocalizedText | null;
  sampleQuestionText?: LocalizedText | null;
  uiLocale?: Locale;
}): SupportedLocale {
  const langs = normalizeQuizLanguages(input.quizLanguages, input.quizLanguage);
  if (langs.length === 1) return langs[0];
  if (langs.length > 1) {
    if (input.uiLocale && langs.includes(input.uiLocale as SupportedLocale)) {
      return input.uiLocale as SupportedLocale;
    }
    return langs[0];
  }

  const sample = input.sampleQuestionText || input.quizTitle;
  if (sample) {
    const si = hasLocaleContent(sample, "si");
    const ta = hasLocaleContent(sample, "ta");
    const en = hasLocaleContent(sample, "en");
    if (si && !en && !ta) return "si";
    if (ta && !en && !si) return "ta";
    if (si && !en) return "si";
    if (ta && !en) return "ta";
  }

  return resolveQuizLanguage(input.quizTitle, input.quizLanguage, input.quizLanguages);
}

export function AiQuizReviewPanel({
  resultToken,
  attemptId,
  incorrectCount,
  quizLanguage,
  quizLanguages,
  quizTitle,
  sampleQuestionText,
  className,
}: Props) {
  const { locale: uiLocale, t } = useI18n();
  const [data, setData] = useState<AiQuizReviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(resultToken || attemptId);

  const reviewLocale = useMemo(
    () =>
      resolveReviewLocale({
        quizLanguage,
        quizLanguages,
        quizTitle,
        sampleQuestionText,
        uiLocale,
      }),
    [quizLanguage, quizLanguages, quizTitle, sampleQuestionText, uiLocale],
  );

  const reviewLocaleLabel =
    LOCALES.find((l) => l.code === reviewLocale)?.label ?? reviewLocale.toUpperCase();

  const loadReview = async () => {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const session = getClientCookie("session_token");
      if (session && attemptId && !resultToken) {
        headers.Authorization = `Bearer ${session}`;
      }

      const url = resultToken
        ? `${APP_CONFIG.apiUrl}/public/quizzes/results/${resultToken}/ai-review`
        : `${APP_CONFIG.apiUrl}/quizzes/attempts/${attemptId}/ai-review`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ locale: reviewLocale }),
      });
      const body = await safeJson<AiQuizReviewPayload & { message?: string | string[] }>(res);
      if (!res.ok) {
        const msg = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message || t("student.aiReviewError");
        throw new Error(msg);
      }
      if (!body) throw new Error(t("student.aiReviewError"));
      setData(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("student.aiReviewError");
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canFetch) return;
    if (incorrectCount <= 0) {
      setData({
        summary: t("student.aiReviewAllCorrect"),
        items: [],
        locale: reviewLocale,
        skipped: true,
        reason: "all_correct",
      });
      return;
    }
    void loadReview();
    // Follow quiz paper language — not the site language switcher for mono-language papers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultToken, attemptId, reviewLocale, incorrectCount]);

  if (!canFetch) return null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#bcd8ff] bg-gradient-to-br from-[#eef6ff] to-[#f7fbff] shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#bcd8ff]/70 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#1563b8] text-white shadow-sm">
            <GraduationCap className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-outfit)] text-base font-bold text-[#123a6b] sm:text-lg">
              {t("student.aiReviewTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
              {t("student.aiReviewSubtitle")}{" "}
              <span className="font-semibold text-[#1563b8]">
                ({t("student.aiReviewInLanguage").replace("{lang}", reviewLocaleLabel)})
              </span>
            </p>
          </div>
        </div>
        {incorrectCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[#1563b8]/30 bg-white/80 text-[#1563b8] hover:bg-white"
            disabled={loading}
            onClick={() => {
              void loadReview().then(() => {
                if (!error) toast.success(t("student.aiReviewRefreshed"));
              });
            }}
          >
            {loading ? <Spinner className="size-3.5" /> : null}
            {t("student.aiReviewRefresh")}
          </Button>
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner className="size-4" />
            {t("student.aiReviewLoading")}
          </div>
        ) : null}

        {error && !loading ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <p>{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => void loadReview()}
            >
              {t("student.tryAgain")}
            </Button>
          </div>
        ) : null}

        {data ? (
          <>
            <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>

            {data.items.length > 0 ? (
              <ul className="space-y-3">
                {data.items.map((item) => (
                  <li
                    key={item.questionId}
                    className="rounded-xl border border-white/80 bg-white/90 p-3.5 shadow-sm sm:p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#1563b8]/10 px-2 py-0.5 text-[11px] font-bold text-[#1563b8]">
                        Q{item.questionNumber}
                      </span>
                      {item.concept ? (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/80">
                          {item.concept}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {item.explanation}
                    </p>
                    {item.tip ? (
                      <p className="mt-2.5 flex items-start gap-1.5 text-sm font-medium text-[#114f94]">
                        <Lightbulb
                          className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                          strokeWidth={2.25}
                          aria-hidden
                        />
                        <span>
                          <span className="font-semibold">{t("student.aiReviewTipLabel")}: </span>
                          {item.tip}
                        </span>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
