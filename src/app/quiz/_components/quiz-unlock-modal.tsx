"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";

import {
  Camera,
  Gift,
  Lock,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie, setClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId, getOrCreateGuestLead, saveGuestLead } from "@/lib/guest-session";
import {
  readUnlockLeadCookie,
  saveUnlockLeadCookie,
} from "@/lib/unlock-lead-cookie";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    payhere?: {
      onCompleted: ((orderId: string) => void) | null;
      onDismissed: (() => void) | null;
      onError: ((error: string) => void) | null;
      startPayment: (payment: Record<string, string | boolean | number>) => void;
    };
  }
}

function loadPayHereScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("PayHere only runs in the browser."));
      return;
    }
    if (window.payhere) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-payhere]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load PayHere.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.payhere.lk/lib/payhere.js";
    script.async = true;
    script.dataset.payhere = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayHere."));
    document.body.appendChild(script);
  });
}

const SL_MOBILE = /^07\d{8}$/;

const fieldClass =
  "h-11 w-full rounded-xl border border-[#cfe0f5] bg-[#eef5ff] px-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2b7fff] focus:bg-white focus:ring-2 focus:ring-[#2b7fff]/20";

const labelClass = "text-[13px] font-medium text-slate-600";

export interface UnlockQuizTarget {
  id: string;
  title: string;
  priceLkr: number | null;
}

type ModalStep = "account" | "pay";
type AccountMode = "login" | "register";

interface QuizUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: UnlockQuizTarget | null;
  onUnlocked: (quizId: string) => void;
}

