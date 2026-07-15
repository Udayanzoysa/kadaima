"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Clock3, Lock, Play, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichHtml } from "@/components/ui/rich-text-editor";
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
import { QuizUnlockModal } from "../../_components/quiz-unlock-modal";

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
  const { locale } = useI18n();

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

  useEffect(() => {
    (async () => {
      const token = getClientCookie("session_token");
      if (!token) {
        setAuthUser(null);
        setAuthChecking(false);
        const lead = getOrCreateGuestLead();
        if (lead?.studentName) {
          setStudentName(lead.studentName);
          setSchool(lead.school);
          setMobileNumber(lead.mobileNumber);
          setEmail(lead.email ?? "");
        }
        return;
      }

      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          deleteClientCookie("session_token");
          setAuthUser(null);
          return;
        }
        const me = (await res.json()) as AuthUser;
        setAuthUser(me);
        // Logged-in users should not reuse stale guest lead cookies/details.
        clearGuestLead();
      } catch {
        deleteClientCookie("session_token");
        setAuthUser(null);
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

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
      toast.error("Please log in again to start.");
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
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(body?.message || "Could not start the quiz.");
      }
      const attempt = await res.json();
      sessionStorage.setItem(`auth_attempt_${quizId}`, attempt.id);
      sessionStorage.removeItem(`guest_attempt_${quizId}`);
      router.push(`/quiz/${quizId}/take`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the quiz.");
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
      toast.error("Name and school are required.");
      return;
    }
    if (!SL_MOBILE.test(mobileNumber.trim())) {
      toast.error("Enter a valid Sri Lankan mobile number (07XXXXXXXX).");
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
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Could not start the quiz.");
      }

      const attempt = await res.json();
      sessionStorage.setItem(`guest_attempt_${quizId}`, attempt.id);
      sessionStorage.removeItem(`auth_attempt_${quizId}`);
      router.push(`/quiz/${quizId}/take`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the quiz.");
      setStarting(false);
    }
  };

  if (loading || authChecking) {
    return (
      <PublicQuizShell>
        <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
          <Spinner className="size-7" />
          Loading quiz...
        </div>
      </PublicQuizShell>
    );
  }

  if (error || !quiz) {
    return (
      <PublicQuizShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-slate-600">{error ?? "Quiz not found."}</p>
          <Button asChild className="rounded-xl bg-[#2b7fff] font-semibold hover:bg-[#1f6ae0]">
            <Link href="/">Back to quizzes</Link>
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
              Premium · LKR {Number(quiz.priceLkr ?? 0).toFixed(0)}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#2b7fff]">
              Feature Event
            </span>
          )}
          <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-2xl font-extrabold leading-tight md:text-3xl">
            {localize(quiz.title, locale)}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {quiz.durationMinutes} mins
            </span>
            <span>{quiz.questions.length} Questions</span>
            <span>
              {(quiz.maxAttempts ?? 1) === 1
                ? "1 attempt"
                : `Up to ${quiz.maxAttempts} attempts`}
            </span>
            <span>Pass {quiz.passingScorePercentage}%</span>
          </div>
        </section>

        {localize(quiz.description, locale) && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Description</h2>
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
              Unlock to attempt
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This quiz requires payment verification before you can start.
            </p>
            <Button
              size="lg"
              className="mt-5 rounded-xl bg-[#1e3a5f] font-semibold hover:bg-[#254a75]"
              onClick={() => setUnlockOpen(true)}
            >
              <Lock className="size-4" />
              Unlock · LKR {Number(quiz.priceLkr ?? 0).toFixed(0)}
            </Button>
          </section>
        ) : authUser ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2b7fff]">
                <UserRound className="size-6" />
              </span>
              <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">
                Ready to start
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Signed in as <span className="font-semibold text-slate-800">{authUser.name}</span>
                {authUser.email ? (
                  <>
                    {" "}
                    · <span className="text-slate-600">{authUser.email}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Your account details from the server will be used — no form needed.
              </p>
              <Button
                size="lg"
                disabled={starting}
                onClick={() => void startAsLoggedIn()}
                className="mt-5 w-full rounded-xl bg-[#2b7fff] font-bold text-white hover:bg-[#1f6ae0]"
              >
                {starting ? (
                  <>
                    <Spinner className="size-4" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Now
                    <Play className="size-4 fill-current" />
                  </>
                )}
              </Button>
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-center font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">
              Enter your details to start
            </h2>
            <p className="mt-1 text-center text-sm text-slate-500">
              No password needed.{" "}
              <Link href="/login" className="font-medium text-[#2b7fff] hover:underline">
                Already have an account? Log in
              </Link>
            </p>

            <form onSubmit={startQuiz} className="mx-auto mt-6 grid max-w-md gap-4">
              <div className="grid gap-2">
                <Label htmlFor="studentName">Full name *</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Saman Perera"
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="school">School *</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. Royal College Colombo"
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">Mobile number *</Label>
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
                <Label htmlFor="email">Email (optional)</Label>
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
                size="lg"
                disabled={starting}
                className="mt-2 rounded-xl bg-white font-bold text-[#2b7fff] ring-1 ring-[#2b7fff]/30 hover:bg-[#2b7fff]/5 md:bg-[#2b7fff] md:text-white md:ring-0 md:hover:bg-[#1f6ae0]"
              >
                {starting ? (
                  <>
                    <Spinner className="size-4" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Now
                    <Play className="size-4 fill-current" />
                  </>
                )}
              </Button>
            </form>
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
