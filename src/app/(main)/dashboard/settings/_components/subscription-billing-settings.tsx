"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

export type PaymentMode = "MIXED" | "MONTHLY_ONLY" | "QUIZ_ONLY";

const MODE_OPTIONS: {
  value: PaymentMode;
  title: string;
  description: string;
}[] = [
  {
    value: "MIXED",
    title: "Monthly + special quiz prices",
    description:
      "Requires unlock (no price) → covered by monthly subscription. Add a Price to make a quiz pay separately, even for subscribers.",
  },
  {
    value: "MONTHLY_ONLY",
    title: "Monthly subscription only",
    description: "All locked quizzes unlock with one monthly subscription. Quiz prices are ignored for access.",
  },
  {
    value: "QUIZ_ONLY",
    title: "Per-quiz payment only",
    description: "No monthly plan. Every locked quiz needs its own Price (LKR) and payment.",
  },
];

export function SubscriptionBillingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fee, setFee] = useState("500");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("MIXED");

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/settings/billing`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Could not load billing settings");
        const data = await res.json();
        setFee(String(data.monthlyStudentFeeLkr ?? 500));
        const mode = String(data.paymentMode || "MIXED").toUpperCase();
        if (mode === "MONTHLY_ONLY" || mode === "QUIZ_ONLY" || mode === "MIXED") {
          setPaymentMode(mode);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load billing");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    const value = Number(fee);
    if (paymentMode !== "QUIZ_ONLY" && (!Number.isFinite(value) || value < 0)) {
      toast.error("Enter a valid monthly fee (LKR)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/billing`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthlyStudentFeeLkr: Number.isFinite(value) ? value : 0,
          paymentMode,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Could not save");
      }
      const data = await res.json();
      setFee(String(data.monthlyStudentFeeLkr));
      setPaymentMode(data.paymentMode);
      toast.success("Payment settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl border-border">
      <CardHeader>
        <CardTitle>Smart payment</CardTitle>
        <CardDescription>
          Choose how locked quizzes are unlocked for students, then set the monthly fee when
          subscription is enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Field className="gap-2">
          <FieldLabel>Payment mode</FieldLabel>
          <div className="grid gap-2">
            {MODE_OPTIONS.map((opt) => {
              const selected = paymentMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMode(opt.value)}
                  className={cn(
                    "rounded-xl border px-3.5 py-3 text-left transition",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 size-4 shrink-0 rounded-full border",
                        selected ? "border-primary bg-primary" : "border-muted-foreground/40",
                      )}
                    />
                    <div>
                      <p className="text-sm font-semibold">{opt.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        {paymentMode !== "QUIZ_ONLY" ? (
          <Field className="gap-1.5">
            <FieldLabel htmlFor="monthly-fee">Monthly student charge (LKR)</FieldLabel>
            <Input
              id="monthly-fee"
              type="number"
              min={0}
              step={1}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <FieldDescription>
              {paymentMode === "MONTHLY_ONLY"
                ? "Students pay this once to unlock every locked quiz for 30 days."
                : "Students pay this to unlock locked quizzes that have no separate Price. Quizzes with a Price still need an extra payment."}
            </FieldDescription>
          </Field>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Monthly subscription is off. Teachers must set a Price (LKR) on every locked quiz.
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-muted-foreground">
            Mode: <span className="font-medium text-foreground">{paymentMode}</span>
          </Label>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save payment settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
