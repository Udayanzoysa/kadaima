"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { localize, type BankQuestion, type QuestionStatus } from "@/types/quiz";

function statusLabel(status: QuestionStatus) {
  if (status === "Published") return "Public";
  return status;
}

export function QuestionsBankList() {
  const router = useRouter();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load questions");
      setQuestions(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const authHeaders = () => ({
    Authorization: `Bearer ${getClientCookie("session_token")}`,
    "Content-Type": "application/json",
  });

  const updateStatus = async (id: string, status: QuestionStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update status");
      toast.success(`Status set to ${statusLabel(status)}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusyId(null);
    }
  };

  const removeQuestion = async (q: BankQuestion) => {
    const inUse = (q._count?.quizLinks ?? 0) > 0 || (q._count?.responses ?? 0) > 0;
    const confirmed = window.confirm(
      inUse
        ? `"${localize(q.questionText, "en")}" is in use and will be archived. Continue?`
        : `Delete this question permanently?`,
    );
    if (!confirmed) return;

    setBusyId(q.id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/${q.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Could not delete question");
      const body = await res.json();
      toast.success(body.archived ? "Question archived" : "Question deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete question");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading questions…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Questions</h1>
          <p className="text-muted-foreground text-sm">
            Shared question bank — one question can be attached to many quizzes.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/questions/new">
            <Plus className="size-4" />
            Add New
          </Link>
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No questions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Question</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Quizzes</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b border-border last:border-0">
                  <td className="max-w-md px-4 py-3">
                    <div className="line-clamp-2 font-medium">{localize(q.questionText, "en")}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {q.type?.replace("_", " ") ?? "MCQ"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{q._count?.quizLinks ?? 0}</td>
                  <td className="px-4 py-3">{q.points}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={q.status === "Published" ? "default" : "outline"}>
                        {statusLabel(q.status)}
                      </Badge>
                      <Select
                        value={q.status}
                        disabled={busyId === q.id}
                        onValueChange={(val) => updateStatus(q.id, val as QuestionStatus)}
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
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === q.id}
                        onClick={() => router.push(`/admin/questions/${q.id}/edit`)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === q.id}
                        onClick={() => void removeQuestion(q)}
                      >
                        {(q._count?.quizLinks ?? 0) > 0 || (q._count?.responses ?? 0) > 0 ? (
                          <Archive className="size-3.5" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Delete
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
