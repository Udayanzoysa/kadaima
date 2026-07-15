"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Archive, BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
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
import { localize, type Course, type CourseStatus } from "@/types/quiz";

function statusLabel(status: CourseStatus) {
  if (status === "Published") return "Public";
  return status;
}

function statusVariant(status: CourseStatus): "default" | "secondary" | "outline" {
  if (status === "Published") return "default";
  if (status === "Archived") return "secondary";
  return "outline";
}

function courseTitle(course: Course) {
  return localize(course.title, "en") || "Untitled course";
}

export function ManageCoursesList() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load courses");
      const data: Course[] = await res.json();
      setCourses(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load courses");
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

  const updateStatus = async (id: string, status: CourseStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses/${id}/status`, {
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

  const removeCourse = async (course: Course) => {
    const quizCount = course._count?.quizzes ?? 0;
    const confirmed = window.confirm(
      quizCount > 0
        ? `"${courseTitle(course)}" has quizzes and will be archived. Continue?`
        : `Delete "${courseTitle(course)}" permanently?`,
    );
    if (!confirmed) return;

    setBusyId(course.id);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/courses/${course.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not delete course");
      }
      const body = await res.json().catch(() => ({}));
      toast.success(body.deleted ? "Course deleted" : "Course archived");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete course");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading courses…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Courses</h1>
          <p className="text-muted-foreground text-sm">
            Create, publish, archive courses and manage modules in English, Sinhala, and Tamil.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/courses/new">
            <Plus className="size-4" />
            Add New
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground text-sm">No courses yet. Add your first course.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Modules</th>
                <th className="px-4 py-3 font-medium">Quizzes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const status = (course.status ?? "Draft") as CourseStatus;
                return (
                  <tr key={course.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() => router.push(`/admin/courses/${course.id}/modules`)}
                      >
                        {courseTitle(course)}
                      </button>
                      {localize(course.description, "en") ? (
                        <div className="text-muted-foreground line-clamp-1 text-xs">
                          {localize(course.description, "en")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{course._count?.modules ?? 0}</td>
                    <td className="px-4 py-3">{course._count?.quizzes ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                        <Select
                          value={status}
                          disabled={busyId === course.id}
                          onValueChange={(val) => updateStatus(course.id, val as CourseStatus)}
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
                          disabled={busyId === course.id}
                          onClick={() => router.push(`/admin/courses/${course.id}/modules`)}
                        >
                          <BookOpen className="size-3.5" />
                          Modules
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === course.id}
                          onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === course.id}
                          onClick={() => void removeCourse(course)}
                        >
                          {(course._count?.quizzes ?? 0) > 0 ? (
                            <Archive className="size-3.5" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          {(course._count?.quizzes ?? 0) > 0 ? "Archive" : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
