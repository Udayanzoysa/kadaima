"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { parseTagList, type QuestionTag } from "@/lib/question-tags";

type ManageTagsDialogProps = {
  /** Selected question IDs from the bank list — used when applying a new tag. */
  selectedQuestionIds: string[];
  onChanged: () => void;
};

export function ManageTagsDialog({ selectedQuestionIds, onChanged }: ManageTagsDialogProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const authHeaders = () => ({
    Authorization: `Bearer ${getClientCookie("session_token")}`,
    "Content-Type": "application/json",
  });

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const token = getClientCookie("session_token");
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load tags");
      setTags(parseTagList(await res.json()));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tags");
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setEditing(null);
    setEditValue("");
    setNewTag("");
    void loadTags();
  }, [open, loadTags]);

  const refresh = async () => {
    await loadTags();
    onChanged();
  };

  const applyNewTag = async () => {
    const tag = newTag.trim();
    if (!tag) {
      toast.error("Enter a tag name");
      return;
    }
    if (selectedQuestionIds.length === 0) {
      toast.error("Select one or more questions on the list first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/tags/apply`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tag, questionIds: selectedQuestionIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not add tag");
      }
      const body = await res.json();
      toast.success(`Tagged ${body.updated ?? selectedQuestionIds.length} question(s) with “${tag}”`);
      setNewTag("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add tag");
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async (from: string) => {
    const to = editValue.trim();
    if (!to) {
      toast.error("Tag name cannot be empty");
      return;
    }
    if (to === from) {
      setEditing(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/tags/rename`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not rename tag");
      }
      const body = await res.json();
      toast.success(`Renamed “${from}” → “${to}” on ${body.updated ?? 0} question(s)`);
      setEditing(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename tag");
    } finally {
      setBusy(false);
    }
  };

  const removeTag = async (tag: string) => {
    const confirmed = window.confirm(
      `Remove “${tag}” from every question that uses it?\n\nThe questions themselves are kept — only the tag is removed.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/questions/tags/delete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Could not delete tag");
      }
      const body = await res.json();
      toast.success(`Removed “${tag}” from ${body.removed ?? 0} question(s)`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete tag");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Tags className="size-4" />
          Manage tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>
            Tags live on questions. Add applies a tag to the questions you currently have selected on the list. Rename
            and delete update every question that uses that tag.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3 rounded-lg border border-border p-3">
            <Field>
              <FieldLabel htmlFor="new-tag-name">Add tag to selected questions</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="new-tag-name"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="e.g. Science Unit 1"
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void applyNewTag();
                    }
                  }}
                />
                <Button type="button" disabled={busy || !newTag.trim()} onClick={() => void applyNewTag()}>
                  {busy ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                  Add
                </Button>
              </div>
              <FieldDescription>
                {selectedQuestionIds.length > 0
                  ? `${selectedQuestionIds.length} question(s) selected`
                  : "Select questions on the bank list first, then add a tag here."}
              </FieldDescription>
            </Field>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-sm">Existing tags</p>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
                <Spinner className="size-4" />
                Loading tags…
              </div>
            ) : tags.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground text-sm">
                No tags yet. Add one above, or type tags when editing a question.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {tags.map((item) => {
                  const isEditing = editing === item.tag;
                  return (
                    <li key={item.tag} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                      {isEditing ? (
                        <>
                          <Input
                            className="h-8 min-w-[140px] flex-1"
                            value={editValue}
                            autoFocus
                            disabled={busy}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void saveRename(item.tag);
                              }
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            disabled={busy}
                            onClick={() => void saveRename(item.tag)}
                            aria-label={`Save rename for ${item.tag}`}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setEditing(null)}
                            aria-label="Cancel rename"
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate font-medium text-sm">{item.tag}</span>
                          <Badge variant="secondary" className="tabular-nums">
                            {item.count}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              setEditing(item.tag);
                              setEditValue(item.tag);
                            }}
                            aria-label={`Rename ${item.tag}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={busy}
                            onClick={() => void removeTag(item.tag)}
                            aria-label={`Delete ${item.tag}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
