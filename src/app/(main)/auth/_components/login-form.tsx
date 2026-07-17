"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Mail } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { setClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";
import { hideGlobalLoader, showGlobalLoader } from "@/stores/global-loader-store";

import {
  authInputClass,
  authInputGroupClass,
  authInputGroupControlClass,
  authPrimaryButtonClass,
} from "./auth-shell";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

interface LoginFormProps {
  /** Where to go after login. Defaults to /admin. */
  redirectTo?: string;
  /** Called instead of navigating when provided (e.g. unlock modal). */
  onSuccess?: () => void;
}

export function LoginForm({ redirectTo = "/admin", onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState("");
  const [otpValue, setOtpValue] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const finishLogin = (accessToken: string, remember?: boolean) => {
    setClientCookie("session_token", accessToken, remember ? 30 : 7);
    toast.success("Logged in successfully!");
    if (onSuccess) {
      onSuccess();
      return;
    }
    router.push(redirectTo);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    showGlobalLoader("Signing you in…");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || "Invalid login credentials.";
        throw new Error(errMsg);
      }

      if (result.requires2FA) {
        setPreAuthToken(result.preAuthToken);
        setShow2FA(true);
        toast.info("Two-Factor Authentication required", {
          description: "Please enter the TOTP code from your authenticator app.",
        });
      } else if (result.accessToken) {
        finishLogin(result.accessToken, data.remember);
      } else {
        throw new Error("Invalid response schema from the authentication server.");
      }
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Please check your credentials and try again.";
      toast.error("Login failed", {
        description: errMsg,
      });
    } finally {
      setIsSubmitting(false);
      hideGlobalLoader();
    }
  };

  const handle2FAVerify = async () => {
    if (otpValue.length < 6) return;
    setIsSubmitting(true);
    showGlobalLoader("Verifying…");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/auth/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preAuthToken}`,
        },
        body: JSON.stringify({ token: otpValue }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "2FA verification failed.");
      }

      finishLogin(result.accessToken, false);
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : "The verification code is incorrect or has expired.";
      toast.error("Verification failed", {
        description: errMsg,
      });
    } finally {
      setIsSubmitting(false);
      hideGlobalLoader();
    }
  };

  if (show2FA) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="space-y-1">
          <div className="font-medium text-sm text-slate-900">Verify your Identity</div>
          <div className="text-xs text-slate-500">
            Enter the 6-digit TOTP code from your Google Authenticator or secondary auth application.
          </div>
        </div>
        <div className="flex justify-center py-2">
          <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue} disabled={isSubmitting}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="flex w-full gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-1/3 rounded-xl"
            onClick={() => {
              setShow2FA(false);
              setPreAuthToken("");
              setOtpValue("");
            }}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="button"
            className={cn(authPrimaryButtonClass, "w-2/3")}
            onClick={handle2FAVerify}
            disabled={isSubmitting || otpValue.length < 6}
          >
            {isSubmitting && <Spinner className="size-4" />}
            Verify Code
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email" className="text-slate-600">
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
                  id="login-email"
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
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="login-password" className="text-slate-600">
                  Password
                </FieldLabel>
                <Link
                  prefetch={false}
                  href="/forgot-password"
                  className="text-xs font-medium text-[#2b7fff] hover:text-[#1f6ae0] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-slate-400" />
                <PasswordInput
                  {...field}
                  id="login-password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  className={cn(authInputClass, "pl-9")}
                />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="remember"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox
                id="login-remember"
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
              />
              <FieldContent>
                <FieldLabel htmlFor="login-remember" className="font-normal text-slate-600">
                  Remember me for 30 days
                </FieldLabel>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>
      <Button className={authPrimaryButtonClass} type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="size-4" />}
        Sign in
      </Button>
    </form>
  );
}
