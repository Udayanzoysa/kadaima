"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { cn } from "@/lib/utils";

import {
  authInputClass,
  authInputGroupClass,
  authInputGroupControlClass,
  authPrimaryButtonClass,
} from "./auth-shell";

const formSchema = z
  .object({
    channel: z.enum(["EMAIL", "SMS"]),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    token: z.string().min(4, { message: "Enter the reset code you received." }),
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Please confirm your password." }),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "EMAIL") {
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid email address.",
          path: ["email"],
        });
      }
    } else if (!data.phoneNumber || data.phoneNumber.trim().length < 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid mobile number.",
        path: ["phoneNumber"],
      });
    }
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkStatus, setLinkStatus] = useState<"checking" | "valid" | "invalid" | "manual">(
    "checking",
  );
  const [linkError, setLinkError] = useState("");

  const linkEmail = searchParams.get("email")?.trim() || "";
  const linkCode = (searchParams.get("code") || searchParams.get("token") || "").trim();
  const linkChannel =
    searchParams.get("channel") === "SMS" ? ("SMS" as const) : ("EMAIL" as const);

  const isEmailMagicLink = useMemo(
    () => linkChannel === "EMAIL" && Boolean(linkEmail && linkCode),
    [linkChannel, linkEmail, linkCode],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      channel: linkChannel,
      email: linkEmail,
      phoneNumber: searchParams.get("phone") ?? "",
      token: linkCode,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const channel = form.watch("channel");

  useEffect(() => {
    if (!isEmailMagicLink) {
      setLinkStatus("manual");
      return;
    }

    let cancelled = false;
    setLinkStatus("checking");
    setLinkError("");

    fetch(`${APP_CONFIG.apiUrl}/auth/validate-reset-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "EMAIL",
        email: linkEmail,
        token: linkCode,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          const errMsg = Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Invalid or expired reset link.";
          setLinkStatus("invalid");
          setLinkError(errMsg);
          return;
        }
        setLinkStatus("valid");
      })
      .catch(() => {
        if (cancelled) return;
        setLinkStatus("invalid");
        setLinkError("Could not validate reset link. Please request a new one.");
      });

    return () => {
      cancelled = true;
    };
  }, [isEmailMagicLink, linkEmail, linkCode]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const body =
        data.channel === "EMAIL"
          ? {
              channel: "EMAIL" as const,
              email: data.email?.trim(),
              token: data.token.trim(),
              newPassword: data.newPassword,
            }
          : {
              channel: "SMS" as const,
              phoneNumber: data.phoneNumber?.trim(),
              token: data.token.trim(),
              newPassword: data.newPassword,
            };

      const response = await fetch(`${APP_CONFIG.apiUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || "Invalid or expired reset link.";
        throw new Error(errMsg);
      }

      toast.success("Password updated", {
        description: result.message || "You can sign in with your new password.",
      });
      router.push("/login");
    } catch (error) {
      toast.error("Reset failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEmailMagicLink && linkStatus === "checking") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <Spinner className="size-6 text-sky-500" />
        <p className="text-sm text-slate-500">Validating your reset link…</p>
      </div>
    );
  }

  if (isEmailMagicLink && linkStatus === "invalid") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium text-destructive">{linkError}</p>
        <p className="text-sm text-slate-500">
          Request a new password reset email and use the latest link.
        </p>
        <Button asChild className={authPrimaryButtonClass}>
          <Link prefetch={false} href="/forgot-password">
            Request a new link
          </Link>
        </Button>
      </div>
    );
  }

  const showPasswordOnly = isEmailMagicLink && linkStatus === "valid";

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {!showPasswordOnly ? (
        <>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["EMAIL", "SMS"] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={isSubmitting}
                onClick={() => form.setValue("channel", value, { shouldValidate: true })}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  channel === value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {value === "EMAIL" ? "Email" : "SMS"}
              </button>
            ))}
          </div>

          <FieldGroup className="gap-4">
            {channel === "EMAIL" ? (
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reset-email" className="text-slate-600">
                      Email Address
                    </FieldLabel>
                    <InputGroup
                      className={cn(
                        authInputGroupClass,
                        fieldState.invalid && "border-destructive ring-3 ring-destructive/20",
                      )}
                    >
                      <InputGroupAddon>
                        <Mail className="size-4 text-slate-500" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="reset-email"
                        type="email"
                        placeholder="e.g. scholar@kadaima.edu"
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                        disabled={isSubmitting}
                        className={authInputGroupControlClass}
                      />
                    </InputGroup>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ) : (
              <Controller
                control={form.control}
                name="phoneNumber"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reset-phone" className="text-slate-600">
                      Mobile Number
                    </FieldLabel>
                    <InputGroup
                      className={cn(
                        authInputGroupClass,
                        fieldState.invalid && "border-destructive ring-3 ring-destructive/20",
                      )}
                    >
                      <InputGroupAddon>
                        <Phone className="size-4 text-slate-500" />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="reset-phone"
                        type="tel"
                        placeholder="07XXXXXXXX"
                        inputMode="numeric"
                        autoComplete="tel"
                        aria-invalid={fieldState.invalid}
                        disabled={isSubmitting}
                        className={authInputGroupControlClass}
                      />
                    </InputGroup>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="token"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reset-token" className="text-slate-600">
                    Reset code
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reset-token"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    autoComplete="one-time-code"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className={authInputClass}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </>
      ) : (
        <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-center text-sm text-sky-800">
          Link verified. Choose a new password below.
        </p>
      )}

      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password" className="text-slate-600">
                New password
              </FieldLabel>
              <PasswordInput
                {...field}
                id="reset-password"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
                className={authInputClass}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-confirm" className="text-slate-600">
                Confirm password
              </FieldLabel>
              <PasswordInput
                {...field}
                id="reset-confirm"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
                className={authInputClass}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button className={authPrimaryButtonClass} type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="size-4" />}
        Update password
      </Button>

      <p className="text-center text-xs text-slate-500">
        Didn&apos;t get a link?{" "}
        <Link prefetch={false} href="/forgot-password" className="font-medium text-sky-600 hover:text-sky-700">
          Request again
        </Link>
      </p>
    </form>
  );
}
