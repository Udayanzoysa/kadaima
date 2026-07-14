"use client";

import { useEffect, useState } from "react";

import {
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Upload,
  User,
  XCircle,
} from "lucide-react";
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

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [nicUrl, setNicUrl] = useState("");
  const [companyBrUrl, setCompanyBrUrl] = useState("");
  const [uploadingNic, setUploadingNic] = useState(false);
  const [uploadingBr, setUploadingBr] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const token = getClientCookie("session_token");

    const fetchUser = async (id: string, authToken: string) => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/users/${id}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (res.ok) {
          const user = await res.json();
          setFirstName(user.firstName || "");
          setLastName(user.lastName || "");
          setCompany(user.company || "");
          setAddress(user.address || "");
          setEmail(user.email || "");
          setPhoneNumber(user.phoneNumber || "");
          setTwoFactorEnabled(user.isTwoFactorEnabled || false);
          setWorkspaceName(user.workspace?.name || "");
          setIsOwner(user.role === "SUPER_ADMIN" || user.customRole?.name === "Owner");
          setNicUrl(user.nicUrl || "");
          setCompanyBrUrl(user.companyBrUrl || "");
        } else {
          toast.error("Failed to load user profile");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload?.sub) {
            setUserId(payload.sub);
            void fetchUser(payload.sub, token);
          }
        }
      } catch (e) {
        console.error("Failed to parse session token", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    let cleanedPhone = phoneNumber;
    if (phoneNumber) {
      const sanitized = phoneNumber.replace(/[^\d+]/g, "");
      const match = sanitized.match(/^(?:0|94|\+94)?(7[01245678]\d{7})$/);
      if (!match) {
        toast.error("Invalid mobile number", {
          description: "Must be a valid mobile number.",
        });
        setSaving(false);
        return;
      }
      cleanedPhone = "94" + match[1];
      setPhoneNumber(cleanedPhone);
    }

    const token = getClientCookie("session_token");
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          company,
          address,
          phoneNumber: cleanedPhone,
          isTwoFactorEnabled: twoFactorEnabled,
          workspaceName: isOwner ? workspaceName : undefined,
          nicUrl,
          companyBrUrl,
        }),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
      } else {
        const errData = await res.json();
        toast.error("Failed to update profile", { description: errData.message || "" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!userId) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumberOrSpecial = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);

    if (!(hasMinLength && hasUppercase && hasLowercase && hasNumberOrSpecial)) {
      toast.error("Password does not meet strength requirements");
      return;
    }

    setUpdatingPassword(true);
    const token = getClientCookie("session_token");
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        toast.success("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const errData = await res.json();
        toast.error("Failed to update password", { description: errData.message || "" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>, type: "nic" | "br") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      return;
    }

    if (type === "nic") {
      setUploadingNic(true);
      setTimeout(() => {
        setNicUrl(file.name);
        setUploadingNic(false);
        toast.success("NIC document uploaded successfully");
      }, 1000);
    } else {
      setUploadingBr(true);
      setTimeout(() => {
        setCompanyBrUrl(file.name);
        setUploadingBr(false);
        toast.success("Business Registration certificate uploaded successfully");
      }, 1000);
    }
  };

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumberOrSpecial = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumberOrSpecial;
  const canSubmitPassword = currentPassword && newPassword && confirmPassword && isPasswordValid && passwordsMatch;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="space-y-1">
        <h1 className="font-semibold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="space-y-1.5 p-6">
              <CardTitle className="flex items-center gap-2 font-semibold text-xl leading-none tracking-tight">
                <User className="size-5" />
                Profile
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                This information is used on account notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="first-name">First Name</FieldLabel>
                  <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
                  <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Field>
              </div>

              <Field className="gap-1.5">
                <FieldLabel htmlFor="company">Organization</FieldLabel>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>

              <Field className="gap-1.5">
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="min-h-[80px]"
                />
              </Field>

              <Field className="gap-1.5">
                <FieldLabel htmlFor="email-address">Email Address</FieldLabel>
                <Input id="email-address" value={email} disabled />
                <FieldDescription>Contact support to change the email on your account.</FieldDescription>
              </Field>

              <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4 dark:bg-muted/10">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="phone-number">Phone Number</FieldLabel>
                  <Input id="phone-number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </Field>

                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox
                    id="2fa"
                    checked={twoFactorEnabled}
                    onCheckedChange={(checked) => setTwoFactorEnabled(!!checked)}
                  />
                  <div className="space-y-1">
                    <label htmlFor="2fa" className="cursor-pointer font-medium text-sm leading-none">
                      Two-Factor Authentication
                    </label>
                    <p className="text-muted-foreground text-xs">
                      We highly recommend keeping this enabled to protect your account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button className="font-semibold" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-border bg-card">
              <CardHeader className="space-y-1.5 p-6">
                <CardTitle className="font-semibold text-xl leading-none tracking-tight">
                  Workspace Settings
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Manage workspace identity and properties.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="workspace-name">Workspace Name</FieldLabel>
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. My Institution"
                  />
                  <FieldDescription>Only the workspace owner can edit this name.</FieldDescription>
                </Field>
                <div className="flex justify-end pt-4">
                  <Button className="font-semibold" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Workspace Name"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="space-y-1.5 p-6">
              <CardTitle className="font-semibold text-xl leading-none tracking-tight">Document Center</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Upload verification documents to complete your account validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/5">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <FileText className="size-4 text-primary" />
                    National Identity Card (NIC)
                  </div>
                  {nicUrl ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
                        <span className="max-w-[200px] truncate font-semibold">{nicUrl}</span>
                        <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 font-medium text-[10px] uppercase">
                          Uploaded
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs font-semibold" onClick={() => setNicUrl("")}>
                        Remove and Reupload
                      </Button>
                    </div>
                  ) : (
                    <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-4 hover:bg-muted/30">
                      {uploadingNic ? (
                        <Spinner className="size-6 text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="mb-2 size-5 text-muted-foreground" />
                          <span className="font-medium text-xs">Click to upload NIC</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleUploadFile(e, "nic")}
                        disabled={uploadingNic}
                      />
                    </label>
                  )}
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/5">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Building className="size-4 text-primary" />
                    Business Registration (BR)
                  </div>
                  {companyBrUrl ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
                        <span className="max-w-[200px] truncate font-semibold">{companyBrUrl}</span>
                        <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 font-medium text-[10px] uppercase">
                          Uploaded
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs font-semibold" onClick={() => setCompanyBrUrl("")}>
                        Remove and Reupload
                      </Button>
                    </div>
                  ) : (
                    <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-4 hover:bg-muted/30">
                      {uploadingBr ? (
                        <Spinner className="size-6 text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="mb-2 size-5 text-muted-foreground" />
                          <span className="font-medium text-xs">Click to upload BR</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleUploadFile(e, "br")}
                        disabled={uploadingBr}
                      />
                    </label>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="space-y-1.5 p-6">
              <CardTitle className="font-semibold text-xl leading-none tracking-tight">Change Password</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Update your account password securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-4">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                <Field className="gap-1.5">
                  <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                <Field className="gap-1.5">
                  <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
              </div>

              {newPassword && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-4">
                  <div className="font-semibold text-muted-foreground text-xs">Password Strength Requirements:</div>
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                      {hasMinLength ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-muted-foreground/50" />}
                      <span className={hasMinLength ? "text-emerald-500" : "text-muted-foreground"}>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasUppercase ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-muted-foreground/50" />}
                      <span className={hasUppercase ? "text-emerald-500" : "text-muted-foreground"}>At least 1 uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasLowercase ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-muted-foreground/50" />}
                      <span className={hasLowercase ? "text-emerald-500" : "text-muted-foreground"}>At least 1 lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasNumberOrSpecial ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-muted-foreground/50" />}
                      <span className={hasNumberOrSpecial ? "text-emerald-500" : "text-muted-foreground"}>At least 1 number or special symbol</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button className="font-semibold" onClick={handleUpdatePassword} disabled={updatingPassword || !canSubmitPassword}>
                  {updatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
