"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrowDown, ArrowUp, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type Localized = { en: string; si: string; ta: string };

type CategoryRow = {
  courseId: string;
  visible: boolean;
  sortOrder: number;
  maxQuizzes: number;
  quizIds: string[];
};

type AvailableCourse = {
  id: string;
  title: { en?: string; si?: string; ta?: string } | string;
  publishedQuizCount: number;
  kind: string;
  quizzes: Array<{ id: string; title: { en?: string } | string }>;
};

type HomepageForm = {
  hero: {
    badge: Localized;
    title: Localized;
    description: Localized;
    showSecondaryCta: boolean;
  };
  maxCategories: number;
  categories: CategoryRow[];
  promoSection: {
    enabled: boolean;
    badge: Localized;
    title: Localized;
    description: Localized;
    ctaLabel: Localized;
    ctaHref: string;
  };
};

const emptyLoc = (): Localized => ({ en: "", si: "", ta: "" });

const EMPTY: HomepageForm = {
  hero: {
    badge: emptyLoc(),
    title: emptyLoc(),
    description: emptyLoc(),
    showSecondaryCta: true,
  },
  maxCategories: 3,
  categories: [],
  promoSection: {
    enabled: false,
    badge: emptyLoc(),
    title: emptyLoc(),
    description: emptyLoc(),
    ctaLabel: emptyLoc(),
    ctaHref: "/partner",
  },
};

function courseTitle(c: AvailableCourse): string {
  if (typeof c.title === "string") return c.title;
  return c.title?.en || c.title?.si || c.title?.ta || c.id.slice(0, 8);
}

function quizTitle(q: AvailableCourse["quizzes"][number]): string {
  if (typeof q.title === "string") return q.title;
  return q.title?.en || q.id.slice(0, 8);
}

function LocalizedFields({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: Localized;
  onChange: (next: Localized) => void;
  multiline?: boolean;
}) {
  const FieldInput = multiline ? Textarea : Input;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <p className="font-medium text-sm">{label}</p>
      {(["en", "si", "ta"] as const).map((loc) => (
        <Field key={loc} className="gap-1">
          <FieldLabel className="text-xs uppercase text-muted-foreground">{loc}</FieldLabel>
          <FieldInput
            value={value[loc]}
            onChange={(e) => onChange({ ...value, [loc]: e.target.value })}
            className={multiline ? "min-h-[64px]" : undefined}
          />
        </Field>
      ))}
    </div>
  );
}

