"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  localize,
  type Course,
  type CourseModule,
  type CourseStatus,
} from "@/types/quiz";

function statusLabel(status: CourseStatus) {
  if (status === "Published") return "Public";
  return status;
}

function statusVariant(status: CourseStatus): "default" | "secondary" | "outline" {
  if (status === "Published") return "default";
  if (status === "Archived") return "secondary";
  return "outline";
}

interface ManageModulesListProps {
  courseId: string;
}

export function ManageModulesList({ courseId }: ManageModulesListProps) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const [courseRes, modulesRes] = await Promise.all([
        fetch(`${APP_CONFIG.apiUrl}/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${APP_CONFIG.apiUrl}/courses/${courseId}/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!courseRes.ok) throw new Error("Failed to load course");
      if (!modulesRes.ok) throw new Error("Failed to load modules");
      const courseData: Course = await courseRes.json();
      const modulesData: CourseModule[] = await modulesRes.json();
      setCourse(courseData);
      setModules(modulesData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

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
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/courses/${courseId}/modules/${id}/status`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ status }),
        },
      );
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

  const removeModule = async (mod: CourseModule) => {
    const name = localize(mod.title, "en") || "this module";
    if (!window.confirm(`Delete "${name}" permanently?`)) return;

    setBusyId(mod.id);
    try {
      const res = await fetch(
        `${APP_CONFIG.apiUrl}/courses/${courseId}/modules/${mod.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not delete module");
      }
      toast.success("Module deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete module");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading modules…</span>
      </div>
    );
  }

  const courseName = course ? localize(course.title, "en") : "Course";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button type="button" variant="ghost" size="sm" asChild className="-ml-2 w-fit">
            <Link href="/admin/courses">
              <ArrowLeft className="size-4" />
              Back to courses
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Modules</h1>
            <p className="text-muted-foreground text-sm">
              Modules for <span className="font-medium text-foreground">{courseName}</span>. Add,
              edit, publish, or archive in English, Sinhala, and Tamil.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/courses/${courseId}/modules/new`}>
            <Plus className="size-4" />
            Add New
          </Link>
        </Button>
      </div>

      {modules.length === 0 ? (
        <p className="text-muted-foreground text-sm">No modules yet. Add your first module.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{localize(mod.title, "en")}</div>
                    {localize(mod.description, "en") ? (
                      <div className="text-muted-foreground line-clamp-1 text-xs">
                        {localize(mod.description, "en")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{mod.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(mod.status)}>{statusLabel(mod.status)}</Badge>
                      <Select
                        value={mod.status}
                        disabled={busyId === mod.id}
                        onValueChange={(val) => updateStatus(mod.id, val as CourseStatus)}
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
                        disabled={busyId === mod.id}
                        onClick={() =>
                          router.push(`/admin/courses/${courseId}/modules/${mod.id}/edit`)
                        }
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === mod.id}
                        onClick={() => void removeModule(mod)}
                      >
                        <Trash2 className="size-3.5" />
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
