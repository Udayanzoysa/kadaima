"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  BookOpen,
  CreditCard,
  GraduationCap,
  PiggyBank,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type UserType = "Admin" | "Teacher" | "Student";

interface OverviewMetrics {
  totalStudents: number;
  totalTeachers: number;
  totalQuizzes: number;
  publishedQuizzes: number;
  activeUsers: number;
  activeSubscriptions: number;
  completedAttemptsMtd: number;
  paidRevenueMtdLkr: number;
  subscriptionRevenueMtdLkr: number;
  pendingSlips: number;
  pendingPayoutsLkr: number;
  lifetimeEarnedLkr: number;
  pendingPayoutLkr: number;
  paidOutLkr: number;
  completedAttempts?: number;
}

interface TrendPoint {
  key: string;
  label: string;
  subscriptionRevenueLkr: number;
  completedAttempts: number;
}

interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface PaymentRow {
  id: string;
  orderId: string;
  purpose: string;
  status: string;
  amountLkr: number;
  createdAt: string;
  user: { email: string; name: string } | null;
  quizTitle: unknown;
  guestSessionId: string | null;
}

interface TeacherRow {
  teacherUserId: string | null;
  name: string;
  email: string | null;
  attemptsMtd: number;
  lifetimeEarnedLkr: number;
}

interface QuizRow {
  quizId: string;
  title: string;
  totalAttempts: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  passingRate: number | null;
}

interface LatestPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossRevenueLkr: number;
  platformShareLkr: number;
  teacherPoolLkr: number;
  totalBillableAttempts: number;
  status: string;
}

interface OverviewData {
  userType: UserType;
  metrics: OverviewMetrics;
  latestPeriod: LatestPeriod | null;
  trend: TrendPoint[];
  payments: PageResult<PaymentRow>;
  topTeachers: PageResult<TeacherRow>;
  topQuizzes: PageResult<QuizRow>;
}

