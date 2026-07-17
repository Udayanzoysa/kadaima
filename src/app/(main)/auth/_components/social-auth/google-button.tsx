"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { setClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

type AccountType = "student" | "teacher";

interface GoogleButtonProps {
  className?: string;
  /** Where to go after login. Defaults to /admin. */
  redirectTo?: string;
  /**
   * Used only when Google creates a brand-new account.
   * Existing users keep their current role/permissions.
   */
  accountType?: AccountType;
}

function GoogleSignInControl({
  className,
  redirectTo = "/admin",
  accountType = "student",
}: GoogleButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const finishWithToken = (accessToken: string) => {
    setClientCookie("session_token", accessToken, 7);
    toast.success("Signed in with Google");
    router.push(redirectTo);
  };

  const onSuccess = async (credential?: string) => {
    if (!credential) {
      toast.error("Google sign-in failed", {
        description: "No credential returned from Google.",
      });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential, accountType }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || "Google sign-in failed.";
        throw new Error(errMsg);
      }

      if (result.requires2FA && result.preAuthToken) {
        toast.info("Two-Factor Authentication required", {
          description: "Enter the code from your authenticator app on the login form.",
        });
        // Fall back to password login path for 2FA — store nothing; ask user to use email login
        // Or we could navigate with preAuth — for now show clear message.
        throw new Error(
          "This account has 2FA enabled. Sign in with email and password, then enter your code.",
        );
      }

      if (!result.accessToken) {
        throw new Error("Invalid response from the authentication server.");
      }
      finishWithToken(result.accessToken);
    } catch (error) {
      toast.error("Google sign-in failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      {busy ? (
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600">
          <Spinner className="size-4" />
          Signing in with Google…
        </div>
      ) : (
        <div className="flex w-full justify-center overflow-hidden rounded-xl [&_iframe]:!w-full">
          <GoogleLogin
            onSuccess={(res) => void onSuccess(res.credential)}
            onError={() =>
              toast.error("Google sign-in failed", {
                description: "Popup closed or Google rejected the request.",
              })
            }
            useOneTap={false}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="352"
          />
        </div>
      )}
    </div>
  );
}

export function GoogleButton(props: GoogleButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500",
          props.className,
        )}
      >
        Google sign-in not configured
      </button>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleSignInControl {...props} />
    </GoogleOAuthProvider>
  );
}
