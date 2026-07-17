"use client";

import { useEffect, useState } from "react";

import { Bot, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

const MODEL_OPTIONS = [
  {
    value: "gemini-3-flash-preview",
    label: "Gemini 3 Flash (recommended)",
    hint: "Best text model for website + WhatsApp chat",
  },
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "Fast, strong general chat",
  },
  {
    value: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    hint: "Stable default used previously",
  },
  {
    value: "gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash Lite",
    hint: "Cheaper / faster fallback",
  },
] as const;

export function AiChatSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [model, setModel] = useState("gemini-3-flash-preview");
  const [fallbacks, setFallbacks] = useState(
    "gemini-2.0-flash,gemini-2.0-flash-lite,gemini-2.5-flash",
  );
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/settings/ai`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Could not load AI settings");
        const data = await res.json();
        setEnabled(Boolean(data.enabled));
        setModel(String(data.model || "gemini-3-flash-preview"));
        setFallbacks(
          String(
            data.fallbacks ||
              "gemini-2.0-flash,gemini-2.0-flash-lite,gemini-2.5-flash",
          ),
        );
        setHasApiKey(Boolean(data.hasApiKey));
        setNote(String(data.note || ""));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load AI settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        enabled,
        provider: "gemini",
        model,
        fallbacks,
      };
      if (apiKey.trim()) body.apiKey = apiKey.trim();

      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/ai`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not save AI settings");
      }
      const data = await res.json();
      setHasApiKey(Boolean(data.hasApiKey));
      setApiKey("");
      toast.success("AI chat settings saved — website + WhatsApp use this config");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-5" />
        <span className="text-muted-foreground text-sm">Loading AI settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#2b7fff]/10 text-[#2b7fff]">
              <Bot className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Kadaima Expert (Gemini)</CardTitle>
              <CardDescription>
                Powers the website chat widget and the WhatsApp bot with the same Gemini model.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
            <div>
              <p className="font-medium text-sm">Enable AI chat</p>
              <p className="text-muted-foreground text-xs">
                When off, website + WhatsApp show a “temporarily disabled” message.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Field>
            <FieldLabel>Gemini model</FieldLabel>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {MODEL_OPTIONS.find((o) => o.value === model)?.hint}
              {" · "}
              <span className="text-amber-700 dark:text-amber-400">
                Gemini 3 Flash Live is voice-only (Live API) — use Gemini 3 Flash above for this text chatbot.
              </span>
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Fallback models (comma-separated)</FieldLabel>
            <Input value={fallbacks} onChange={(e) => setFallbacks(e.target.value)} />
            <FieldDescription>
              Tried in order if the primary model fails (quota / unavailable).
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Gemini API key</FieldLabel>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? "•••••••• (leave blank to keep current key)" : "Paste API key from Google AI Studio"}
              autoComplete="off"
            />
            <FieldDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{hasApiKey ? "A key is already saved." : "No key saved yet — required for replies."}</span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#2b7fff] hover:underline"
              >
                Get a key in AI Studio
                <ExternalLink className="size-3" />
              </a>
            </FieldDescription>
          </Field>

          {note ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
              {note}
            </p>
          ) : null}

          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <>
                <Spinner className="size-4" />
                Saving…
              </>
            ) : (
              "Save AI settings"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
