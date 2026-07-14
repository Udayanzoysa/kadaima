"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { setClientCookie } from "@/lib/cookie.client";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

export function LoginForm() {
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

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
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
        setClientCookie("session_token", result.accessToken, data.remember ? 30 : 7);
        toast.success("Logged in successfully!");
        router.push("/admin");
      } else {
        throw new Error("Invalid response schema from the authentication server.");
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Please check your credentials and try again.";
      toast.error("Login failed", {
        description: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FAVerify = async () => {
    if (otpValue.length < 6) return;
    setIsSubmitting(true);
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

      // 2FA Verified! Set cookie and redirect
      setClientCookie("session_token", result.accessToken, 7);
      toast.success("MFA authentication successful!");
      router.push("/admin");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "The verification code is incorrect or has expired.";
      toast.error("Verification failed", {
        description: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (show2FA) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="space-y-1">
          <div className="font-medium text-sm">Verify your Identity</div>
          <div className="text-muted-foreground text-xs">
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
            className="w-1/3"
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
            className="w-2/3"
            onClick={handle2FAVerify}
            disabled={isSubmitting || otpValue.length < 6}
          >
            {isSubmitting && <Spinner className="mr-2" />}
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
              <FieldLabel htmlFor="login-email">Email Address</FieldLabel>
              <Input
                {...field}
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
              />
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
                <FieldLabel htmlFor="login-remember" className="font-normal">
                  Remember me for 30 days
                </FieldLabel>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="mr-2" />}
        Login
      </Button>
    </form>
  );
}
