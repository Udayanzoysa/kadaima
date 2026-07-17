"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Phone, Send } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { cn } from "@/lib/utils";

import {
  authInputGroupClass,
  authInputGroupControlClass,
  authPrimaryButtonClass,
} from "./auth-shell";

const formSchema = z
  .object({
    channel: z.enum(["EMAIL", "SMS"]),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
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
  });

type FormValues = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      channel: "EMAIL",
      email: "",
      phoneNumber: "",
    },
  });

  const channel = form.watch("channel");

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const body =
        data.channel === "EMAIL"
          ? { channel: "EMAIL", email: data.email?.trim() }
          : { channel: "SMS", phoneNumber: data.phoneNumber?.trim() };

      const response = await fetch(`${APP_CONFIG.apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || "Could not send reset code.";
        throw new Error(errMsg);
      }

      if (data.channel === "EMAIL") {
        toast.success("Check your email", {
          description:
            result.message ||
            "Open the email and click “Reset My Password”. The link expires in 10 minutes.",
        });
        return;
      }

      toast.success("Check your phone", {
        description: result.message || "A password reset code has been sent.",
      });

      const params = new URLSearchParams({ channel: "SMS" });
      if (data.phoneNumber) {
        params.set("phone", data.phoneNumber.trim());
      }
      router.push(`/reset-password?${params.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast.error(
        message.toLowerCase().includes("no user found") ? "No user found" : "Request failed",
        { description: message },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                <FieldLabel htmlFor="forgot-email" className="text-slate-600">
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
                    id="forgot-email"
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
                <FieldLabel htmlFor="forgot-phone" className="text-slate-600">
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
                    id="forgot-phone"
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
      </FieldGroup>

      <Button className={authPrimaryButtonClass} type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner className="size-4" /> : null}
        {channel === "EMAIL" ? "Send Recovery Link" : "Send reset code"}
        {!isSubmitting ? <Send className="size-4" /> : null}
      </Button>

      <p className="text-center text-xs text-slate-500">
        Already have a code?{" "}
        <Link prefetch={false} href="/reset-password" className="font-medium text-sky-600 hover:text-sky-700">
          Enter reset code
        </Link>
      </p>
    </form>
  );
}
