"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Clock3, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichHtml } from "@/components/ui/rich-text-editor";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { getOrCreateGuestLead, saveGuestLead } from "@/lib/guest-session";
import { localize, type LocalizedText } from "@/types/quiz";

import { PublicQuizShell } from "../../_components/public-quiz-shell";

interface PublicQuizDetailData {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  durationMinutes: number;
  passingScorePercentage: number;
  course: { id: string; title: string };
  questions: { id: string }[];
}

const SL_MOBILE = /^07\d{8}$/;

export function PublicQuizDetail() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const router = useRouter();
  const { locale } = useI18n();

  const [quiz, setQuiz] = useState<PublicQuizDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [school, setSchool] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const lead = getOrCreateGuestLead();
    if (lead) {
      setStudentName(lead.studentName);
      setSchool(lead.school);
      setMobileNumber(lead.mobileNumber);
      setEmail(lead.email ?? "");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/public/quizzes/${quizId}`);
        if (!res.ok) throw new Error("Quiz not found or not published.");
        setQuiz(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load quiz.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const startQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.push(`/quiz/${quizId}/take`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the quiz.");
      setStarting(false);
    }
  };

  if (loading) {
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

  return (
    <PublicQuizShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <p className="mb-4 text-sm text-slate-500">
          Subject: <span className="font-medium text-slate-800">{quiz.course.title}</span>
        </p>

        {/* Hero summary card */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2b7fff] via-[#3b9eff] to-[#5ec4c0] p-6 text-white shadow-[0_20px_50px_-24px_rgba(43,127,255,0.55)] md:p-8">
          <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#2b7fff]">
            Feature Event
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-2xl font-extrabold leading-tight md:text-3xl">
            {localize(quiz.title, locale)}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {quiz.durationMinutes} mins
            </span>
            <span>{quiz.questions.length} Questions</span>
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

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-center font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">
            Enter your details to start
          </h2>
          <p className="mt-1 text-center text-sm text-slate-500">No password needed.</p>

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
      </main>
    </PublicQuizShell>
  );
}
