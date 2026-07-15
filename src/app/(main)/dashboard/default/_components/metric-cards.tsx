"use client";

import { useEffect, useState } from "react";

import { BookOpen, GraduationCap, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

type DashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  totalQuizzes: number;
};

const EMPTY: DashboardStats = {
  totalStudents: 0,
  totalTeachers: 0,
  totalQuizzes: 0,
};

export function MetricCards() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getClientCookie("session_token");
    if (!token) {
      setLoading(false);
      setError("Not signed in");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load dashboard stats");
        const data = (await res.json()) as Partial<DashboardStats>;
        if (cancelled) return;
        setStats({
          totalStudents: Number(data.totalStudents) || 0,
          totalTeachers: Number(data.totalTeachers) || 0,
          totalQuizzes: Number(data.totalQuizzes) || 0,
        });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stats");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 rounded-xl border border-border">
        <Spinner className="size-5" />
        <span className="text-muted-foreground text-sm">Loading metrics…</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      {error && (
        <p className="text-destructive text-sm md:col-span-3">{error}</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <GraduationCap className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Students</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {stats.totalStudents.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-sm">Registered student accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Users className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Teachers</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {stats.totalTeachers.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-sm">Active instructors on the platform</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <BookOpen className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Quizzes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {stats.totalQuizzes.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-sm">Published assessments available</p>
        </CardContent>
      </Card>
    </div>
  );
}