export function QuizUnlockModal({
  open,
  onOpenChange,
  quiz,
  onUnlocked,
}: QuizUnlockModalProps) {
  const [step, setStep] = useState<ModalStep>("account");
  const [accountMode, setAccountMode] = useState<AccountMode>("register");
  const [paying, setPaying] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [school, setSchool] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState("");
  const [slipNote, setSlipNote] = useState("");
  const slipInputRef = useRef<HTMLInputElement>(null);

  const resetPayHereHandlers = useCallback(() => {
    if (!window.payhere) return;
    window.payhere.onCompleted = null;
    window.payhere.onDismissed = null;
    window.payhere.onError = null;
  }, []);

  const checkAlreadyUnlocked = async (token: string): Promise<boolean> => {
    if (!quiz) return false;
    try {
      const meRes = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) return false;
      const me = await meRes.json();
      const guestSessionId = ensureGuestSessionId();
      const accessRes = await fetch(
        `${APP_CONFIG.apiUrl}/public/quizzes/${quiz.id}/access?guestSessionId=${encodeURIComponent(guestSessionId)}&userId=${encodeURIComponent(me.id)}`,
      );
      if (!accessRes.ok) return false;
      const access = await accessRes.json();
      return Boolean(access.unlocked);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!open) {
      setPaying(false);
      setAuthBusy(false);
      resetPayHereHandlers();
      return;
    }

    const token = getClientCookie("session_token");
    setAccountMode("register");
    setVoucherCode("");
    setSlipFile(null);
    setBankReference("");
    setSlipNote("");

    const lead = getOrCreateGuestLead();
    const cookieLead = readUnlockLeadCookie();
    setStudentName(cookieLead?.studentName || lead?.studentName || "");
    setSchool(cookieLead?.school || lead?.school || "");
    setMobileNumber(cookieLead?.mobileNumber || lead?.mobileNumber || "");
    setEmail(cookieLead?.email || lead?.email || "");
    setPassword("");
    setConfirmPassword("");

    if (!token) {
      setStep("account");
      return;
    }

    setStep("pay");
    setAuthBusy(true);
    void (async () => {
      const unlocked = await checkAlreadyUnlocked(token);
      if (unlocked && quiz) {
        toast.success("This quiz is already unlocked for your account.");
        onUnlocked(quiz.id);
        onOpenChange(false);
      }
      setAuthBusy(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quiz?.id, resetPayHereHandlers]);

  const persistLeadDetails = () => {
    const payload = {
      studentName: studentName.trim(),
      school: school.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim() || undefined,
    };
    saveUnlockLeadCookie(payload);
    if (payload.studentName && payload.school && payload.mobileNumber) {
      saveGuestLead(payload);
    }
  };

  const loginExisting = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Enter email and password to log in.");
      return;
    }
    setAuthBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || "Invalid login credentials.";
        setAccountMode("register");
        toast.message("Account not found or password incorrect", {
          description: "Create a student account with your details to continue.",
        });
        throw new Error(msg);
      }
      if (result.requires2FA) {
        toast.error("This account requires 2FA. Please log in from /login first.");
        return;
      }
      if (!result.accessToken) throw new Error("Invalid login response.");
      setClientCookie("session_token", result.accessToken, 7);
      persistLeadDetails();

      const unlocked = await checkAlreadyUnlocked(result.accessToken);
      if (unlocked && quiz) {
        toast.success("Already unlocked — opening quiz.");
        onUnlocked(quiz.id);
        onOpenChange(false);
        return;
      }

      toast.success("Logged in");
      setStep("pay");
    } catch {
      /* register switch already toasted */
    } finally {
      setAuthBusy(false);
    }
  };

  const registerAndContinue = async () => {
    if (!studentName.trim() || !school.trim()) {
      toast.error("Name and school are required.");
      return;
    }
    if (!SL_MOBILE.test(mobileNumber.trim())) {
      toast.error("Enter a valid Sri Lankan mobile number (07XXXXXXXX).");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    persistLeadDetails();
    setAuthBusy(true);
    try {
      const regRes = await fetch(`${APP_CONFIG.apiUrl}/auth/register/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName.trim(),
          email: email.trim(),
          password,
        }),
      });
      const regBody = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        const msg = Array.isArray(regBody.message)
          ? regBody.message.join(", ")
          : regBody.message || "Registration failed.";
        if (String(msg).toLowerCase().includes("already") || regRes.status === 409) {
          setAccountMode("login");
          toast.message("Account already exists", {
            description: "Log in with your password to continue.",
          });
          return;
        }
        throw new Error(msg);
      }

      const loginRes = await fetch(`${APP_CONFIG.apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const loginBody = await loginRes.json();
      if (!loginRes.ok || !loginBody.accessToken) {
        toast.success("Account created. Please log in.");
        setAccountMode("login");
        return;
      }
      setClientCookie("session_token", loginBody.accessToken, 7);
      const unlocked = await checkAlreadyUnlocked(loginBody.accessToken);
      if (unlocked && quiz) {
        toast.success("Already unlocked — opening quiz.");
        onUnlocked(quiz.id);
        onOpenChange(false);
        return;
      }
      toast.success("Account ready");
      setStep("pay");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setAuthBusy(false);
    }
  };

  const authHeaders = (): HeadersInit | null => {
    const token = getClientCookie("session_token");
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

  const requireAuth = () => {
    if (!getClientCookie("session_token")) {
      setStep("account");
      toast.error("Please log in before unlocking.");
      return false;
    }
    return true;
  };

  const redeemVoucher = async () => {
    if (!quiz) return;
    if (!requireAuth()) return;
    if (voucherCode.trim().length < 3) {
      toast.error("Enter a voucher code.");
      return;
    }
    const headers = authHeaders();
    if (!headers) return;
    const guestSessionId = ensureGuestSessionId();
    setPaying(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/public/payments/voucher/redeem`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          guestSessionId,
          code: voucherCode.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message || "Could not redeem voucher.",
        );
      }
      toast.success("Voucher applied — quiz unlocked!");
      onUnlocked(quiz.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not redeem voucher.");
    } finally {
      setPaying(false);
    }
  };

  const submitBankSlip = async (file?: File | null) => {
    if (!quiz) return;
    if (!requireAuth()) return;
    const fileToUpload = file ?? slipFile;
    if (!fileToUpload) {
      toast.error("Choose a bank slip image or PDF.");
      return;
    }
    if (!bankReference.trim()) {
      toast.error("Enter the bank-reference number before uploading.");
      return;
    }
    const headers = authHeaders();
    if (!headers) return;
    const guestSessionId = ensureGuestSessionId();
    setPaying(true);
    try {
      const form = new FormData();
      form.append("file", fileToUpload);
      form.append("quizId", quiz.id);
      form.append("guestSessionId", guestSessionId);
      form.append("bankReference", bankReference.trim());
      if (slipNote.trim()) form.append("note", slipNote.trim());

      const res = await fetch(`${APP_CONFIG.apiUrl}/public/payments/slips`, {
        method: "POST",
        headers,
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message || "Could not submit bank slip.",
        );
      }
      toast.success("Bank slip submitted for admin review.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit bank slip.");
    } finally {
      setPaying(false);
    }
  };

  const payWithPayHere = async () => {
    if (!quiz) return;
    if (!requireAuth()) return;
    const headers = authHeaders();
    if (!headers) return;

    const guestSessionId = ensureGuestSessionId();
    const lead = getOrCreateGuestLead();
    const cookieLead = readUnlockLeadCookie();

    setPaying(true);
    try {
      const meRes = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, { headers });
      const me = meRes.ok
        ? await meRes.json().catch(() => null)
        : null;

      const res = await fetch(`${APP_CONFIG.apiUrl}/public/payments/payhere/checkout`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          guestSessionId,
          firstName:
            (me?.name || cookieLead?.studentName || lead?.studentName || "Student").split(" ")[0],
          lastName:
            (me?.name || cookieLead?.studentName || lead?.studentName || "")
              .split(" ")
              .slice(1)
              .join(" ") || "Student",
          email: me?.email || cookieLead?.email || lead?.email || email || undefined,
          phone:
            me?.phoneNumber ||
            cookieLead?.mobileNumber ||
            lead?.mobileNumber ||
            mobileNumber ||
            undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message || "Could not start payment.",
        );
      }

      const payment = await res.json();
      await loadPayHereScript();

      if (!window.payhere) {
        throw new Error("PayHere SDK failed to load.");
      }

      window.payhere.onCompleted = async (orderId: string) => {
        try {
          const tokenHeaders = authHeaders();
          if (payment.sandbox && tokenHeaders) {
            await fetch(`${APP_CONFIG.apiUrl}/public/payments/payhere/sandbox-complete`, {
              method: "POST",
              headers: { ...tokenHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                guestSessionId,
              }),
            });
          }
          const userId = me?.id
            ? `&userId=${encodeURIComponent(me.id)}`
            : "";
          const accessRes = await fetch(
            `${APP_CONFIG.apiUrl}/public/quizzes/${quiz.id}/access?guestSessionId=${encodeURIComponent(guestSessionId)}${userId}`,
          );
          if (accessRes.ok) {
            const access = await accessRes.json();
            if (access.unlocked) {
              toast.success("Quiz unlocked!");
              onUnlocked(quiz.id);
              onOpenChange(false);
              return;
            }
          }
          toast.success("Payment received. Unlocking…");
          onUnlocked(quiz.id);
          onOpenChange(false);
        } catch {
          toast.error("Payment completed but unlock failed. Refresh and try again.");
        } finally {
          setPaying(false);
          resetPayHereHandlers();
        }
      };

      window.payhere.onDismissed = () => {
        setPaying(false);
        resetPayHereHandlers();
        toast.message("Payment cancelled.");
      };

      window.payhere.onError = (error: string) => {
        setPaying(false);
        resetPayHereHandlers();
        toast.error(error || "Payment failed.");
      };

      window.payhere.startPayment(payment);
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Could not start payment.");
    }
  };

  const priceLabel =
    quiz?.priceLkr != null
      ? `LKR ${Number(quiz.priceLkr).toLocaleString("en-LK", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`
      : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-h-[92vh] gap-0 overflow-y-auto border-0 p-0 shadow-2xl sm:max-w-[420px]",
          step === "account"
            ? "rounded-2xl bg-[#eaf1ff] text-slate-900"
            : "rounded-2xl bg-white text-slate-900",
        )}
      >
        {step === "account" && (
          <div className="p-5 sm:p-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-3 pr-8">
                <Image
                  src="/brand/kadaima-logo.png"
                  alt="Kadaima"
                  width={120}
                  height={32}
                  className="h-7 w-auto"
                />
                <DialogTitle className="font-[family-name:var(--font-outfit)] text-xl font-bold text-[#123a6b]">
                  Sign in to unlock
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-slate-500">
                Log in or create a student account before payment.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-[#d7e6fb] p-1">
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-semibold transition",
                  accountMode === "register"
                    ? "border border-[#9ec5f5] bg-white text-[#2b7fff] shadow-sm"
                    : "text-slate-500",
                )}
                onClick={() => setAccountMode("register")}
              >
                Create account
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-semibold transition",
                  accountMode === "login"
                    ? "border border-[#9ec5f5] bg-white text-[#2b7fff] shadow-sm"
                    : "text-slate-500",
                )}
                onClick={() => setAccountMode("login")}
              >
                Log in
              </button>
            </div>

            {accountMode === "register" && (
              <div className="mt-5 grid gap-3.5">
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-name" className={labelClass}>
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="unlock-name"
                    className={fieldClass}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Saman Perera"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-school" className={labelClass}>
                    School <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="unlock-school"
                    className={fieldClass}
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. Royal College Colombo"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-mobile" className={labelClass}>
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="unlock-mobile"
                    className={fieldClass}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="07XXXXXXXX"
                    inputMode="numeric"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-email" className={labelClass}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="unlock-email"
                    type="email"
                    className={fieldClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-password" className={labelClass}>
                    Password <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    id="unlock-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn(fieldClass, "pr-10")}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-confirm" className={labelClass}>
                    Confirm password <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    id="unlock-confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn(fieldClass, "pr-10")}
                  />
                </div>
                <Button
                  className="mt-2 h-12 w-full rounded-xl bg-[#2b9dff] text-base font-bold text-white hover:bg-[#1f8eeb]"
                  disabled={authBusy}
                  onClick={() => void registerAndContinue()}
                >
                  {authBusy ? (
                    <>
                      <Spinner className="size-4" />
                      Creating account…
                    </>
                  ) : (
                    "Continue to payment"
                  )}
                </Button>
              </div>
            )}

            {accountMode === "login" && (
              <div className="mt-5 grid gap-3.5">
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-login-email" className={labelClass}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="unlock-login-email"
                    type="email"
                    className={fieldClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="unlock-login-password" className={labelClass}>
                    Password <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    id="unlock-login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn(fieldClass, "pr-10")}
                  />
                </div>
                <Button
                  className="mt-2 h-12 w-full rounded-xl bg-[#2b9dff] text-base font-bold text-white hover:bg-[#1f8eeb]"
                  disabled={authBusy}
                  onClick={() => void loginExisting()}
                >
                  {authBusy ? (
                    <>
                      <Spinner className="size-4" />
                      Logging in…
                    </>
                  ) : (
                    "Continue to payment"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "pay" && authBusy && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <Spinner className="size-7 text-[#2b7fff]" />
            <p className="text-sm text-slate-500">Checking your unlock status…</p>
          </div>
        )}

        {step === "pay" && !authBusy && (
          <div>
            <div className="space-y-5 p-5 sm:p-6">
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-outfit)] text-xl font-bold text-[#123a6b]">
                  <Lock className="size-5 text-[#123a6b]" />
                  Unlock Quiz
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  Pay to unlock{" "}
                  <span className="font-semibold text-slate-700">
                    &apos;{quiz?.title || "this quiz"}&apos;
                  </span>{" "}
                  and start attempting.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl bg-[#eef6ff] px-4 py-3">
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Price
                </p>
                <p className="mt-0.5 text-2xl font-bold text-[#2b7fff]">{priceLabel}</p>
              </div>

              <Button
                className="h-12 w-full rounded-xl bg-[#2b9dff] text-base font-bold text-white hover:bg-[#1f8eeb]"
                disabled={paying || !quiz}
                onClick={() => void payWithPayHere()}
              >
                {paying ? (
                  <>
                    <Spinner className="size-4" />
                    Opening PayHere…
                  </>
                ) : (
                  <>
                    <WalletCards className="size-5" />
                    Pay with PayHere
                  </>
                )}
              </Button>

              <div className="relative py-1 text-center">
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                <span className="relative bg-white px-3 text-xs font-medium text-slate-400">
                  Other unlock methods
                </span>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Gift className="size-4 text-[#2b7fff]" />
                  Have a promo code?
                </p>
                <div className="flex gap-2">
                  <input
                    className={cn(fieldClass, "bg-white")}
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                  />
                  <Button
                    type="button"
                    className="h-11 shrink-0 rounded-xl bg-[#2b9dff] px-5 font-semibold text-white hover:bg-[#1f8eeb]"
                    disabled={paying || !quiz}
                    onClick={() => void redeemVoucher()}
                  >
                    Verify
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Camera className="size-4 text-[#2b7fff]" />
                  Upload bank slip
                </p>
                <input
                  className={cn(fieldClass, "bg-white")}
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  placeholder="bank-reference number"
                />
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => {
                    if (!bankReference.trim()) {
                      toast.error("Enter the bank-reference number first.");
                      return;
                    }
                    slipInputRef.current?.click();
                  }}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-[#f7f9fc] px-4 py-8 text-center transition hover:border-[#2b7fff]/50 hover:bg-[#eef6ff]"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-white text-[#2b7fff] shadow-sm ring-1 ring-slate-200">
                    <Camera className="size-5" />
                  </div>
                  <span className="text-sm text-slate-500">
                    {paying ? "Uploading…" : slipFile ? slipFile.name : "Click to upload image"}
                  </span>
                </button>
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSlipFile(file);
                    e.target.value = "";
                    if (file) void submitBankSlip(file);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-[#d6e8ff] bg-[#eef6ff] px-4 py-3">
              <ShieldCheck className="size-3.5 text-slate-400" />
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Secure 128-bit encrypted transaction
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
