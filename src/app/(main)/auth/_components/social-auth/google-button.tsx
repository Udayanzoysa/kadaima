"use client";

import { useEffect, useRef, useState } from "react";

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { notifyAuthChanged, postLoginPath } from "@/lib/auth-redirect";
import { setClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

type AccountType = "student" | "teacher";

interface GoogleButtonProps {
  className?: string;
  /** Where to go after login. Defaults by role (students → /, staff → /admin). */
  redirectTo?: string;
  /**
   * Used only when Google creates a brand-new account.
   * Existing users keep their current role/permissions.
   */
  accountType?: AccountType;
  /** Called instead of navigating when provided (e.g. unlock modal). */
  onSuccess?: () => void;
}

/** Google GIS allows up to 400px; match the auth form column. */
const GOOGLE_BTN_MIN = 200;
const GOOGLE_BTN_MAX = 400;

function GoogleSignInControl({
  className,
  redirectTo,
  accountType = "student",
  onSuccess,
}: GoogleButtonProps) {
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = Math.floor(el.getBoundingClientRect().width);
      if (width <= 0) return;
      // Google paints the outline inside the iframe; using the full container
      // width often clips the right border by 1px (subpixel / rounding).
      const usable = Math.max(GOOGLE_BTN_MIN, Math.min(GOOGLE_BTN_MAX, width - 2));
      setButtonWidth(usable);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const finishWithToken = (accessToken: string) => {
    setClientCookie("session_token", accessToken, 7);
    notifyAuthChanged();
    toast.success("Signed in with Google");
    if (onSuccess) {
      onSuccess();
      setBusy(false);
      return;
    }
    const dest =
      redirectTo ??
      postLoginPath(accessToken, accountType === "teacher" ? "/admin/default" : "/");
    // Full navigation so public shell reloads auth state (Welcome button).
    window.location.assign(dest);
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
        throw new Error(
          "This account has 2FA enabled. Sign in with email and password, then enter your code.",
        );
      }

      if (!result.accessToken) {
        throw new Error("Invalid response from the authentication server.");
      }
      // Keep inline spinner until hard navigation completes.
      finishWithToken(result.accessToken);
    } catch (error) {
      toast.error("Google sign-in failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {busy ? (
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 shadow-sm">
          <Spinner className="size-4" />
          Signing in with Google…
        </div>
      ) : buttonWidth == null ? (
        <div
          aria-hidden
          className="h-11 w-full rounded-xl border border-slate-300 bg-white shadow-sm"
        />
      ) : (
        <div className="flex w-full justify-center overflow-visible">
          <GoogleLogin
            key={buttonWidth}
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
            logo_alignment="left"
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
