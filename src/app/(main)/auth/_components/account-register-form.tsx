"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";

import { authInputClass, authPrimaryButtonClass } from "./auth-shell";

const formSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Confirm password must be at least 8 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type AccountType = "student" | "teacher";

interface AccountRegisterFormProps {
  accountType: AccountType;
}

export function AccountRegisterForm({ accountType }: AccountRegisterFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTeacher = accountType === "teacher";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const endpoint = isTeacher ? "/auth/register/teacher" : "/auth/register/student";
      const response = await fetch(`${APP_CONFIG.apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || "Registration failed.";
        throw new Error(errMsg);
      }

      toast.success(isTeacher ? "Teacher account created" : "Student account created", {
        description: "You can log in now.",
      });
      router.push("/login");
    } catch (error) {
      toast.error("Registration failed", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-name" className="text-slate-600">
                Full name
              </FieldLabel>
              <Input
                {...field}
                id="register-name"
                type="text"
                placeholder={isTeacher ? "Nimal Silva" : "Saman Perera"}
                autoComplete="name"
                aria-invalid={fieldState.invalid}
                className={authInputClass}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-email" className="text-slate-600">
                Email
              </FieldLabel>
              <Input
                {...field}
                id="register-email"
                type="email"
                placeholder={isTeacher ? "teacher@school.com" : "student@school.com"}
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                className={authInputClass}
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
              <FieldLabel htmlFor="register-password" className="text-slate-600">
                Password
              </FieldLabel>
              <PasswordInput
                {...field}
                id="register-password"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
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
              <FieldLabel htmlFor="register-confirm-password" className="text-slate-600">
                Confirm password
              </FieldLabel>
              <PasswordInput
                {...field}
                id="register-confirm-password"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                className={authInputClass}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button className={authPrimaryButtonClass} type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="size-4" />}
        {isTeacher ? "Create teacher account" : "Create student account"}
      </Button>
    </form>
  );
}
