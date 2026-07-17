"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";
import { Send, X } from "lucide-react";
import { siWhatsapp } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
}

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Floating "Ask Kadaima Expert" chat widget — mounted once in PublicQuizShell
 * so it appears on every public page. Talks to the lms-api `/support/chat`
 * endpoint (same brain as whatsapp-bot.js). Also offers a "Chat on WhatsApp"
 * deep link so visitors can continue on their phone with the linked bot number.
 */
const FAB_SIZE = "h-14 w-14 min-h-14 min-w-14";

export function SupportChatWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useMemo(() => randomId(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const whatsappUrl = APP_CONFIG.whatsappUrl;

  useEffect(() => {
    try {
      if (sessionStorage.getItem("kadaima-chat-seen") === "1") {
        setHasUnread(false);
        return;
      }
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => setShowTeaser(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const openChat = () => {
    setShowTeaser(false);
    setHasUnread(false);
    try {
      sessionStorage.setItem("kadaima-chat-seen", "1");
    } catch {
      /* ignore */
    }
    setOpen(true);
    setMessages((prev) =>
      prev.length > 0
        ? prev
        : [{ id: randomId(), role: "assistant", text: t("public.chat.greeting") }],
    );
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { id: randomId(), role: "user", text }]);
    setSending(true);

    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/support/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });
      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: randomId(), role: "assistant", text: data.reply ?? t("public.chat.errorMessage") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: randomId(), role: "assistant", text: t("public.chat.errorMessage"), isError: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed right-4 bottom-20 z-50 flex flex-col items-end gap-3 md:right-6 md:bottom-6">
      {open ? (
        <div className="flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-slate-200 border-b bg-gradient-to-r from-[#0b2a4a] to-[#2b7fff] px-4 py-3 text-white">
            <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-white/10">
              <Image src="/brand/kadaima-expert-bot.png" alt="" fill className="object-cover" sizes="36px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sm">{t("public.chat.title")}</p>
              <p className="truncate text-[11px] text-white/80">{t("public.chat.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("public.chat.close")}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2 font-medium text-emerald-700 text-xs transition hover:bg-emerald-100"
              title={t("public.chat.whatsappHint")}
            >
              <SimpleIcon icon={siWhatsapp} className="size-3.5 fill-current" />
              {t("public.chat.whatsapp")}
            </a>
          ) : null}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f4f7fb] px-3 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-[#2b7fff] text-white"
                      : message.isError
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-slate-200 bg-white text-slate-700",
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-slate-400 text-xs italic">
                  {t("public.chat.typing")}
                </div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex items-center gap-2 border-slate-200 border-t bg-white p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("public.chat.placeholder")}
              disabled={sending}
              className="h-9 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none focus-visible:border-[#2b7fff] focus-visible:ring-2 focus-visible:ring-[#2b7fff]/20 disabled:opacity-60"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              className="size-9 shrink-0 rounded-full bg-[#2b7fff] hover:bg-[#1f6fe6]"
              aria-label={t("public.chat.send")}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : hasUnread && showTeaser ? (
        <button
          type="button"
          onClick={openChat}
          className="max-w-[16rem] animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-[#2b7fff]/25 bg-white px-3.5 py-2.5 text-left shadow-lg duration-300"
        >
          <p className="font-semibold text-[#2b7fff] text-[11px] uppercase tracking-wide">
            {t("public.chat.unreadLabel")}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[#123a6b] text-sm leading-snug">
            {t("public.chat.teaserMessage")}
          </p>
        </button>
      ) : null}

      {!open ? (
        <div className="flex items-end gap-3">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("public.chat.whatsapp")}
              title={t("public.chat.whatsappHint")}
              className={cn(
                FAB_SIZE,
                "box-border flex shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-2 ring-[#25D366]/35 transition hover:scale-105 hover:bg-[#1ebe57]",
              )}
            >
              <SimpleIcon icon={siWhatsapp} className="size-7 fill-white" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={openChat}
            aria-label={t("public.chat.bubbleLabel")}
            className={cn(
              FAB_SIZE,
              "relative box-border shrink-0 rounded-full bg-[#2b7fff] shadow-xl ring-2 ring-[#2b7fff]/35 transition hover:scale-105",
            )}
          >
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <Image
                src="/brand/kadaima-expert-bot.png"
                alt={t("public.chat.bubbleLabel")}
                fill
                className="scale-[1.35] object-cover"
                sizes="56px"
              />
            </span>
            {hasUnread ? (
              <span className="absolute -top-1 -right-1 z-10 flex size-5 items-center justify-center rounded-full bg-red-500 font-bold text-[11px] text-white shadow-md ring-2 ring-white">
                1
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-60" aria-hidden />
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}
