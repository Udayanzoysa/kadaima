"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Clock3, Lock, Play, UserRound } from "lucide-react";
import { toast } from "sonner";

import { GoogleButton } from "@/app/(main)/auth/_components/social-auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichHtml } from "@/components/ui/rich-text-editor";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { deleteClientCookie, getClientCookie } from "@/lib/cookie.client";
import {
  clearGuestLead,
  ensureGuestSessionId,
  getOrCreateGuestLead,
  saveGuestLead,
} from "@/lib/guest-session";
import { localize, type LocalizedText } from "@/types/quiz";

import { PublicQuizShell } from "../../_components/public-quiz-shell";

const QuizUnlockModal = dynamic(
  () => import("../../_components/quiz-unlock-modal").then((m) => m.QuizUnlockModal),
  { ssr: false },
);

interface PublicQuizDetailData {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  durationMinutes: number;
  passingScorePercentage: number;
  maxAttempts?: number;
  requiresUnlock?: boolean;
  priceLkr?: number | null;
  unlocked?: boolean;
  course: { id: string; title: LocalizedText | string };
  module?: { id: string; title: LocalizedText | string } | null;
  questions: { id: string }[];
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string | null;
  school?: string | null;
}

const SL_MOBILE = /^07\d{8}$/;

export function PublicQuizDetail() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();

  const [quiz, setQuiz] = useState<PublicQuizDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [studentName, setStudentName] = useState("");
  const [school, setSchool] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");

  const loadQuiz = async (userId?: string | null) => {
    const guestSessionId = ensureGuestSessionId();
    const userQ = userId ? `&userId=${encodeURIComponent(userId)}` : "";
    const res = await fetch(
      `${APP_CONFIG.apiUrl}/public/quizzes/${quizId}?guestSessionId=${encodeURIComponent(guestSessionId)}${userQ}`,
    );
    if (!res.ok) throw new Error("Quiz not found or not published.");
    setQuiz(await res.json());
  };

  const refreshAuthUser = async (): Promise<AuthUser | null> => {
    const token = getClientCookie("session_token");
    if (!token) {
      setAuthUser(null);
      const lead = getOrCreateGuestLead();
      if (lead?.studentName) {
        setStudentName(lead.studentName);
        setSchool(lead.school);
        setMobileNumber(lead.mobileNumber);
        setEmail(lead.email ?? "");
      }
      return null;
    }

    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        deleteClientCookie("session_token");
        setAuthUser(null);
        return null;
      }
      const me = (await res.json()) as AuthUser;
      setAuthUser(me);
      // Logged-in users should not reuse stale guest lead cookies/details.
      clearGuestLead();
      return me;
    } catch {
      deleteClientCookie("session_token");
      setAuthUser(null);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      await refreshAuthUser();
      setAuthChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignedIn = async () => {
    const me = await refreshAuthUser();
    try {
      await loadQuiz(me?.id);
    } catch {
      /* ignore — quiz was already loaded */
    }
    toast.success(t("public.readyToStart"));
  };

  useEffect(() => {
    if (authChecking) return;
    (async () => {
      try {
        await loadQuiz(authUser?.id);
        const payment = searchParams.get("payment");
        if (payment === "return") {
          toast.message("If you completed payment, unlock should update shortly.");
          await loadQuiz(authUser?.id);
        }
        if (payment === "cancel") {
          toast.message("Payment cancelled.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load quiz.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, authChecking, authUser?.id]);

  const locked = Boolean(quiz?.requiresUnlock) && quiz?.unlocked !== true;

  const startAsLoggedIn = async () => {
    if (locked) {
      setUnlockOpen(true);
      return;
    }
    const token = getClientCookie("session_token");
    if (!token || !authUser) {
      toast.error(t("public.pleaseLogInAgain"));
      deleteClientCookie("session_token");
      setAuthUser(null);
      return;
    }

    setStarting(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 401) {
          deleteClientCookie("session_token");
          setAuthUser(null);
          throw new Error(t("public.sessionExpired"));
        }
        throw new Error(body?.message || t("public.couldNotStart"));
      }
      const attempt = await res.json();
      sessionStorage.setItem(`auth_attempt_${quizId}`, attempt.id);
      sessionStorage.removeItem(`guest_attempt_${quizId}`);
      router.push(`/quiz/${quizId}/take`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("public.couldNotStart"));
      setStarting(false);
    }
  };

  const startQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
      setUnlockOpen(true);
      return;
    }
    if (!studentName.trim() || !school.trim()) {
      toast.error(t("public.nameSchoolRequired"));
      return;
    }
    if (!SL_MOBILE.test(mobileNumber.trim())) {
      toast.error(t("public.invalidMobile"));
      return;
    }

    setStarting(true);
    try {
      const lead = saveGuestLead({
        studentName: studentName.trim(),
        school: school.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || undefined,
      });

      const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/${quizId}/guest-attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestSessionId: lead.guestSessionId,
          studentName: lead.studentName,
          school: lead.school,
          mobileNumber: lead.mobileNumber,
          email: lead.email,
          userId: authUser?.id,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || t("public.couldNotStart"));
      }

      const attempt = await res.json();
      sessionStorage.setItem(`guest_attempt_${quizId}`, attempt.id);
      sessionStorage.removeItem(`auth_attempt_${quizId}`);
      router.push(`/quiz/${quizId}/take`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("public.couldNotStart"));
      setStarting(false);
    }
  };

  if (loading || authChecking) {
    return (
      <PublicQuizShell>
        <PublicContentSkeleton variant="detail" className="flex-1 py-8" />
      </PublicQuizShell>
    );
  }

  if (error || !quiz) {
    return (
      <PublicQuizShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-slate-600">{error ?? t("public.quizNotFound")}</p>
          <Button asChild variant="brand" className="font-semibold">
            <Link href="/">{t("public.backToQuizzes")}</Link>
          </Button>
        </div>
      </PublicQuizShell>
    );
  }

  const courseTitle = localize(quiz.course.title as LocalizedText, locale);
  const moduleTitle = quiz.module
    ? localize(quiz.module.title as LocalizedText, locale)
    : null;

  return (
    <PublicQuizShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <p className="mb-4 text-sm text-slate-500">
          {courseTitle}
          {moduleTitle ? (
            <>
              {" · "}
              <span className="font-medium text-slate-800">{moduleTitle}</span>
            </>
          ) : null}
        </p>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2b7fff] via-[#3b9eff] to-[#5ec4c0] p-6 text-white shadow-[0_20px_50px_-24px_rgba(43,127,255,0.55)] md:p-8">
          {locked ? (
            <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#2b7fff]">
              {t("public.premium").replace("{price}", Number(quiz.priceLkr ?? 0).toFixed(0))}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#2b7fff]">
              {t("public.featureEvent")}
            </span>
          )}
          <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-2xl font-extrabold leading-tight md:text-3xl">
            {localize(quiz.title, locale)}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {t("public.mins").replace("{count}", String(quiz.durationMinutes))}
            </span>
            <span>{t("public.questionsCount").replace("{count}", String(quiz.questions.length))}</span>
            <span>
              {(quiz.maxAttempts ?? 1) === 1
                ? t("public.oneAttempt")
                : t("public.upToAttempts").replace("{count}", String(quiz.maxAttempts))}
            </span>
            <span>
              {t("public.passPercent").replace("{percent}", String(quiz.passingScorePercentage))}
            </span>
          </div>
        </section>

        {localize(quiz.description, locale) && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">{t("public.description")}</h2>
            <div className="mt-2 text-sm text-slate-600">
              <RichHtml
                html={localize(quiz.description, locale)}
                className="prose-slate prose-headings:text-slate-900"
              />
            </div>
          </section>
        )}

        {locked ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm md:p-6">
            <Lock className="mx-auto size-8 text-slate-400" />
            <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">
              {t("public.unlockToAttempt")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t("public.unlockHint")}</p>
            <Button
              variant="brand"
              size="lg"
              className="mt-5 w-full font-semibold sm:w-auto"
              onClick={() => setUnlockOpen(true)}
            >
              <Lock className="size-4" />
              {t("public.unlockPrice").replace("{price}", Number(quiz.priceLkr ?? 0).toFixed(0))}
            </Button>
          </section>
        ) : authUser ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2b7fff]">
                <UserRound className="size-6" />
              </span>
              <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">
                {t("public.readyToStart")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("public.signedInAs")}{" "}
                <span className="font-semibold text-slate-800">{authUser.name}</span>
                {authUser.email ? (
                  <>
                    {" "}
                    · <span className="text-slate-600">{authUser.email}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-xs text-slate-400">{t("public.accountDetailsHint")}</p>
              <Button
                variant="brand"
                size="lg"
                disabled={starting}
                onClick={() => void startAsLoggedIn()}
                className="mt-5 w-full font-bold"
              >
                {starting ? (
                  <>
                    <Spinner className="size-4" />
                    {t("public.starting")}
                  </>
                ) : (
                  <>
                    {t("public.startNow")}
                    <Play className="size-4 fill-current" />
                  </>
                )}
              </Button>
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-center font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">
              {t("public.enterDetails")}
            </h2>
            <p className="mt-1 text-center text-sm text-slate-500">
              {t("public.noPasswordNeeded")}{" "}
              <Link href="/login" className="font-medium text-[#2b7fff] hover:underline">
                {t("public.alreadyHaveAccount")}
              </Link>
            </p>

            <form onSubmit={startQuiz} className="mx-auto mt-6 grid max-w-md gap-4">
              <div className="grid gap-2">
                <Label htmlFor="studentName">{t("public.fullName")}</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={t("public.fullNamePlaceholder")}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="school">{t("public.school")}</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder={t("public.schoolPlaceholder")}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">{t("public.mobile")}</Label>
                <Input
                  id="mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="07XXXXXXXX"
                  inputMode="numeric"
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("public.emailOptional")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl"
                />
              </div>

              <Button
                type="submit"
                variant="brand"
                size="lg"
                disabled={starting}
                className="mt-2 w-full font-bold"
              >
                {starting ? (
                  <>
                    <Spinner className="size-4" />
                    {t("public.starting")}
                  </>
                ) : (
                  <>
                    {t("public.startNow")}
                    <Play className="size-4 fill-current" />
                  </>
                )}
              </Button>
            </form>

            <div className="mx-auto mt-4 grid max-w-md gap-4">
              <div className="relative text-center text-xs text-slate-400 after:absolute after:inset-0 after:top-1/2 after:border-t after:border-slate-200">
                <span className="relative z-10 bg-white px-2">{t("public.or")}</span>
              </div>

              <GoogleButton accountType="student" onSuccess={() => void handleGoogleSignedIn()} />
            </div>
          </section>
        )}
      </main>

      <QuizUnlockModal
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        quiz={{
          id: quiz.id,
          title: localize(quiz.title, locale),
          priceLkr: quiz.priceLkr ?? null,
        }}
        onUnlocked={async (quizId) => {
          try {
            await loadQuiz(authUser?.id);
          } catch {
            /* ignore */
          }
          // Already on quiz page — refresh is enough; start stays unlocked.
          void quizId;
        }}
      />
    </PublicQuizShell>
  );
}
