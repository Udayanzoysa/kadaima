"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Trophy, Medal, Sparkles, Flame, Loader2, Award, Clock } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { safeJson } from "@/lib/safe-json";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface LeaderboardUser {
  id: string;
  name: string;
  avatarUrl?: string;
  totalScore: number;
  timeTakenSeconds?: number;
  rank: number;
}

interface LeaderboardResponse {
  data: LeaderboardUser[];
  modules: { id: string; title: Record<string, string> | string }[];
}

export function LeaderboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();

  const [timeframe, setTimeframe] = useState<"weekly" | "all_time">(
    (searchParams.get("timeframe") as "weekly" | "all_time") || "all_time",
  );
  const [moduleId, setModuleId] = useState<string>(searchParams.get("module") || "all");

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [availableModules, setAvailableModules] = useState<{ id: string; title: Record<string, string> | string }[]>(
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("timeframe", timeframe);
        if (moduleId !== "all") query.set("module", moduleId);

        const res = await fetch(`${APP_CONFIG.apiUrl}/public/leaderboard?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to load");

        const data = await safeJson<LeaderboardResponse>(res);
        if (!cancelled && data) {
          setUsers(data.data || []);
          if (data.modules) setAvailableModules(data.modules);
        }
      } catch (err) {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [timeframe, moduleId]);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const topThree = useMemo(() => users.slice(0, 3), [users]);
  const restUsers = useMemo(() => users.slice(3), [users]);

  // Reorder top 3 for podium display (2nd, 1st, 3rd)
  const podium = useMemo(() => {
    if (topThree.length === 0) return [];
    if (topThree.length === 1) return [null, topThree[0], null];
    if (topThree.length === 2) return [topThree[1], topThree[0], null];
    return [topThree[1], topThree[0], topThree[2]];
  }, [topThree]);

  return (
    <div className="flex w-full flex-col space-y-10 py-6 sm:py-10">
      {/* Header Section */}
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 shadow-sm">
          <Trophy className="size-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Wall of Fame</span>
        </div>
        <h1 className="bg-gradient-to-br from-[#1563b8] to-indigo-700 bg-clip-text font-[family-name:var(--font-outfit)] text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
          Global Leaderboard
        </h1>
        <p className="max-w-2xl text-base text-slate-500 sm:text-lg">
          Compete with students across the island, achieve top scores, and earn your place among the elite scholars.
        </p>
      </div>

      {/* Filters Section */}
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/50 p-2 backdrop-blur-xl sm:flex-row sm:p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <Tabs
          value={timeframe}
          onValueChange={(val) => {
            setTimeframe(val as "weekly" | "all_time");
            updateFilters("timeframe", val);
          }}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100/80 p-1">
            <TabsTrigger
              value="weekly"
              className="rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-[#1563b8] data-[state=active]:shadow-sm"
            >
              <Flame className="mr-1.5 size-4" />
              Weekly Top
            </TabsTrigger>
            <TabsTrigger
              value="all_time"
              className="rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-[#1563b8] data-[state=active]:shadow-sm"
            >
              <Award className="mr-1.5 size-4" />
              All Time
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-full sm:w-[260px]">
          <Select
            value={moduleId}
            onValueChange={(val) => {
              setModuleId(val);
              updateFilters("module", val);
            }}
          >
            <SelectTrigger className="w-full rounded-xl border-slate-200 bg-white shadow-sm transition hover:border-[#1563b8]/50">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg">
              <SelectItem value="all">Overall (All Modules)</SelectItem>
              {availableModules.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {typeof m.title === "string" ? m.title : m.title[locale] || m.title["en"] || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto flex w-full max-w-4xl flex-col space-y-12">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-4">
            <Loader2 className="size-10 animate-spin text-[#1563b8]" />
            <p className="animate-pulse text-sm font-medium text-slate-500">Calculating rankings...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/50">
            <div className="flex size-14 items-center justify-center rounded-full bg-slate-200/50">
              <Trophy className="size-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No rankings yet</h3>
            <p className="text-sm text-slate-500">Be the first to claim a spot on the leaderboard!</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {topThree.length > 0 && (
              <div className="flex flex-row items-end justify-center gap-2 sm:gap-6 pt-10">
                {podium.map((user, idx) => {
                  if (!user) return <div key={idx} className="w-24 sm:w-40" />;
                  const isFirst = idx === 1;
                  const isSecond = idx === 0;
                  const isThird = idx === 2;

                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "relative flex flex-col items-center transition-transform duration-500 hover:-translate-y-2",
                        isFirst ? "z-20 w-32 sm:w-48" : "z-10 w-28 sm:w-40 opacity-90",
                        isSecond && "order-1",
                        isFirst && "order-2 -mt-12",
                        isThird && "order-3",
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative mb-4 flex flex-col items-center">
                        {isFirst && (
                          <Trophy className="absolute -top-10 size-10 text-amber-400 drop-shadow-md animate-bounce" />
                        )}
                        {isSecond && <Medal className="absolute -top-8 size-8 text-slate-300 drop-shadow-md" />}
                        {isThird && <Medal className="absolute -top-8 size-8 text-amber-700 drop-shadow-md" />}

                        <div
                          className={cn(
                            "flex items-center justify-center overflow-hidden rounded-full border-4 bg-white shadow-xl",
                            isFirst ? "size-20 sm:size-28 border-amber-400" : "size-16 sm:size-20",
                            isSecond && "border-slate-300",
                            isThird && "border-amber-700",
                          )}
                        >
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className={cn("font-bold text-slate-400", isFirst ? "text-4xl" : "text-3xl")}>
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            "absolute -bottom-3 rounded-full border-2 border-white px-2.5 py-0.5 text-xs font-extrabold shadow-sm",
                            isFirst
                              ? "bg-amber-400 text-amber-950"
                              : isSecond
                                ? "bg-slate-300 text-slate-800"
                                : "bg-amber-700 text-amber-50",
                          )}
                        >
                          #{user.rank}
                        </Badge>
                      </div>

                      {/* Info */}
                      <div className="flex w-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-lg sm:p-4">
                        <span
                          className={cn(
                            "truncate w-full font-bold",
                            isFirst ? "text-lg text-slate-800" : "text-base text-slate-700",
                          )}
                        >
                          {user.name}
                        </span>
                        <div className="mt-1 flex items-center justify-center gap-1.5 text-[#1563b8]">
                          <Sparkles className="size-4" />
                          <span className={cn("font-black tracking-tight", isFirst ? "text-2xl" : "text-lg")}>
                            {user.totalScore}
                          </span>
                        </div>
                        {user.timeTakenSeconds !== undefined && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Clock className="size-3" />
                            {Math.floor(user.timeTakenSeconds / 60)}m {user.timeTakenSeconds % 60}s
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List for rest */}
            {restUsers.length > 0 && (
              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/60 bg-white/50 p-2 backdrop-blur-md sm:p-4 shadow-sm">
                {restUsers.map((user) => (
                  <div
                    key={user.id}
                    className="group flex items-center justify-between rounded-2xl border border-transparent bg-white p-3 shadow-sm transition-all hover:border-[#1563b8]/30 hover:shadow-md sm:p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex w-8 items-center justify-center font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-400">
                        {user.rank}
                      </div>
                      <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500 sm:size-12">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold uppercase">{user.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 transition-colors group-hover:text-[#1563b8]">
                          {user.name}
                        </span>
                        {user.timeTakenSeconds !== undefined && (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Clock className="size-3" />
                            {Math.floor(user.timeTakenSeconds / 60)}m {user.timeTakenSeconds % 60}s
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2">
                      <span className="font-[family-name:var(--font-outfit)] text-lg font-black text-[#1563b8] sm:text-xl">
                        {user.totalScore}
                      </span>
                      <span className="text-xs font-bold uppercase text-slate-400 sm:text-sm">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
