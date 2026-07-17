"use client";

import { useCallback, useEffect, useState } from "react";

import { Mail, MessageSquare, Send, Server } from "lucide-react";
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
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type SmtpEncryption = "SSL" | "STARTTLS" | "NONE";
type SmsProvider = "HUTCH" | "NOTIFY_LK";

interface NotificationSettingsResponse {
  smtp: {
    host: string;
    port: number;
    encryption: SmtpEncryption;
    user: string;
    from: string;
    hasPassword: boolean;
  };
  sms: {
    provider: SmsProvider;
    hutchApiUrl: string;
    hutchUsername: string;
    hasHutchApiKey: boolean;
    notifyUserId: string;
    hasNotifyApiKey: boolean;
    notifySenderId: string;
    notifyApiUrl: string;
  };
}

const DEFAULT_SMTP = {
  host: "mail.privateemail.com",
  port: 465,
  encryption: "SSL" as SmtpEncryption,
  user: "",
  from: "",
  pass: "",
};

function authHeaders() {
  const token = getClientCookie("session_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

interface TestEmailResult {
  userFound: boolean;
  delivered: boolean;
  mode: "smtp" | "dev-log";
  from: string;
  to: string;
  subject: string;
  html: string;
  message: string;
}

export function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<TestEmailResult | null>(null);

  const [smtpHost, setSmtpHost] = useState(DEFAULT_SMTP.host);
  const [smtpPort, setSmtpPort] = useState(String(DEFAULT_SMTP.port));
  const [smtpEncryption, setSmtpEncryption] = useState<SmtpEncryption>(DEFAULT_SMTP.encryption);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [hasSmtpPassword, setHasSmtpPassword] = useState(false);

  const [smsProvider, setSmsProvider] = useState<SmsProvider>("HUTCH");
  const [hutchApiUrl, setHutchApiUrl] = useState("https://api.hutch.lk/v1/send");
  const [hutchUsername, setHutchUsername] = useState("");
  const [hutchApiKey, setHutchApiKey] = useState("");
  const [hasHutchApiKey, setHasHutchApiKey] = useState(false);
  const [notifyUserId, setNotifyUserId] = useState("");
  const [notifyApiKey, setNotifyApiKey] = useState("");
  const [hasNotifyApiKey, setHasNotifyApiKey] = useState(false);
  const [notifySenderId, setNotifySenderId] = useState("NotifyDEMO");
  const [notifyApiUrl, setNotifyApiUrl] = useState("https://app.notify.lk/api/v1/send");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/notifications`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 403) {
          setLoading(false);
          return;
        }
        throw new Error("Failed to load notification settings");
      }
      const data: NotificationSettingsResponse = await res.json();
      setSmtpHost(data.smtp.host || DEFAULT_SMTP.host);
      setSmtpPort(String(data.smtp.port || DEFAULT_SMTP.port));
      setSmtpEncryption(data.smtp.encryption || DEFAULT_SMTP.encryption);
      setSmtpUser(data.smtp.user || "");
      setSmtpFrom(data.smtp.from || "");
      setHasSmtpPassword(data.smtp.hasPassword);
      setSmtpPass("");

      setSmsProvider(data.sms.provider || "HUTCH");
      setHutchApiUrl(data.sms.hutchApiUrl || "https://api.hutch.lk/v1/send");
      setHutchUsername(data.sms.hutchUsername || "");
      setHasHutchApiKey(data.sms.hasHutchApiKey);
      setHutchApiKey("");
      setNotifyUserId(data.sms.notifyUserId || "");
      setHasNotifyApiKey(data.sms.hasNotifyApiKey);
      setNotifyApiKey("");
      setNotifySenderId(data.sms.notifySenderId || "NotifyDEMO");
      setNotifyApiUrl(data.sms.notifyApiUrl || "https://app.notify.lk/api/v1/send");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onPortChange = (value: string) => {
    setSmtpPort(value);
    const port = Number(value);
    if (port === 465) setSmtpEncryption("SSL");
    if (port === 587) setSmtpEncryption("STARTTLS");
  };

  const onEncryptionChange = (value: SmtpEncryption) => {
    setSmtpEncryption(value);
    if (value === "SSL") setSmtpPort("465");
    if (value === "STARTTLS") setSmtpPort("587");
  };

  const sendTestEmail = async () => {
    const email = testTo.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address to test");
      return;
    }

    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/notifications/test-email`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ to: email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message || "Test email failed";
        throw new Error(errMsg);
      }

      setTestResult(data as TestEmailResult);
      toast.success(data.delivered ? "Test email sent" : "SMTP not fully configured", {
        description: data.message,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test email failed";
      toast.error(
        message.toLowerCase().includes("no user found") ? "No user found" : "SMTP test failed",
        { description: message },
      );
    } finally {
      setTestingEmail(false);
    }
  };

  const saveSmtp = async () => {
    const port = Number(smtpPort);
    if (!smtpHost.trim()) {
      toast.error("Outgoing server name is required");
      return;
    }
    if (![465, 587].includes(port) && (port < 1 || port > 65535)) {
      toast.error("Enter a valid outgoing port (465 or 587 recommended)");
      return;
    }

    setSavingSmtp(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/notifications`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          smtp: {
            host: smtpHost.trim(),
            port,
            encryption: smtpEncryption,
            user: smtpUser.trim(),
            from: smtpFrom.trim(),
            ...(smtpPass ? { pass: smtpPass } : {}),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not save SMTP settings");
      }
      const data: NotificationSettingsResponse = await res.json();
      setHasSmtpPassword(data.smtp.hasPassword);
      setSmtpPass("");
      toast.success("SMTP settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save SMTP settings");
    } finally {
      setSavingSmtp(false);
    }
  };

  const saveSms = async () => {
    setSavingSms(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/settings/notifications`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          sms: {
            provider: smsProvider,
            hutchApiUrl: hutchApiUrl.trim(),
            hutchUsername: hutchUsername.trim(),
            ...(hutchApiKey ? { hutchApiKey } : {}),
            notifyUserId: notifyUserId.trim(),
            ...(notifyApiKey ? { notifyApiKey } : {}),
            notifySenderId: notifySenderId.trim(),
            notifyApiUrl: notifyApiUrl.trim(),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not save SMS settings");
      }
      const data: NotificationSettingsResponse = await res.json();
      setHasHutchApiKey(data.sms.hasHutchApiKey);
      setHasNotifyApiKey(data.sms.hasNotifyApiKey);
      setHutchApiKey("");
      setNotifyApiKey("");
      toast.success("SMS gateway settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save SMS settings");
    } finally {
      setSavingSms(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2">
        <Spinner className="size-5" />
        <span className="text-muted-foreground text-sm">Loading mail & SMS settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-semibold text-xl tracking-tight">Mail & SMS gateways</h2>
        <p className="text-muted-foreground text-sm">
          Configure the outgoing mail server and SMS provider used for password resets and
          notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="space-y-1.5 p-6">
            <CardTitle className="flex items-center gap-2 font-semibold text-xl leading-none tracking-tight">
              <Mail className="size-5" />
              SMTP / Outgoing mail
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Default profile: Namecheap Private Email (`mail.privateemail.com`) with SSL on port
              465.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="smtp-host">Outgoing server name</FieldLabel>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="mail.privateemail.com"
              />
              <FieldDescription>SMTP setting (default: mail.privateemail.com)</FieldDescription>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="smtp-port">Outgoing port</FieldLabel>
                <Select value={smtpPort} onValueChange={onPortChange}>
                  <SelectTrigger id="smtp-port">
                    <SelectValue placeholder="Port" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="465">465 (SSL)</SelectItem>
                    <SelectItem value="587">587 (STARTTLS)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="gap-1.5">
                <FieldLabel>Type of security (encryption)</FieldLabel>
                <Select
                  value={smtpEncryption}
                  onValueChange={(v) => onEncryptionChange(v as SmtpEncryption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SSL">SSL</SelectItem>
                    <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="smtp-user">SMTP username</FieldLabel>
              <Input
                id="smtp-user"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="you@yourdomain.com"
                autoComplete="off"
              />
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="smtp-pass">SMTP password</FieldLabel>
              <Input
                id="smtp-pass"
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={hasSmtpPassword ? "•••••••• (leave blank to keep)" : "SMTP password"}
                autoComplete="new-password"
              />
              <FieldDescription>
                {hasSmtpPassword
                  ? "A password is already saved. Leave blank to keep it."
                  : "Mailbox password for the SMTP account."}
              </FieldDescription>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="smtp-from">From address</FieldLabel>
              <Input
                id="smtp-from"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </Field>

            <div className="flex justify-end pt-2">
              <Button type="button" className="font-semibold" disabled={savingSmtp} onClick={() => void saveSmtp()}>
                {savingSmtp ? <Spinner className="size-4" /> : <Server className="size-4" />}
                {savingSmtp ? "Saving…" : "Save SMTP settings"}
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="font-medium text-sm">Test SMTP / password-reset email</div>
              <p className="text-muted-foreground text-xs">
                Enter a registered user email. If the address is not in the system, you will see{" "}
                <strong>No user found for that email</strong>. Otherwise a real password-reset
                email is sent.
              </p>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="test-email">Send test to</FieldLabel>
                <Input
                  id="test-email"
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="registered-user@yourdomain.com"
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={testingEmail}
                  onClick={() => void sendTestEmail()}
                >
                  {testingEmail ? <Spinner className="size-4" /> : <Send className="size-4" />}
                  {testingEmail ? "Sending…" : "Send test email"}
                </Button>
              </div>
              {testResult ? (
                <div className="space-y-1 rounded-md border border-border bg-background p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">To:</span> {testResult.to}
                  </div>
                  <div>
                    <span className="text-muted-foreground">From:</span> {testResult.from}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject:</span> {testResult.subject}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {testResult.delivered
                      ? "Delivered via SMTP"
                      : "Logged only (SMTP incomplete)"}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="space-y-1.5 p-6">
            <CardTitle className="flex items-center gap-2 font-semibold text-xl leading-none tracking-tight">
              <MessageSquare className="size-5" />
              SMS gateway
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Send URL and credentials for Hutch or Notify.lk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Field className="gap-1.5">
              <FieldLabel>Provider</FieldLabel>
              <Select value={smsProvider} onValueChange={(v) => setSmsProvider(v as SmsProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HUTCH">Hutch</SelectItem>
                  <SelectItem value="NOTIFY_LK">Notify.lk</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {smsProvider === "HUTCH" ? (
              <>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="hutch-url">Send URL</FieldLabel>
                  <Input
                    id="hutch-url"
                    value={hutchApiUrl}
                    onChange={(e) => setHutchApiUrl(e.target.value)}
                    placeholder="https://api.hutch.lk/v1/send"
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="hutch-user">Username</FieldLabel>
                  <Input
                    id="hutch-user"
                    value={hutchUsername}
                    onChange={(e) => setHutchUsername(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="hutch-key">API key</FieldLabel>
                  <Input
                    id="hutch-key"
                    type="password"
                    value={hutchApiKey}
                    onChange={(e) => setHutchApiKey(e.target.value)}
                    placeholder={
                      hasHutchApiKey ? "•••••••• (leave blank to keep)" : "Hutch API key"
                    }
                    autoComplete="new-password"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="notify-url">Send URL</FieldLabel>
                  <Input
                    id="notify-url"
                    value={notifyApiUrl}
                    onChange={(e) => setNotifyApiUrl(e.target.value)}
                    placeholder="https://app.notify.lk/api/v1/send"
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="notify-user">User ID</FieldLabel>
                  <Input
                    id="notify-user"
                    value={notifyUserId}
                    onChange={(e) => setNotifyUserId(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="notify-key">API key</FieldLabel>
                  <Input
                    id="notify-key"
                    type="password"
                    value={notifyApiKey}
                    onChange={(e) => setNotifyApiKey(e.target.value)}
                    placeholder={
                      hasNotifyApiKey ? "•••••••• (leave blank to keep)" : "Notify.lk API key"
                    }
                    autoComplete="new-password"
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="notify-sender">Sender ID</FieldLabel>
                  <Input
                    id="notify-sender"
                    value={notifySenderId}
                    onChange={(e) => setNotifySenderId(e.target.value)}
                  />
                </Field>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" className="font-semibold" disabled={savingSms} onClick={() => void saveSms()}>
                {savingSms ? <Spinner className="size-4" /> : null}
                {savingSms ? "Saving…" : "Save SMS settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
