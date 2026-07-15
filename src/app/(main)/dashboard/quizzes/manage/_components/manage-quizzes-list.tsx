"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { localize, type QuizSummary } from "@/types/quiz";

type QuizStatus = QuizSummary["status"];

function statusLabel(status: QuizStatus) {
  if (status === "Published") return "Public";
  return status;
}

export function ManageQuizzesList() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load quizzes");
      const data: QuizSummary[] = await res.json();
      setQuizzes(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const authHeaders = () => {
    const token = getClientCookie("session_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const updateStatus = async (id: string, status: QuizStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not update status");
      }
      toast.success(`Status set to ${statusLabel(status)}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusyId(null);
    }
  };

  const removeQuiz = async (quiz: QuizSummary) => {
    const hasAttempts = quiz._count.attempts > 0;
    const confirmed = window.confirm(
      hasAttempts
        ? `"${localize(quiz.title, "en")}" has attempts and will be archived. Continue?`
        : `Delete "${localize(quiz.title, "en")}" permanently?`,
    );
    if (!confirmed) return;

    setBusyId(quiz.id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/quizzes/${quiz.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not delete quiz");
      }
      const body = await res.json();
      toast.success(body.archived ? "Quiz archived" : "Quiz deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete quiz");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading quizzes…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Quizzes</h1>
          <p className="text-muted-foreground text-sm">
            Create, publish, archive, and attach bank questions to quizzes.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/quizzes/new">
            <Plus className="size-4" />
            Add New
          </Link>
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No quizzes yet. Add your first quiz.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Attempts</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{localize(quiz.title, "en")}</div>
                    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                      {quiz.shuffleQuestions ? <span>Shuffle on</span> : null}
                      {quiz.requiresUnlock ? (
                        <span>
                          Locked
                          {quiz.priceLkr != null ? ` · LKR ${Number(quiz.priceLkr).toFixed(0)}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {localize(quiz.course?.title, "en")}
                  </td>
                  <td className="px-4 py-3">{quiz._count.questions}</td>
                  <td className="px-4 py-3">{quiz._count.attempts}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={quiz.status}
                      disabled={busyId === quiz.id}
                      onValueChange={(val) => updateStatus(quiz.id, val as QuizStatus)}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Published">Public</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === quiz.id}
                        onClick={() => router.push(`/admin/quizzes/${quiz.id}/edit`)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === quiz.id}
                        onClick={() => void removeQuiz(quiz)}
                      >
                        {quiz._count.attempts > 0 ? (
                          <Archive className="size-3.5" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        {quiz._count.attempts > 0 ? "Archive" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
