"use client";

import { useEffect, useState } from "react";

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

export default function UserProfilePage() {
  // Profile data states
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

  useEffect(() => {
    const token = getClientCookie("session_token");
    const fetchUser = async (id: string, token: string) => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/users/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
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
        toast.error("Invalid Sri Lankan mobile number", {
          description: "Must be a valid mobile number starting with 07, 947, +947, or 7 with a valid operator code.",
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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-1">
      <Card className="border-border bg-card">
        <CardHeader className="space-y-1.5 p-6">
          <CardTitle className="font-semibold text-2xl leading-none tracking-tight">Profile</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            This information is used on invoices and account notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="first-name">First Name</FieldLabel>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Nil"
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Kamal"
              />
            </Field>
          </div>

          {/* Company */}
          <Field className="gap-1.5">
            <FieldLabel htmlFor="company">Company</FieldLabel>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Company name"
            />
          </Field>

          {/* Address */}
          <Field className="gap-1.5">
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-h-[100px]"
              placeholder="Your physical address"
            />
          </Field>

          {/* Email Address */}
          <Field className="gap-1.5">
            <FieldLabel htmlFor="email-address">Email Address</FieldLabel>
            <Input id="email-address" value={email} disabled className="cursor-not-allowed bg-muted/40 opacity-80" />
            <FieldDescription>Contact support to change the email on your account.</FieldDescription>
          </Field>

          {/* SMS Security Sub-Card */}
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/5">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="phone-number">Phone Number</FieldLabel>
              <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 94775075179"
              />
            </Field>

            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="2fa-sms"
                checked={twoFactorEnabled}
                onCheckedChange={(checked) => setTwoFactorEnabled(!!checked)}
              />
              <div className="space-y-1">
                <label htmlFor="2fa-sms" className="cursor-pointer font-medium text-sm leading-none">
                  Enabled
                </label>
                <p className="text-muted-foreground text-xs">
                  We highly recommend keeping this ON to protect your account.
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
    </div>
  );
}
