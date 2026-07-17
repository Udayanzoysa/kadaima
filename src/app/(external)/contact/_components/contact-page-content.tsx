"use client";

import { useState } from "react";

import { GraduationCap, Headset, Send, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { I18nProvider } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { value: "student", label: "Student support" },
  { value: "teacher", label: "Teachers & schools" },
  { value: "billing", label: "Payments & billing" },
  { value: "other", label: "General inquiry" },
] as const;

const SUPPORT_CARDS = [
  {
    title: "Student Support",
    description: "Help with quizzes, courses, or technical issues.",
    email: "support@kadaima.lk",
    meta: "Mon - Sat: 8:00 AM - 6:00 PM",
    icon: Headset,
  },
  {
    title: "Teachers & Schools",
    description: "Onboarding help, school-wide licenses, and collaboration.",
    email: "partners@kadaima.lk",
    meta: "Dedicated portal access available.",
    icon: GraduationCap,
  },
  {
    title: "Payments & Billing",
    description: "Queries regarding subscriptions, invoices, or refunds.",
    email: "billing@kadaima.lk",
    meta: "Response within 24 business hours.",
    icon: WalletCards,
  },
] as const;

const fieldClass =
  "h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:border-[#2b7fff] focus-visible:ring-[#2b7fff]/20";

export function ContactPageContent() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !subject || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    const topic = SUBJECTS.find((s) => s.value === subject)?.label || subject;
    const mailto = `mailto:support@kadaima.lk?subject=${encodeURIComponent(
      `[Kadaima] ${topic}`,
    )}&body=${encodeURIComponent(
      `Name: ${fullName.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
    )}`;
    setSending(true);
    window.location.href = mailto;
    toast.success("Opening your email app…");
    setTimeout(() => setSending(false), 800);
  };

  return (
    <I18nProvider>
      <PublicQuizShell>
        <div className="relative flex-1 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top_left,_rgba(43,127,255,0.16),_transparent_55%),radial-gradient(ellipse_at_top,_rgba(186,220,255,0.35),_transparent_50%)]"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
            <header className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
              <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-[#123a6b] md:text-4xl">
                Get in Touch
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 md:text-base">
                Whether you&apos;re a student seeking academic clarity or a teacher aiming to empower
                your classroom, our team is here to support your journey towards excellence.
              </p>
            </header>

            <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
              <form
                onSubmit={onSubmit}
                className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-8"
              >
                <div className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col items-center">
                  <BrandLogo className="h-9 w-auto md:h-10" priority />
                  <h2 className="mt-4 text-center text-lg font-semibold text-[#123a6b]">
                    Send us a Message
                  </h2>

                  <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name" className="text-slate-700">
                        Full Name
                      </Label>
                      <Input
                        id="contact-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="E.g. Kamal Perera"
                        className={fieldClass}
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email" className="text-slate-700">
                        Email Address
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="kamal@example.com"
                        className={fieldClass}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="mt-4 w-full space-y-1.5">
                    <Label htmlFor="contact-subject" className="text-slate-700">
                      Subject
                    </Label>
                    <Select value={subject || undefined} onValueChange={setSubject}>
                      <SelectTrigger id="contact-subject" className={cn(fieldClass, "w-full")}>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-4 flex min-h-0 w-full flex-1 flex-col space-y-1.5">
                    <Label htmlFor="contact-message" className="text-slate-700">
                      Your Message
                    </Label>
                    <Textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help you today?"
                      className="min-h-28 w-full flex-1 rounded-xl border-slate-200 bg-white shadow-none focus-visible:border-[#2b7fff] focus-visible:ring-[#2b7fff]/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="brand"
                    disabled={sending}
                    className="mt-6 h-11 w-full shrink-0 px-5 font-semibold sm:w-auto"
                  >
                    {sending ? "Opening…" : "Send Message"}
                    <Send className="size-4" />
                  </Button>
                </div>
              </form>

              <div className="flex h-full flex-col gap-4">
                {SUPPORT_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.title}
                      className="flex flex-1 items-center rounded-2xl border border-[#d7e8ff] bg-[#eef6ff] p-5"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2b7fff] shadow-sm">
                          <Icon className="size-5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-semibold text-slate-900">{card.title}</h3>
                          <p className="text-sm text-slate-500">{card.description}</p>
                          <a
                            href={`mailto:${card.email}`}
                            className="inline-block text-sm font-medium text-[#2b7fff] hover:underline"
                          >
                            {card.email}
                          </a>
                          <p className="text-xs text-slate-400">{card.meta}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </PublicQuizShell>
    </I18nProvider>
  );
}
