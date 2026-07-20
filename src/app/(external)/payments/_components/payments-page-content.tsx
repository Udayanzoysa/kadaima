"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileText,
  Ticket,
  Wallet,
} from "lucide-react";

import { PublicQuizShell } from "@/app/quiz/_components/public-quiz-shell";
import { PublicContentSkeleton } from "@/components/site/public-content-skeleton";
import { PublicEmptyState } from "@/components/site/public-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { deleteClientCookie, getClientCookie } from "@/lib/cookie.client";
import { formatCurrency } from "@/lib/utils";
import { localize, type LocalizedText, type SupportedLocale } from "@/types/quiz";

type PaymentMethod = "PayHere" | "Voucher" | "Slip" | "Subscription";

interface PaymentRow {
  id: string;
  method: PaymentMethod;
  status: string;
  amountLkr: number | null;
  title: LocalizedText | string | null;
  reference: string | null;
  createdAt: string;
}

interface MyPayments {
  lastPayment: PaymentRow | null;
  history: PaymentRow[];
  subscription: { active: boolean; expiresAt: string | null; startsAt: string | null };
}

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = {
  PayHere: CreditCard,
  Voucher: Ticket,
  Slip: FileText,
  Subscription: CalendarClock,
};

const SUCCESS_STATUSES = new Set(["Paid", "Unlocked", "Approved", "Active"]);
const WARN_STATUSES = new Set(["Pending"]);

function StatusBadge({ status }: { status: string }) {
  if (SUCCESS_STATUSES.has(status)) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{status}</Badge>
    );
  }
  if (WARN_STATUSES.has(status)) {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700">{status}</Badge>;
  }
  return <Badge variant="outline" className="border-slate-300 text-slate-600">{status}</Badge>;
}

function PaymentsPageInner() {
  const router = useRouter();
  const { locale, t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyPayments | null>(null);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/public/payments/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401) {
            deleteClientCookie("session_token");
            router.push("/login");
            return;
          }
          throw new Error("Failed to load payments.");
        }
        setData(await res.json());
      } catch {
        setData({ lastPayment: null, history: [], subscription: { active: false, expiresAt: null, startsAt: null } });
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading || !data) {
    return (
      <PublicQuizShell>
        <PublicContentSkeleton variant="form" />
      </PublicQuizShell>
    );
  }

  const money = (amount: number | null) =>
    amount == null ? "—" : formatCurrency(amount, { currency: "LKR", locale: "en-LK", noDecimals: true });

  return (
    <PublicQuizShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef6ff] text-[#1563b8]">
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900 md:text-3xl">
              {t("public.paymentsPage.title")}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{t("public.paymentsPage.subtitle")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#bcd8ff] bg-[#eef6ff] px-5 py-4 text-sm text-slate-700">
          {data.subscription.active && data.subscription.expiresAt ? (
            <p className="flex items-center gap-2 font-semibold text-[#1a5fcc]">
              <BadgeCheck className="size-4.5 shrink-0" />
              {t("public.paymentsPage.subscriptionActive").replace(
                "{date}",
                new Date(data.subscription.expiresAt).toLocaleDateString(),
              )}
            </p>
          ) : (
            <p className="text-slate-500">{t("public.paymentsPage.subscriptionInactive")}</p>
          )}
        </div>

        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            {t("public.paymentsPage.lastPayment")}
          </h2>
          {data.lastPayment ? (
            <PaymentCard row={data.lastPayment} locale={locale} money={money} highlight />
          ) : (
            <PublicEmptyState
              className="py-10"
              message={t("public.paymentsPage.noPayments")}
              ctaLabel={t("public.paymentsPage.browseQuizzes")}
              icon={Wallet}
            />
          )}
        </section>

        {data.history.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              {t("public.paymentsPage.historyTitle")}
            </h2>
            <div className="flex flex-col gap-3">
              {data.history.map((row) => (
                <PaymentCard key={row.id} row={row} locale={locale} money={money} />
              ))}
            </div>
          </section>
        )}
      </main>
    </PublicQuizShell>
  );
}

function PaymentCard({
  row,
  locale,
  money,
  highlight,
}: {
  row: PaymentRow;
  locale: SupportedLocale;
  money: (amount: number | null) => string;
  highlight?: boolean;
}) {
  const Icon = METHOD_ICON[row.method];
  return (
    <article
      className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:items-center sm:justify-between ${
        highlight ? "border-[#1563b8]/30" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef6ff] text-[#1563b8]">
          <Icon className="size-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {row.title ? localize(row.title, locale) : row.method}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {new Date(row.createdAt).toLocaleString()}
            {row.reference ? ` · ${row.reference}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-row-reverse items-center gap-3 sm:flex-row">
        <StatusBadge status={row.status} />
        <p className="text-sm font-bold text-slate-900">{money(row.amountLkr)}</p>
      </div>
    </article>
  );
}

export function PaymentsPageContent() {
  return <PaymentsPageInner />;
}
