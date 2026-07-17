"use client";

import { useEffect, useRef, useState } from "react";

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
  /** Called instead of navigating when provided (e.g. unlock modal). */
  onSuccess?: () => void;
}

function GoogleSignInControl({
  className,
  redirectTo = "/admin",
  accountType = "student",
  onSuccess,
}: GoogleButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(352);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setButtonWidth(Math.max(200, Math.min(352, Math.floor(width))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const finishWithToken = (accessToken: string) => {
    setClientCookie("session_token", accessToken, 7);
    toast.success("Signed in with Google");
    if (onSuccess) {
      onSuccess();
      return;
    }
    router.push(redirectTo);
  };

  const handleGoogleCredential = async (credential?: string) => {
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
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {busy ? (
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600">
          <Spinner className="size-4" />
          Signing in with Google…
        </div>
      ) : (
        <div className="flex w-full justify-center overflow-hidden rounded-xl [&_iframe]:!w-full">
          <GoogleLogin
            onSuccess={(res) => void handleGoogleCredential(res.credential)}
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
            width={buttonWidth}
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