export function HomepageSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HomepageForm>(EMPTY);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);

  const load = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/homepage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load homepage settings");
      const data = await res.json();
      setAvailableCourses(data.availableCourses ?? []);
      setForm({
        hero: {
          badge: { ...emptyLoc(), ...data.hero?.badge },
          title: { ...emptyLoc(), ...data.hero?.title },
          description: { ...emptyLoc(), ...data.hero?.description },
          showSecondaryCta: data.hero?.showSecondaryCta !== false,
        },
        maxCategories: data.maxCategories ?? 3,
        categories: Array.isArray(data.categories)
          ? data.categories.map((c: CategoryRow, i: number) => ({
              courseId: c.courseId,
              visible: c.visible !== false,
              sortOrder: c.sortOrder ?? i,
              maxQuizzes: c.maxQuizzes ?? 6,
              quizIds: Array.isArray(c.quizIds) ? c.quizIds : [],
            }))
          : [],
        promoSection: {
          enabled: Boolean(data.promoSection?.enabled),
          badge: { ...emptyLoc(), ...data.promoSection?.badge },
          title: { ...emptyLoc(), ...data.promoSection?.title },
          description: { ...emptyLoc(), ...data.promoSection?.description },
          ctaLabel: { ...emptyLoc(), ...data.promoSection?.ctaLabel },
          ctaHref: data.promoSection?.ctaHref || "/partner",
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load homepage settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const move = (index: number, dir: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.categories];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return {
        ...prev,
        categories: next.map((c, i) => ({ ...c, sortOrder: i })),
      };
    });
  };

  const addMissingCourses = () => {
    setForm((prev) => {
      const have = new Set(prev.categories.map((c) => c.courseId));
      const extras = availableCourses
        .filter((c) => !have.has(c.id))
        .map((c, i) => ({
          courseId: c.id,
          visible: c.kind !== "scholarship",
          sortOrder: prev.categories.length + i,
          maxQuizzes: 6,
          quizIds: [] as string[],
        }));
      return {
        ...prev,
        categories: [...prev.categories, ...extras].map((c, i) => ({ ...c, sortOrder: i })),
      };
    });
  };

  const save = async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/homepage`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hero: form.hero,
          maxCategories: form.maxCategories,
          categories: form.categories.map((c, i) => ({ ...c, sortOrder: i })),
          promoSection: form.promoSection,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Could not save");
      }
      toast.success("Homepage settings saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
        <Spinner className="size-6" />
        <span className="text-sm">Loading homepage settings…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="space-y-1.5 p-6">
          <CardTitle className="flex items-center gap-2 font-semibold text-xl">
            <LayoutTemplate className="size-5" />
            Homepage layout
          </CardTitle>
          <CardDescription>
            Control the public home hero, which exam categories appear (and in what order), quiz limits, and an optional
            promo section after the catalog. Leave hero fields blank to use the default locale copy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-6">
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Hero</h3>
            <LocalizedFields
              label="Badge"
              value={form.hero.badge}
              onChange={(badge) => setForm((p) => ({ ...p, hero: { ...p.hero, badge } }))}
            />
            <LocalizedFields
              label="Title"
              value={form.hero.title}
              onChange={(title) => setForm((p) => ({ ...p, hero: { ...p.hero, title } }))}
            />
            <LocalizedFields
              label="Description"
              value={form.hero.description}
              onChange={(description) => setForm((p) => ({ ...p, hero: { ...p.hero, description } }))}
              multiline
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-secondary-cta"
                checked={form.hero.showSecondaryCta}
                onCheckedChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    hero: { ...p.hero, showSecondaryCta: Boolean(v) },
                  }))
                }
              />
              <label htmlFor="show-secondary-cta" className="text-sm">
                Show “View Progress” secondary button
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm">Categories on home</h3>
                <p className="text-muted-foreground text-xs">
                  Drag order with arrows. Hidden categories stay available on the full /quiz catalog.
                </p>
              </div>
              <Field className="w-36 gap-1">
                <FieldLabel>Max categories</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.maxCategories}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      maxCategories: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                />
              </Field>
            </div>

            <div className="space-y-2">
              {form.categories.map((row, index) => {
                const course = availableCourses.find((c) => c.id === row.courseId);
                return (
                  <div key={row.courseId} className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-8"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-8"
                          onClick={() => move(index, 1)}
                          disabled={index === form.categories.length - 1}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{course ? courseTitle(course) : row.courseId}</p>
                        <p className="text-muted-foreground text-xs">
                          {course?.kind ?? "?"} · {course?.publishedQuizCount ?? 0} published
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`vis-${row.courseId}`}
                          checked={row.visible}
                          onCheckedChange={(v) =>
                            setForm((p) => ({
                              ...p,
                              categories: p.categories.map((c, i) => (i === index ? { ...c, visible: Boolean(v) } : c)),
                            }))
                          }
                        />
                        <label htmlFor={`vis-${row.courseId}`} className="text-xs">
                          Show on home
                        </label>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            categories: p.categories
                              .filter((_, i) => i !== index)
                              .map((c, i) => ({ ...c, sortOrder: i })),
                          }))
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Field className="w-28 gap-1">
                        <FieldLabel className="text-xs">Max quizzes</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={48}
                          value={row.maxQuizzes}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              categories: p.categories.map((c, i) =>
                                i === index
                                  ? {
                                      ...c,
                                      maxQuizzes: Math.max(1, Number(e.target.value) || 1),
                                    }
                                  : c,
                              ),
                            }))
                          }
                        />
                      </Field>
                      <FieldDescription className="text-xs">
                        Leave quiz picks empty to use newest quizzes automatically.
                      </FieldDescription>
                    </div>
                    {course && course.quizzes.length > 0 ? (
                      <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
                        {course.quizzes.map((q) => {
                          const checked = row.quizIds.includes(q.id);
                          return (
                            <label key={q.id} className="flex cursor-pointer items-center gap-2 text-xs">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  setForm((p) => ({
                                    ...p,
                                    categories: p.categories.map((c, i) => {
                                      if (i !== index) return c;
                                      const set = new Set(c.quizIds);
                                      if (v) set.add(q.id);
                                      else set.delete(q.id);
                                      return { ...c, quizIds: [...set] };
                                    }),
                                  }))
                                }
                              />
                              <span className="truncate">{quizTitle(q)}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addMissingCourses}>
              <Plus className="mr-1.5 size-3.5" />
              Add missing courses
            </Button>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="promo-enabled"
                checked={form.promoSection.enabled}
                onCheckedChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    promoSection: { ...p.promoSection, enabled: Boolean(v) },
                  }))
                }
              />
              <label htmlFor="promo-enabled" className="font-semibold text-sm">
                Promo section after quizzes
              </label>
            </div>
            {form.promoSection.enabled ? (
              <div className="space-y-3">
                <LocalizedFields
                  label="Promo badge"
                  value={form.promoSection.badge}
                  onChange={(badge) =>
                    setForm((p) => ({
                      ...p,
                      promoSection: { ...p.promoSection, badge },
                    }))
                  }
                />
                <LocalizedFields
                  label="Promo title"
                  value={form.promoSection.title}
                  onChange={(title) =>
                    setForm((p) => ({
                      ...p,
                      promoSection: { ...p.promoSection, title },
                    }))
                  }
                />
                <LocalizedFields
                  label="Promo description"
                  value={form.promoSection.description}
                  onChange={(description) =>
                    setForm((p) => ({
                      ...p,
                      promoSection: { ...p.promoSection, description },
                    }))
                  }
                  multiline
                />
                <LocalizedFields
                  label="CTA label"
                  value={form.promoSection.ctaLabel}
                  onChange={(ctaLabel) =>
                    setForm((p) => ({
                      ...p,
                      promoSection: { ...p.promoSection, ctaLabel },
                    }))
                  }
                />
                <Field className="gap-1.5">
                  <FieldLabel>CTA link</FieldLabel>
                  <Input
                    value={form.promoSection.ctaHref}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        promoSection: { ...p.promoSection, ctaHref: e.target.value },
                      }))
                    }
                    placeholder="/partner"
                  />
                </Field>
              </div>
            ) : null}
          </section>

          <div className="flex justify-end pt-2">
            <Button className="font-semibold" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save homepage"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
