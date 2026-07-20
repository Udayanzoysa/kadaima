"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CalendarDays, Camera, Gift, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { AccountRegisterForm } from "@/app/(main)/auth/_components/account-register-form";
import { LoginForm } from "@/app/(main)/auth/_components/login-form";
import { GoogleButton } from "@/app/(main)/auth/_components/social-auth/google-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { ensureGuestSessionId, getOrCreateGuestLead } from "@/lib/guest-session";
import { readUnlockLeadCookie } from "@/lib/unlock-lead-cookie";
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

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#1563b8] focus:ring-2 focus:ring-[#1563b8]/25";

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
  const [accountMode, setAccountMode] = useState<AccountMode>("login");
  const [paying, setPaying] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const [monthlyFee, setMonthlyFee] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<"MIXED" | "MONTHLY_ONLY" | "QUIZ_ONLY">("MIXED");
  const [voucherCode, setVoucherCode] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState("");
  const [slipNote, setSlipNote] = useState("");
  const slipInputRef = useRef<HTMLInputElement>(null);

  const isSpecialPriced =
    quiz?.priceLkr != null && Number.isFinite(Number(quiz.priceLkr)) && Number(quiz.priceLkr) > 0;
  const useQuizPay =
    paymentMode === "QUIZ_ONLY" || (paymentMode === "MIXED" && isSpecialPriced);
  const useSubPay = !useQuizPay;

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
    setAccountMode("login");
    setVoucherCode("");
    setSlipFile(null);
    setBankReference("");
    setSlipNote("");

    void (async () => {
      try {
        const feeRes = await fetch(`${APP_CONFIG.apiUrl}/public/billing/monthly-fee`);
        if (feeRes.ok) {
          const feeBody = await feeRes.json();
          setMonthlyFee(Number(feeBody.monthlyStudentFeeLkr) || 0);
          const mode = String(feeBody.paymentMode || "MIXED").toUpperCase();
          if (mode === "MONTHLY_ONLY" || mode === "QUIZ_ONLY" || mode === "MIXED") {
            setPaymentMode(mode);
          }
        }
      } catch {
        /* ignore */
      }
    })();

    if (!token) {
      setStep("account");
      return;
    }

    setStep("pay");
    setAuthBusy(true);
    void (async () => {
      try {
        const unlocked = await checkAlreadyUnlocked(token);
        if (unlocked && quiz) {
          toast.success("This quiz is already unlocked for your account.");
          onUnlocked(quiz.id);
          onOpenChange(false);
          return;
        }

        const subRes = await fetch(`${APP_CONFIG.apiUrl}/public/payments/subscription/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subRes.ok) {
          const sub = await subRes.json();
          if (typeof sub.monthlyStudentFeeLkr === "number") {
            setMonthlyFee(sub.monthlyStudentFeeLkr);
          }
          const mode = String(sub.paymentMode || paymentMode).toUpperCase();
          const resolvedMode =
            mode === "MONTHLY_ONLY" || mode === "QUIZ_ONLY" || mode === "MIXED"
              ? mode
              : paymentMode;
          setPaymentMode(resolvedMode);

          const special =
            quiz?.priceLkr != null &&
            Number.isFinite(Number(quiz.priceLkr)) &&
            Number(quiz.priceLkr) > 0;
          const coveredBySub =
            sub.active &&
            (resolvedMode === "MONTHLY_ONLY" || (resolvedMode === "MIXED" && !special));

          if (coveredBySub && quiz) {
            toast.success("Your subscription is active — this quiz is unlocked.");
            onUnlocked(quiz.id);
            onOpenChange(false);
          }
        }
      } finally {
        setAuthBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quiz?.id, resetPayHereHandlers]);

  const afterAuthSuccess = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) {
      setStep("account");
      return;
    }
    setAuthBusy(true);
    try {
      const unlocked = await checkAlreadyUnlocked(token);
      if (unlocked && quiz) {
        toast.success("Already unlocked — opening quiz.");
        onUnlocked(quiz.id);
        onOpenChange(false);
        return;
      }
      setStep("pay");
    } finally {
      setAuthBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id, onUnlocked, onOpenChange]);

  const authHeaders = (): Record<string, string> | null => {
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

  const startPayHere = async (
    payment: Record<string, string | boolean | number>,
    guestSessionId: string,
    successMessage: string,
  ) => {
    if (!quiz) return;
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
        toast.success(successMessage);
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
  };

  const checkoutCustomer = async (headers: Record<string, string>) => {
    const meRes = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, { headers });
    const me = meRes.ok ? await meRes.json().catch(() => null) : null;
    const lead = getOrCreateGuestLead();
    const cookieLead = readUnlockLeadCookie();
    return {
      firstName: (me?.name || cookieLead?.studentName || lead?.studentName || "Student").split(
        " ",
      )[0],
      lastName:
        (me?.name || cookieLead?.studentName || lead?.studentName || "")
          .split(" ")
          .slice(1)
          .join(" ") || "Student",
      email: me?.email || cookieLead?.email || lead?.email || undefined,
      phone: me?.phoneNumber || cookieLead?.mobileNumber || lead?.mobileNumber || undefined,
    };
  };

  const paySubscription = async () => {
    if (!quiz) return;
    if (!requireAuth()) return;
    const headers = authHeaders();
    if (!headers) return;

    const guestSessionId = ensureGuestSessionId();
    setPaying(true);
    try {
      const customer = await checkoutCustomer(headers);
      const res = await fetch(`${APP_CONFIG.apiUrl}/public/payments/subscription/checkout`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ guestSessionId, ...customer }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message || "Could not start subscription payment.",
        );
      }

      const payment = await res.json();
      await startPayHere(
        payment,
        guestSessionId,
        paymentMode === "MONTHLY_ONLY"
          ? "Subscription active — all locked quizzes unlocked for 30 days!"
          : "Subscription active — locked quizzes without a special price are unlocked for 30 days!",
      );
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Could not start payment.");
    }
  };

  const payQuiz = async () => {
    if (!quiz) return;
    if (!requireAuth()) return;
    const headers = authHeaders();
    if (!headers) return;

    const guestSessionId = ensureGuestSessionId();
    setPaying(true);
    try {
      const customer = await checkoutCustomer(headers);
      const res = await fetch(`${APP_CONFIG.apiUrl}/public/payments/payhere/checkout`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          guestSessionId,
          ...customer,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message || "Could not start quiz payment.",
        );
      }

      const payment = await res.json();
      await startPayHere(payment, guestSessionId, "Payment successful — this quiz is unlocked!");
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Could not start payment.");
    }
  };

  const displayAmount = useQuizPay ? (quiz?.priceLkr ?? null) : monthlyFee;
  const priceLabel =
    displayAmount != null
      ? `LKR ${Number(displayAmount).toLocaleString("en-LK", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`
      : "—";

  const renewAtLabel = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(92vh,780px)] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-2xl sm:max-w-[420px]",
        )}
      >
        {step === "account" && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DialogHeader className="space-y-2 text-center sm:text-center">
              <BrandLogo className="mx-auto h-9 w-auto" />
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                {accountMode === "login" ? "Welcome back" : "Student registration"}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                {accountMode === "login"
                  ? "Sign in with your email and password to continue."
                  : "Create a student account to unlock quizzes and track your attempts."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  accountMode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
                onClick={() => setAccountMode("login")}
              >
                Log in
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  accountMode === "register"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
                onClick={() => setAccountMode("register")}
              >
                Create account
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {accountMode === "login" ? (
                <LoginForm onSuccess={() => void afterAuthSuccess()} />
              ) : (
                <AccountRegisterForm
                  accountType="student"
                  onSuccess={() => void afterAuthSuccess()}
                />
              )}

              <div className="relative text-center text-xs text-slate-400 after:absolute after:inset-0 after:top-1/2 after:border-t after:border-slate-200">
                <span className="relative z-10 bg-white px-2">or</span>
              </div>

              <GoogleButton
                accountType="student"
                onSuccess={() => void afterAuthSuccess()}
              />
            </div>
          </div>
        )}

        {step === "pay" && authBusy && (
          <div className="space-y-3 px-6 py-10" aria-busy="true" aria-label="Checking unlock status">
            <Skeleton className="h-5 w-40 bg-slate-200/80" />
            <Skeleton className="h-4 w-full bg-slate-200/70" />
            <Skeleton className="h-24 w-full rounded-xl bg-slate-200/70" />
            <Skeleton className="h-11 w-full rounded-xl bg-slate-200/80" />
          </div>
        )}

        {step === "pay" && !authBusy && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-3.5 sm:space-y-3 sm:p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <DialogHeader className="space-y-0.5 pr-6 text-left">
                <DialogTitle className="font-[family-name:var(--font-outfit)] text-base font-bold text-[#123a6b] sm:text-lg">
                  {useQuizPay ? "Unlock this quiz" : "Monthly subscription"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 sm:text-sm">
                  {useQuizPay ? (
                    <>
                      Pay once to unlock{" "}
                      <span className="font-semibold text-slate-700">
                        {quiz?.title ? `'${quiz.title}'` : "this quiz"}
                      </span>
                      {paymentMode === "MIXED"
                        ? " (special price — not covered by monthly subscription)."
                        : "."}
                    </>
                  ) : (
                    <>
                      Unlock{" "}
                      <span className="font-semibold text-slate-700">
                        {paymentMode === "MONTHLY_ONLY"
                          ? "all locked quizzes"
                          : "locked quizzes without a special price"}
                      </span>{" "}
                      for 30 days
                      {quiz?.title ? <> (incl. &apos;{quiz.title}&apos;)</> : null}.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eef6ff] px-3.5 py-2.5">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    {useQuizPay ? "Quiz price" : "Monthly fee"}
                  </p>
                  <p className="text-xl font-bold text-[#1563b8]">{priceLabel}</p>
                </div>
                {!useQuizPay ? (
                  <p className="flex items-center gap-1 text-[11px] text-slate-500">
                    <CalendarDays className="size-3.5 shrink-0" />
                    Renew at {renewAtLabel}
                  </p>
                ) : null}
              </div>

              <Button
                variant="brand"
                className="h-10 w-full text-sm font-bold"
                disabled={
                  paying ||
                  !quiz ||
                  (useQuizPay ? !isSpecialPriced : monthlyFee == null)
                }
                onClick={() => void (useQuizPay ? payQuiz() : paySubscription())}
              >
                {paying ? (
                  <>
                    <Spinner className="size-4" />
                    Opening PayHere…
                  </>
                ) : (
                  <>
                    <WalletCards className="size-4" />
                    {useQuizPay ? "Pay with PayHere" : "Subscribe with PayHere"}
                  </>
                )}
              </Button>

              <div className="relative text-center">
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                <span className="relative bg-white px-2.5 text-[11px] font-medium text-slate-400">
                  Other payment options
                </span>
              </div>

              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Gift className="size-3.5 text-[#1563b8]" />
                  Have a promo code?
                </p>
                <div className="flex gap-2">
                  <input
                    className={cn(fieldClass, "h-9 bg-white text-sm")}
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                  />
                  <Button
                    type="button"
                    variant="brand"
                    className="h-9 shrink-0 px-3.5 text-sm font-semibold"
                    disabled={paying || !quiz}
                    onClick={() => void redeemVoucher()}
                  >
                    Verify
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Camera className="size-3.5 text-[#1563b8]" />
                  Upload bank slip
                </p>
                <input
                  className={cn(fieldClass, "h-9 bg-white text-sm")}
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-[#f7f9fc] px-3 py-2.5 text-center transition hover:border-[#1563b8]/50 hover:bg-[#eef6ff]"
                >
                  <Camera className="size-4 text-[#1563b8]" />
                  <span className="truncate text-xs text-slate-500">
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

            <div className="flex items-center justify-center gap-1.5 border-t border-[#d6e8ff] bg-[#eef6ff] px-3 py-2">
              <ShieldCheck className="size-3 text-slate-400" />
              <p className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                Secure 128-bit encrypted transaction
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
