"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const FAB_DOCK_KEY = "kadaima-fab-dock-open";

/** Inline WhatsApp mark — avoids pulling the full `simple-icons` package into the public bundle. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("fill-current", className)}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.85 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

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
const FAB_SIZE = "h-14 w-14 min-h-14 min-w-14 md:h-16 md:w-16 md:min-h-16 md:min-w-16";
/** Skip optimizer so the transparent circular badge renders correctly. */
const BOT_ICON_SRC = "/brand/kadaima-expert-bot.png";

function ChatBotAvatar({
  className,
  size,
  alt = "",
}: {
  className?: string;
  size: number;
  alt?: string;
}) {
  return (
    <Image
      src={BOT_ICON_SRC}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      unoptimized
      loading="lazy"
      draggable={false}
      className={cn(
        "pointer-events-none h-full w-full select-none object-contain",
        "drop-shadow-[0_8px_14px_rgba(11,42,74,0.32)]",
        className,
      )}
    />
  );
}

export function SupportChatWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  /** Mobile: FABs slide off-screen until the arrow expands them. Desktop always open. */
  const [dockOpen, setDockOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useMemo(() => randomId(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const whatsappUrl = APP_CONFIG.whatsappUrl;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(FAB_DOCK_KEY);
      if (stored === "1") setDockOpen(true);
      if (stored === "0") setDockOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleDock = () => {
    setDockOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(FAB_DOCK_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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
    <div className="pointer-events-none fixed right-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-3 overflow-visible md:right-5 md:bottom-6">
      {open ? (
        <div className="pointer-events-auto mx-3 flex h-[min(28rem,calc(100dvh-8rem))] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:mx-0">
          <div className="flex items-center gap-3 border-slate-200 border-b bg-gradient-to-r from-[#0b2a4a] to-[#1563b8] px-4 py-3 text-white">
            <div className="relative size-10 shrink-0 overflow-visible">
              <ChatBotAvatar size={40} />
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
              <WhatsAppIcon className="size-3.5" />
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
                      ? "bg-[#1563b8] text-white"
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
              className="h-9 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none focus-visible:border-[#1563b8] focus-visible:ring-2 focus-visible:ring-[#1563b8]/20 disabled:opacity-60"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              className="size-9 shrink-0 rounded-full bg-[#1563b8] hover:bg-[#114f94]"
              aria-label={t("public.chat.send")}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : hasUnread && showTeaser && dockOpen ? (
        <button
          type="button"
          onClick={openChat}
          className="pointer-events-auto mr-3 max-w-[min(16rem,calc(100vw-5rem))] animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-[#1563b8]/25 bg-white px-3.5 py-2.5 text-left shadow-lg duration-300 md:mr-0"
        >
          <p className="font-semibold text-[#1563b8] text-[11px] uppercase tracking-wide">
            {t("public.chat.unreadLabel")}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[#123a6b] text-sm leading-snug">
            {t("public.chat.teaserMessage")}
          </p>
        </button>
      ) : null}

      {!open ? (
        <>
          {/* Desktop — always visible, no toggle */}
          <div className="pointer-events-auto hidden items-end gap-3 md:flex">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("public.chat.whatsapp")}
                title={t("public.chat.whatsappHint")}
                className={cn(
                  FAB_SIZE,
                  "relative z-10 box-border flex shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-2 ring-[#25D366]/35 transition hover:scale-105 hover:bg-[#1ebe57]",
                )}
              >
                <WhatsAppIcon className="size-7 fill-white" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={openChat}
              aria-label={t("public.chat.bubbleLabel")}
              className={cn(
                FAB_SIZE,
                "relative z-10 box-border shrink-0 overflow-visible rounded-full bg-transparent transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1563b8]/45",
              )}
            >
              <span
                aria-hidden
                className="kadaima-chat-wave pointer-events-none absolute -inset-1 rounded-full border-2 border-[#5eb0ff]"
              />
              <span
                aria-hidden
                className="kadaima-chat-wave kadaima-chat-wave-delay pointer-events-none absolute -inset-1 rounded-full border-2 border-[#1563b8]/70"
              />
              <span className="relative z-[1] block size-full overflow-visible">
                <ChatBotAvatar alt={t("public.chat.bubbleLabel")} size={64} />
              </span>
              {hasUnread ? (
                <span className="absolute -top-0.5 -right-0.5 z-10 flex size-5 items-center justify-center rounded-full bg-red-500 font-bold text-[11px] text-white shadow-md ring-2 ring-white">
                  1
                </span>
              ) : null}
            </button>
          </div>

          {/* Mobile — arrow glued to right edge; icons slide out to its left */}
          <div className="pointer-events-auto flex items-center justify-end md:hidden">
            <div
              className={cn(
                "overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out",
                dockOpen ? "mr-1.5 max-w-[11.5rem] opacity-100" : "mr-0 max-w-0 opacity-0",
              )}
            >
              <div className="flex items-center gap-2 rounded-full bg-white/95 p-1.5 shadow-xl ring-1 ring-slate-200/90 backdrop-blur-sm">
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("public.chat.whatsapp")}
                    title={t("public.chat.whatsappHint")}
                    tabIndex={dockOpen ? 0 : -1}
                    className="box-border flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition active:scale-95"
                  >
                    <WhatsAppIcon className="size-6 fill-white" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={openChat}
                  aria-label={t("public.chat.bubbleLabel")}
                  tabIndex={dockOpen ? 0 : -1}
                  className="relative box-border size-12 shrink-0 overflow-visible rounded-full bg-[#eef6ff] transition active:scale-95"
                >
                  <span className="absolute inset-0.5">
                    <ChatBotAvatar alt={t("public.chat.bubbleLabel")} size={48} />
                  </span>
                  {hasUnread ? (
                    <span className="absolute -top-0.5 -right-0.5 z-10 flex size-4 items-center justify-center rounded-full bg-red-500 font-bold text-[9px] text-white shadow-md ring-2 ring-white">
                      1
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDock}
              aria-expanded={dockOpen}
              aria-label={dockOpen ? t("public.chat.collapseDock") : t("public.chat.expandDock")}
              className={cn(
                "relative z-20 flex h-12 w-8 shrink-0 items-center justify-center rounded-l-2xl border border-r-0 border-slate-200 bg-white text-[#1563b8] shadow-lg transition active:scale-95",
                hasUnread && !dockOpen && "ring-2 ring-red-400/45",
              )}
            >
              {dockOpen ? (
                <ChevronRight className="size-4" strokeWidth={2.5} />
              ) : (
                <ChevronLeft className="size-4" strokeWidth={2.5} />
              )}
              {hasUnread && !dockOpen ? (
                <span
                  className="absolute top-1.5 left-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