const chartConfig = {
  subscriptionRevenueLkr: {
    label: "Subscription revenue",
    color: "var(--chart-1)",
  },
  completedAttempts: {
    label: "Completed attempts",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function formatLkr(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `LKR ${n.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function quizTitleText(title: unknown): string {
  if (!title) return "—";
  if (typeof title === "string") return title;
  if (typeof title === "object" && title && "en" in title) {
    return String((title as { en?: string }).en || "—");
  }
  return "—";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toLowerCase();
  if (s === "paid" || s === "approved") return "default";
  if (s === "pending") return "secondary";
  if (s === "failed" || s === "cancelled" || s === "rejected") return "destructive";
  return "outline";
}

export function DashboardOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [teachersPage, setTeachersPage] = useState(1);
  const [quizzesPage, setQuizzesPage] = useState(1);
  const pageSize = 8;

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      const token = getClientCookie("session_token");
      if (!token) {
        setLoading(false);
        return;
      }
      if (opts?.soft) setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          paymentsPage: String(paymentsPage),
          paymentsPageSize: String(pageSize),
          teachersPage: String(teachersPage),
          teachersPageSize: String(pageSize),
          quizzesPage: String(quizzesPage),
          quizzesPageSize: String(pageSize),
        });
        const res = await fetch(`${APP_CONFIG.apiUrl}/dashboard/overview?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load dashboard overview");
        setData((await res.json()) as OverviewData);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load overview");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [paymentsPage, teachersPage, quizzesPage],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const isAdmin = data?.userType === "Admin";
  const isTeacher = data?.userType === "Teacher";

  const metricCards = useMemo(() => {
    if (!data) return [];
    const m = data.metrics;
    if (isAdmin) {
      return [
        {
          key: "students",
          label: "Students",
          value: m.totalStudents.toLocaleString(),
          hint: "Active student accounts",
          icon: GraduationCap,
        },
        {
          key: "teachers",
          label: "Teachers",
          value: m.totalTeachers.toLocaleString(),
          hint: "Instructors on the platform",
          icon: Users,
        },
        {
          key: "quizzes",
          label: "Quizzes",
          value: m.totalQuizzes.toLocaleString(),
          hint: `${m.publishedQuizzes} published`,
          icon: BookOpen,
        },
        {
          key: "subs",
          label: "Active subscriptions",
          value: m.activeSubscriptions.toLocaleString(),
          hint: "Students with valid monthly access",
          icon: CreditCard,
        },
        {
          key: "rev",
          label: "Paid revenue (MTD)",
          value: formatLkr(m.paidRevenueMtdLkr),
          hint: `Subs MTD ${formatLkr(m.subscriptionRevenueMtdLkr)}`,
          icon: PiggyBank,
        },
        {
          key: "attempts",
          label: "Attempts (MTD)",
          value: m.completedAttemptsMtd.toLocaleString(),
          hint: `${m.pendingSlips} pending slips · payouts ${formatLkr(m.pendingPayoutsLkr)}`,
          icon: Wallet,
        },
      ];
    }
    if (isTeacher) {
      return [
        {
          key: "quizzes",
          label: "Your quizzes",
          value: m.totalQuizzes.toLocaleString(),
          hint: `${m.publishedQuizzes} published`,
          icon: BookOpen,
        },
        {
          key: "attempts",
          label: "Attempts (MTD)",
          value: m.completedAttemptsMtd.toLocaleString(),
          hint: `${m.completedAttempts ?? 0} all time`,
          icon: Users,
        },
        {
          key: "earned",
          label: "Lifetime earned",
          value: formatLkr(m.lifetimeEarnedLkr),
          hint: "From teacher revenue pool",
          icon: PiggyBank,
        },
        {
          key: "pending",
          label: "Pending payout",
          value: formatLkr(m.pendingPayoutLkr),
          hint: `Paid out ${formatLkr(m.paidOutLkr)}`,
          icon: Wallet,
        },
      ];
    }
    return [];
  }, [data, isAdmin, isTeacher]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 rounded-xl border border-border">
        <Spinner className="size-5" />
        <span className="text-sm text-muted-foreground">Loading overview…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        Could not load dashboard data.
      </div>
    );
  }

  const paymentsPages = Math.max(1, Math.ceil(data.payments.total / pageSize));
  const teachersPages = Math.max(1, Math.ceil(data.topTeachers.total / pageSize));
  const quizzesPages = Math.max(1, Math.ceil(data.topQuizzes.total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Live platform metrics — payments, revenue, attempts, and quiz performance."
              : isTeacher
                ? "Your quiz activity and earnings at a glance."
                : "Welcome to your learning dashboard."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void load({ soft: true })}
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {metricCards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key} className="shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardDescription>{card.label}</CardDescription>
                    <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                      <Icon className="size-3.5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-2xl font-semibold tabular-nums tracking-tight md:text-3xl">
                    {card.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{card.hint}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isAdmin && data.latestPeriod && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latest revenue period</CardTitle>
            <CardDescription>
              {monthLabel(data.latestPeriod.periodStart)} ·{" "}
              <Badge variant="outline">{data.latestPeriod.status}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Gross (R)" value={formatLkr(data.latestPeriod.grossRevenueLkr)} />
            <MiniStat label="Platform" value={formatLkr(data.latestPeriod.platformShareLkr)} />
            <MiniStat label="Teacher pool" value={formatLkr(data.latestPeriod.teacherPoolLkr)} />
            <MiniStat
              label="Billable attempts"
              value={data.latestPeriod.totalBillableAttempts.toLocaleString()}
            />
          </CardContent>
        </Card>
      )}

      {data.trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isTeacher ? "Your earnings & attempts (6 months)" : "Revenue & attempts (6 months)"}
            </CardTitle>
            <CardDescription>
              {isTeacher
                ? "Settled share amounts and completed attempts on your quizzes."
                : "Subscription revenue vs completed quiz attempts."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              <ComposedChart data={data.trend} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => `${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="subscriptionRevenueLkr"
                  fill="var(--color-subscriptionRevenueLkr)"
                  fillOpacity={0.15}
                  stroke="var(--color-subscriptionRevenueLkr)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="completedAttempts"
                  stroke="var(--color-completedAttempts)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Recent payments</CardTitle>
                <CardDescription>PayHere orders (subscription & quiz unlocks)</CardDescription>
              </div>
              <Pager
                page={paymentsPage}
                pages={paymentsPages}
                total={data.payments.total}
                onChange={setPaymentsPage}
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {data.payments.items.length === 0 ? (
              <Empty>No payment orders yet.</Empty>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">When</th>
                    <th className="px-2 py-2 font-medium">Customer</th>
                    <th className="px-2 py-2 font-medium">Purpose</th>
                    <th className="px-2 py-2 font-medium">Amount</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.items.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="font-medium">{row.user?.name || "Guest"}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.user?.email || row.guestSessionId || "—"}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div>{row.purpose}</div>
                        {row.purpose === "QUIZ" && (
                          <div className="text-xs text-muted-foreground">
                            {quizTitleText(row.quizTitle)}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 font-medium tabular-nums">
                        {formatLkr(row.amountLkr)}
                      </td>
                      <td className="px-2 py-2.5">
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="px-2 py-2.5 font-mono text-xs text-muted-foreground">
                        {row.orderId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <div className={`grid gap-4 ${isAdmin ? "xl:grid-cols-2" : ""}`}>
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Top teachers (MTD attempts)</CardTitle>
                  <CardDescription>Completed attempts this month + lifetime share</CardDescription>
                </div>
                <Pager
                  page={teachersPage}
                  pages={teachersPages}
                  total={data.topTeachers.total}
                  onChange={setTeachersPage}
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.topTeachers.items.length === 0 ? (
                <Empty>No teacher attempts this month.</Empty>
              ) : (
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Teacher</th>
                      <th className="px-2 py-2 font-medium">Attempts</th>
                      <th className="px-2 py-2 font-medium">Lifetime earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topTeachers.items.map((t) => (
                      <tr key={t.teacherUserId ?? t.email} className="border-b border-border/60">
                        <td className="px-2 py-2.5">
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.email}</div>
                        </td>
                        <td className="px-2 py-2.5 tabular-nums">{t.attemptsMtd}</td>
                        <td className="px-2 py-2.5 font-medium tabular-nums">
                          {formatLkr(t.lifetimeEarnedLkr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {isTeacher ? "Your quiz performance" : "Top quizzes"}
                </CardTitle>
                <CardDescription>Attempts, average score, pass rate</CardDescription>
              </div>
              <Pager
                page={quizzesPage}
                pages={quizzesPages}
                total={data.topQuizzes.total}
                onChange={setQuizzesPage}
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {data.topQuizzes.items.length === 0 ? (
              <Empty>No quiz analytics yet.</Empty>
            ) : (
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Quiz</th>
                    <th className="px-2 py-2 font-medium">Attempts</th>
                    <th className="px-2 py-2 font-medium">Avg score</th>
                    <th className="px-2 py-2 font-medium">Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topQuizzes.items.map((q) => (
                    <tr key={q.quizId} className="border-b border-border/60">
                      <td className="px-2 py-2.5 font-medium">{q.title}</td>
                      <td className="px-2 py-2.5 tabular-nums">{q.totalAttempts}</td>
                      <td className="px-2 py-2.5 tabular-nums">
                        {q.averageScore != null ? q.averageScore.toFixed(1) : "—"}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">
                        {q.passingRate != null ? `${q.passingRate.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function Pager({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>
        {total} total · {page}/{pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
