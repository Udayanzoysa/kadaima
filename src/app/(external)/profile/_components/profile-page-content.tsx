"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { KeyRound, Save, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { authInputClass } from "@/app/(main)/auth/_components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { I18nProvider, useI18n } from "@/hooks/use-i18n";
import { deleteClientCookie, getClientCookie } from "@/lib/cookie.client";

interface ProfileData {
  name: string;
  email: string;
  phoneNumber: string | null;
  school: string | null;
  team: string | null;
}

function ProfilePageInner() {
  const router = useRouter();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          deleteClientCookie("session_token");
          router.push("/login");
          return;
        }
        const data: ProfileData = await res.json();
        setProfile(data);
        setName(data.name || "");
        setPhoneNumber(data.phoneNumber || "");
        setSchool(data.school || "");
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getClientCookie("session_token");
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phoneNumber, school }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || t("public.profilePage.updateError"));
      }
      setProfile(body);
      toast.success(t("public.profilePage.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("public.profilePage.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("public.profilePage.passwordMismatch"));
      return;
    }
    const token = getClientCookie("session_token");
    if (!token) return;
    setChangingPassword(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || t("public.profilePage.passwordUpdateError"));
      }
      toast.success(t("public.profilePage.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("public.profilePage.passwordUpdateError"),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || !profile) {
    return (
      <PublicQuizShell>
        <PublicContentSkeleton variant="form" />
      </PublicQuizShell>
    );
  }

  return (
    <PublicQuizShell>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef6ff] text-[#2b7fff]">
            <UserIcon className="size-5" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900 md:text-3xl">
              {t("public.profilePage.title")}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{t("public.profilePage.subtitle")}</p>
          </div>
        </div>

        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <FieldGroup className="gap-4">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="profile-email" className="text-slate-600">
                {t("public.profilePage.emailLabel")}
              </FieldLabel>
              <Input id="profile-email" value={profile.email} disabled className={authInputClass} />
              <p className="text-xs text-slate-400">{t("public.profilePage.emailHint")}</p>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="profile-name" className="text-slate-600">
                {t("public.profilePage.nameLabel")}
              </FieldLabel>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={authInputClass}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="profile-phone" className="text-slate-600">
                {t("public.profilePage.phoneLabel")}
              </FieldLabel>
              <Input
                id="profile-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="07XXXXXXXX"
                className={authInputClass}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="profile-school" className="text-slate-600">
                {t("public.profilePage.schoolLabel")}
              </FieldLabel>
              <Input
                id="profile-school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className={authInputClass}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" variant="brand" className="mt-5 w-full font-semibold" disabled={saving}>
            {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
            {saving ? t("public.profilePage.saving") : t("public.profilePage.save")}
          </Button>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-outfit)] text-lg font-semibold text-slate-900">
            <KeyRound className="size-4.5 text-[#2b7fff]" />
            {t("public.profilePage.changePasswordTitle")}
          </h2>
          <FieldGroup className="mt-4 gap-4">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="current-password" className="text-slate-600">
                {t("public.profilePage.currentPassword")}
              </FieldLabel>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={authInputClass}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="new-password" className="text-slate-600">
                {t("public.profilePage.newPassword")}
              </FieldLabel>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={authInputClass}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="confirm-password" className="text-slate-600">
                {t("public.profilePage.confirmPassword")}
              </FieldLabel>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={authInputClass}
              />
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            variant="brandOutline"
            className="mt-5 w-full font-semibold"
            disabled={changingPassword || !currentPassword || !newPassword}
          >
            {changingPassword && <Spinner className="size-4" />}
            {changingPassword ? t("public.profilePage.updatingPassword") : t("public.profilePage.updatePassword")}
          </Button>
        </form>
      </main>
    </PublicQuizShell>
  );
}

export function ProfilePageContent() {
  return (
    <I18nProvider>
      <ProfilePageInner />
    </I18nProvider>
  );
}
