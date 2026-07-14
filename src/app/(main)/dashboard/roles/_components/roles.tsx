"use client";
"use no memo";

import { useCallback, useEffect, useState } from "react";

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, Check, ChevronRight, FileUp, Plus, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

import { rolesColumns } from "./roles-table/columns";
import type { Role } from "./roles-table/data";
import { RolesTable } from "./roles-table/table";

interface Permission {
  action: string;
  subject: string;
}

interface PermissionSet {
  id: string;
  name: string;
  description?: string | null;
  permissions: Permission[];
}

interface BackendRole {
  id: string;
  name: string;
  accessLevel: string;
  description?: string | null;
  status: string;
  owner: string;
  isSystem: boolean;
  lastReview?: string | null;
  permissionSets?: PermissionSet[];
  _count?: {
    users: number;
  };
}

interface DetailUser {
  id: string;
  email: string;
  name?: string | null;
  customRole?: {
    id: string;
    name: string;
  } | null;
}

interface BackendRoleWithUsers extends BackendRole {
  users?: DetailUser[];
}

interface AccessReviewLog {
  id: string;
  roleId: string;
  reviewerId: string;
  status: string;
  notes: string;
  reviewedAt: string;
  role?: {
    id: string;
    name: string;
  };
  reviewer?: {
    id: string;
    email: string;
  };
}

const MODULES_LIST = [
  { subject: "SETTINGS", label: "Settings", subtext: "Setting" },
  { subject: "QUIZZES", label: "Quizzes", subtext: "Quiz" },
  { subject: "USERS", label: "Users", subtext: "User" },
  { subject: "ROLES", label: "Roles", subtext: "Role" },
  { subject: "DASHBOARD_ACCESS", label: "Dashboard Access", subtext: "Dashboard Access" },
  { subject: "REPORTS", label: "Reports", subtext: "Report" },
];
const ACTIONS_LIST = [
  { action: "READ", label: "View" },
  { action: "CREATE", label: "Create" },
  { action: "EDIT", label: "Edit" },
  { action: "EXPORT", label: "Export" },
  { action: "IMPORT", label: "Import" },
  { action: "ASSIGN", label: "Assign" },
  { action: "CHANGE_STATUS", label: "Change Status" },
  { action: "DELETE", label: "Delete" },
];

export function Roles() {
  const [rolesList, setRolesList] = useState<BackendRole[]>([]);
  const [permissionSetsList, setPermissionSetsList] = useState<PermissionSet[]>([]);
  const [accessReviewsList, setAccessReviewsList] = useState<AccessReviewLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating custom role
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleAccessLevel, setRoleAccessLevel] = useState("Scoped");
  const [selectedPermissionSetIds, setSelectedPermissionSetIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for editing custom role
  const [editingRole, setEditingRole] = useState<BackendRole | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");
  const [editRoleAccessLevel, setEditRoleAccessLevel] = useState("Scoped");
  const [editSelectedPermissionSetIds, setEditSelectedPermissionSetIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // States for viewing role details
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewingRole, setViewingRole] = useState<BackendRoleWithUsers | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // States for duplicating role
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicatingRole, setDuplicatingRole] = useState<BackendRole | null>(null);
  const [duplicateRoleName, setDuplicateRoleName] = useState("");
  const [isSavingDuplicate, setIsSavingDuplicate] = useState(false);

  // States for reviewing role permissions
  const [isReviewPermissionsOpen, setIsReviewPermissionsOpen] = useState(false);
  const [reviewingRole, setReviewingRole] = useState<BackendRole | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSavingReview, setIsSavingReview] = useState(false);

  // States for managing role members
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [managingRole, setManagingRole] = useState<BackendRoleWithUsers | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [allWorkspaceUsersList, setAllWorkspaceUsersList] = useState<DetailUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 12,
  });

  // State for Permission Sets tab & Matrix
  const [selectedPSet, setSelectedPSet] = useState<PermissionSet | null>(null);
  const [matrixState, setMatrixState] = useState<Record<string, Record<string, boolean>>>({});
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [savingChanges, setSavingChanges] = useState(false);

  // Form states for creating new Permission Set (Profile)
  const [isCreatePSetOpen, setIsCreatePSetOpen] = useState(false);
  const [newPSetName, setNewPSetName] = useState("");
  const [newPSetDesc, setNewPSetDesc] = useState("");
  const [isCreatingPSet, setIsCreatingPSet] = useState(false);

  const initMatrix = useCallback((permissions: Permission[]) => {
    const state: Record<string, Record<string, boolean>> = {};
    const enabled: Record<string, boolean> = {};

    for (const mod of MODULES_LIST) {
      const sub = mod.subject;
      state[sub] = {};
      enabled[sub] = false;
      for (const act of ACTIONS_LIST) {
        state[sub][act.action] = false;
      }
    }

    for (const p of permissions) {
      const sub = p.subject.toUpperCase();
      const act = p.action.toUpperCase();
      if (state[sub]) {
        enabled[sub] = true;
        if (act === "MANAGE") {
          for (const actObj of ACTIONS_LIST) {
            state[sub][actObj.action] = true;
          }
        } else if (state[sub][act] !== undefined) {
          state[sub][act] = true;
        }
      }
    }

    setMatrixState(state);
    setEnabledModules(enabled);
  }, []);

  const fetchData = useCallback(async () => {
    const token = getClientCookie("session_token");
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [rolesRes, pSetsRes, reviewsRes] = await Promise.all([
        fetch(`${APP_CONFIG.apiUrl}/roles`, { headers }),
        fetch(`${APP_CONFIG.apiUrl}/permission-sets`, { headers }),
        fetch(`${APP_CONFIG.apiUrl}/access-reviews`, { headers }),
      ]);

      if (!rolesRes.ok || !pSetsRes.ok || !reviewsRes.ok) {
        throw new Error("Failed to load workspace access control details.");
      }

      const [rolesData, pSetsData, reviewsData] = await Promise.all([
        rolesRes.json(),
        pSetsRes.json(),
        reviewsRes.json(),
      ]);

      setRolesList(rolesData);
      setPermissionSetsList(pSetsData);
      setAccessReviewsList(reviewsData);

      if (pSetsData && pSetsData.length > 0) {
        setSelectedPSet((prev) => {
          const match = prev ? pSetsData.find((item: PermissionSet) => item.id === prev.id) : null;
          const nextPSet = match ?? pSetsData[0];
          initMatrix(nextPSet.permissions);
          return nextPSet;
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred while syncing with backend.";
      setError(errMsg);
      toast.error("Fetch failed", { description: errMsg });
    } finally {
      setLoading(false);
    }
  }, [initMatrix]);

  useEffect(() => {
    void fetchData();

    const handleRefresh = () => {
      void fetchData();
    };

    window.addEventListener("refresh-roles", handleRefresh);
    window.addEventListener("refresh-access-reviews", handleRefresh);

    return () => {
      window.removeEventListener("refresh-roles", handleRefresh);
      window.removeEventListener("refresh-access-reviews", handleRefresh);
    };
  }, [fetchData]);

  useEffect(() => {
    const handleEditRoleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const roleId = customEvent.detail?.id;
      if (!roleId) return;
      const role = rolesList.find((r) => r.id === roleId);
      if (role) {
        setEditingRole(role);
        setEditRoleName(role.name);
        setEditRoleDesc(role.description || "");
        setEditRoleAccessLevel(role.accessLevel);
        setEditSelectedPermissionSetIds(role.permissionSets?.map((ps) => ps.id) || []);
        setIsEditOpen(true);
      }
    };

    const handleViewDetailsEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const roleId = customEvent.detail?.id;
      if (!roleId) return;
      setIsViewDetailsOpen(true);
      setLoadingDetails(true);
      const token = getClientCookie("session_token");
      try {
        const res = await fetch(`${APP_CONFIG.apiUrl}/roles/${roleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setViewingRole(data);
        } else {
          toast.error("Failed to fetch role details");
        }
      } catch (_err) {
        toast.error("Failed to load role details");
      } finally {
        setLoadingDetails(false);
      }
    };

    const handleDuplicateRoleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const roleId = customEvent.detail?.id;
      if (!roleId) return;
      const role = rolesList.find((r) => r.id === roleId);
      if (role) {
        setDuplicatingRole(role);
        setDuplicateRoleName(`${role.name} Copy`);
        setIsDuplicateOpen(true);
      }
    };

    const handleReviewPermissionsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const roleId = customEvent.detail?.id;
      if (!roleId) return;
      const role = rolesList.find((r) => r.id === roleId);
      if (role) {
        setReviewingRole(role);
        setReviewNotes("");
        setIsReviewPermissionsOpen(true);
      }
    };

    const handleManageMembersEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const roleId = customEvent.detail?.id;
      if (!roleId) return;
      setIsManageMembersOpen(true);
      setLoadingMembers(true);
      const token = getClientCookie("session_token");
      try {
        const [roleRes, usersRes] = await Promise.all([
          fetch(`${APP_CONFIG.apiUrl}/roles/${roleId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${APP_CONFIG.apiUrl}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (roleRes.ok && usersRes.ok) {
          const roleData = await roleRes.json();
          const usersData = await usersRes.json();
          setManagingRole(roleData);
          setAllWorkspaceUsersList(usersData);
          setSelectedUserIds(roleData.users?.map((u: DetailUser) => u.id) || []);
        } else {
          toast.error("Failed to load workspace members");
        }
      } catch (_err) {
        toast.error("An error occurred loading workspace members");
      } finally {
        setLoadingMembers(false);
      }
    };

    window.addEventListener("edit-role", handleEditRoleEvent);
    window.addEventListener("view-role-details", handleViewDetailsEvent);
    window.addEventListener("duplicate-role", handleDuplicateRoleEvent);
    window.addEventListener("review-role-permissions", handleReviewPermissionsEvent);
    window.addEventListener("manage-role-members", handleManageMembersEvent);

    return () => {
      window.removeEventListener("edit-role", handleEditRoleEvent);
      window.removeEventListener("view-role-details", handleViewDetailsEvent);
      window.removeEventListener("duplicate-role", handleDuplicateRoleEvent);
      window.removeEventListener("review-role-permissions", handleReviewPermissionsEvent);
      window.removeEventListener("manage-role-members", handleManageMembersEvent);
    };
  }, [rolesList]);

  const handleSelectPSet = (ps: PermissionSet) => {
    setSelectedPSet(ps);
    initMatrix(ps.permissions);
  };

  const handleToggleModule = (subject: string, checked: boolean) => {
    setEnabledModules((prev) => ({ ...prev, [subject]: checked }));
    setMatrixState((prev) => {
      const updated = { ...prev };
      updated[subject] = {};
      for (const act of ACTIONS_LIST) {
        updated[subject][act.action] = checked;
      }
      return updated;
    });
  };

  const handleToggleAction = (subject: string, action: string) => {
    setMatrixState((prev) => {
      const updatedSubject = { ...prev[subject] };
      updatedSubject[action] = !updatedSubject[action];
      return {
        ...prev,
        [subject]: updatedSubject,
      };
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedPSet) return;
    setSavingChanges(true);
    const token = getClientCookie("session_token");
    try {
      const permissionsToSend: { action: string; subject: string }[] = [];

      for (const subject of Object.keys(matrixState)) {
        if (enabledModules[subject]) {
          const actionsMap = matrixState[subject];
          for (const action of Object.keys(actionsMap)) {
            if (actionsMap[action]) {
              permissionsToSend.push({
                action,
                subject,
              });
            }
          }
        }
      }

      const response = await fetch(`${APP_CONFIG.apiUrl}/permission-sets/${selectedPSet.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: selectedPSet.name,
          description: selectedPSet.description,
          permissions: permissionsToSend,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update permission set.");
      }

      toast.success(`Permission set "${selectedPSet.name}" updated successfully!`);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Update failed", { description: errMsg });
    } finally {
      setSavingChanges(false);
    }
  };

  const handleCreatePSet = async () => {
    if (!newPSetName) return;
    setIsCreatingPSet(true);
    const token = getClientCookie("session_token");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/permission-sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPSetName,
          description: newPSetDesc || undefined,
          permissions: [],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create permission set.");
      }

      const created = await response.json();
      toast.success(`Permission set "${newPSetName}" created successfully!`);

      setIsCreatePSetOpen(false);
      setNewPSetName("");
      setNewPSetDesc("");

      const headers = { Authorization: `Bearer ${token}` };
      const pSetsRes = await fetch(`${APP_CONFIG.apiUrl}/permission-sets`, { headers });
      if (pSetsRes.ok) {
        const pSetsData = await pSetsRes.json();
        setPermissionSetsList(pSetsData);
        const match = pSetsData.find((item: PermissionSet) => item.name === created.name);
        if (match) {
          setSelectedPSet(match);
          initMatrix(match.permissions);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Creation failed", { description: errMsg });
    } finally {
      setIsCreatingPSet(false);
    }
  };

  const handleCreateRole = async () => {
    if (!roleName) return;
    setIsCreating(true);
    const token = getClientCookie("session_token");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roleName,
          accessLevel: roleAccessLevel,
          description: roleDesc || undefined,
          permissionSetIds: selectedPermissionSetIds,
          owner: "Jane Doe",
          status: "Active",
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to generate role.");
      }

      toast.success(`Role "${roleName}" configured successfully!`);
      setIsCreateOpen(false);
      setRoleName("");
      setRoleDesc("");
      setRoleAccessLevel("Scoped");
      setSelectedPermissionSetIds([]);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Creation failed", { description: errMsg });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !editRoleName) return;
    setIsSavingEdit(true);
    const token = getClientCookie("session_token");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editRoleName,
          accessLevel: editRoleAccessLevel,
          description: editRoleDesc || undefined,
          permissionSetIds: editSelectedPermissionSetIds,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update role.");
      }

      toast.success(`Role "${editRoleName}" updated successfully!`);
      setIsEditOpen(false);
      setEditingRole(null);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Update failed", { description: errMsg });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicatingRole || !duplicateRoleName) return;
    setIsSavingDuplicate(true);
    const token = getClientCookie("session_token");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: duplicateRoleName,
          accessLevel: duplicatingRole.accessLevel,
          description: duplicatingRole.description ? `${duplicatingRole.description} (Duplicate)` : undefined,
          permissionSetIds: duplicatingRole.permissionSets?.map((ps) => ps.id) || [],
          owner: "Jane Doe",
          status: "Active",
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to duplicate role.");
      }

      toast.success(`Role duplicated successfully as "${duplicateRoleName}"`);
      setIsDuplicateOpen(false);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Duplication failed", { description: errMsg });
    } finally {
      setIsSavingDuplicate(false);
    }
  };

  const handleConfirmReview = async () => {
    if (!reviewingRole) return;
    setIsSavingReview(true);
    const token = getClientCookie("session_token");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/roles/${reviewingRole.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: reviewNotes || "Access review completed successfully." }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to review role.");
      }

      toast.success(`Role "${reviewingRole.name}" reviewed successfully!`);
      setIsReviewPermissionsOpen(false);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Review failed", { description: errMsg });
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleConfirmMembers = async () => {
    if (!managingRole) return;
    setIsSavingMembers(true);
    const token = getClientCookie("session_token");
    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/roles/${managingRole.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update role members.");
      }

      toast.success(`Members for role "${managingRole.name}" updated successfully!`);
      setIsManageMembersOpen(false);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Members update failed", { description: errMsg });
    } finally {
      setIsSavingMembers(false);
    }
  };

  const allWorkspaceUsersSorted = () => {
    return [...allWorkspaceUsersList].sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  };

  const handleReviewAll = async () => {
    const token = getClientCookie("session_token");
    const pendingRoles = rolesList.filter((r) => r.status === "Needs review");
    if (pendingRoles.length === 0) return;

    try {
      for (const role of pendingRoles) {
        await fetch(`${APP_CONFIG.apiUrl}/roles/${role.id}/review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes: "Batch reviewed from dashboard" }),
        });
      }
      toast.success("Batch review completed successfully!");
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Batch review failed", { description: errMsg });
    }
  };

  // Map backend JSON list to table Row definitions
  const mappedRoles: Role[] = rolesList.map((r: BackendRole) => ({
    id: r.id,
    role: r.name,
    group: r.status === "Needs review" ? "Needs review" : r.isSystem ? "System roles" : "Custom roles",
    accessLevel: r.accessLevel,
    users: r._count ? r._count.users : 0,
    permissionSets: r.permissionSets ? r.permissionSets.map((ps: PermissionSet) => ps.name) : [],
    lastReview: r.lastReview
      ? new Date(r.lastReview).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Never",
    owner: r.owner,
    status: r.status === "Needs review" ? "Needs review" : "Active",
  }));

  const table = useReactTable({
    data: mappedRoles,
    columns: rolesColumns,
    defaultColumn: {
      size: 140,
      minSize: 80,
      maxSize: 420,
    },
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    initialState: {
      columnVisibility: { group: false, search: false },
    },
  });

  const search = (table.getColumn("search")?.getFilterValue() as string) ?? "";
  const groupFilter = (table.getColumn("group")?.getFilterValue() as string) ?? "";
  const typeFilter = groupFilter === "System roles" ? "System" : groupFilter === "Custom roles" ? "Custom" : "All";
  const ownerFilter = (table.getColumn("owner")?.getFilterValue() as string) ?? "All";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) ?? "All";

  const pendingReviewCount = mappedRoles.filter((r) => r.status === "Needs review").length;

  if (loading && rolesList.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
        <span className="ml-2 text-muted-foreground text-sm">Syncing workspace definitions...</span>
      </div>
    );
  }

  if (error && rolesList.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-8 animate-bounce text-destructive" />
        <div className="space-y-1">
          <h2 className="font-semibold text-lg">Connection Failure</h2>
          <p className="max-w-md text-muted-foreground text-sm">{error}</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Top Header */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm">Manage access roles and permissions across your organization.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <FileUp data-icon="inline-start" />
            Import JSON
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            Create role
          </Button>
        </div>
      </div>

      <Tabs className="mt-4 h-full gap-4" defaultValue="roles">
        <TabsList
          variant="line"
          className="w-full justify-start gap-2 border-b ps-0 *:data-[slot=tabs-trigger]:flex-none"
        >
          <TabsTrigger value="roles" className="data-active:text-foreground">
            Roles
          </TabsTrigger>
          <TabsTrigger value="permission-sets" className="data-active:text-foreground">
            Permission sets
          </TabsTrigger>
          <TabsTrigger value="access-reviews" className="data-active:text-foreground">
            Access reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          {/* Section 1: Roles Table */}
          <Card className="border-border bg-card">
            <CardHeader className="p-6">
              <div className="flex flex-col gap-1">
                <CardTitle className="font-semibold text-xl leading-none tracking-tight">Roles</CardTitle>
                <CardDescription className="mt-1 text-muted-foreground text-xs">
                  Access roles configured for workspace members.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="border-border border-t p-0">
              <div className="flex flex-col gap-4">
                {pendingReviewCount > 0 && (
                  <div className="p-6 pb-0">
                    <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
                      <AlertTriangle className="size-4" />
                      <AlertTitle>Review required</AlertTitle>
                      <AlertDescription>
                        {pendingReviewCount} role{pendingReviewCount > 1 ? "s" : ""} have unreviewed permission changes.
                      </AlertDescription>
                      <AlertAction>
                        <Button size="sm" variant="link" onClick={handleReviewAll}>
                          Review changes
                          <ChevronRight data-icon="inline-end" />
                        </Button>
                      </AlertAction>
                    </Alert>
                  </div>
                )}

                <div className="overflow-hidden">
                  {/* Table search & filter controls */}
                  <div className="flex flex-col items-stretch gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <InputGroup className="h-7 w-full rounded-md sm:w-82">
                      <InputGroupAddon>
                        <Search />
                      </InputGroupAddon>
                      <InputGroupInput
                        className="h-7"
                        placeholder="Search roles..."
                        value={search}
                        onChange={(e) => {
                          table.getColumn("search")?.setFilterValue(e.target.value || undefined);
                          table.setPageIndex(0);
                        }}
                      />
                    </InputGroup>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={typeFilter}
                        onValueChange={(v) => {
                          table
                            .getColumn("group")
                            ?.setFilterValue(
                              v === "All" ? undefined : v === "System" ? "System roles" : "Custom roles",
                            );
                          table.setPageIndex(0);
                        }}
                      >
                        <SelectTrigger size="sm">
                          <span className="text-muted-foreground">Type:</span>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectGroup>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="System">System</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <Select
                        value={ownerFilter}
                        onValueChange={(v) => {
                          table.getColumn("owner")?.setFilterValue(v === "All" ? undefined : v);
                          table.setPageIndex(0);
                        }}
                      >
                        <SelectTrigger size="sm">
                          <span className="text-muted-foreground">Owner:</span>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectGroup>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="System">System</SelectItem>
                            <SelectItem value="Jane Doe">Jane Doe</SelectItem>
                            <SelectItem value="Alex Kim">Alex Kim</SelectItem>
                            <SelectItem value="Chris Lee">Chris Lee</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                          table.getColumn("status")?.setFilterValue(v === "All" ? undefined : v);
                          table.setPageIndex(0);
                        }}
                      >
                        <SelectTrigger size="sm">
                          <span className="text-muted-foreground">Status:</span>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectGroup>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Needs review">Needs review</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <RolesTable table={table} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permission-sets" className="mt-4">
          {/* Section 2: Permission Profiles & Matrix */}
          <Card className="border-border bg-card">
            <CardHeader className="p-6">
              <div className="flex flex-col gap-1">
                <CardTitle className="font-semibold text-xl leading-none tracking-tight">Permission Profiles</CardTitle>
                <CardDescription className="mt-1 text-muted-foreground text-xs">
                  Define system-wide permission profiles mapping module actions.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="border-border border-t p-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column: Permission Profiles Navigation */}
                <div className="flex flex-col gap-4 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Permission Profiles</span>
                    <Button size="xs" variant="outline" className="h-7 gap-1" onClick={() => setIsCreatePSetOpen(true)}>
                      <Plus className="size-3.5" />
                      New Profile
                    </Button>
                  </div>

                  <div className="flex max-h-[700px] flex-col gap-2 overflow-y-auto pr-1">
                    {permissionSetsList.map((ps) => {
                      const isSelected = selectedPSet?.id === ps.id;
                      return (
                        <button
                          type="button"
                          key={ps.id}
                          onClick={() => handleSelectPSet(ps)}
                          className={cn(
                            "block w-full cursor-pointer rounded-xl border p-4 text-left transition-all hover:bg-muted/10",
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/70 bg-background text-muted-foreground",
                          )}
                        >
                          <div className={cn("font-semibold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                            {ps.name}
                          </div>
                          <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                            {ps.description || "No description provided."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {Array.from(new Set(ps.permissions.map((p) => p.subject)))
                              .slice(0, 3)
                              .map((sub) => (
                                <Badge
                                  key={sub}
                                  variant="outline"
                                  className="rounded-sm border-neutral-700 px-1 py-0 font-mono text-[9px] text-neutral-300 uppercase"
                                >
                                  {sub.toLowerCase()}
                                </Badge>
                              ))}
                            {new Set(ps.permissions.map((p) => p.subject)).size > 3 && (
                              <span className="self-center text-[10px] text-muted-foreground">
                                +{new Set(ps.permissions.map((p) => p.subject)).size - 3} more
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {permissionSetsList.length === 0 && (
                      <div className="flex h-32 items-center justify-center rounded-xl border border-border border-dashed bg-card p-6 text-center text-muted-foreground text-sm">
                        No permission profiles found.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Permission Matrix Editor */}
                <div className="lg:col-span-2">
                  {selectedPSet ? (
                    <Card className="border-border bg-card">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-border border-b p-6">
                        <div>
                          <CardTitle className="font-semibold text-xl leading-none tracking-tight">
                            Permission Matrix
                          </CardTitle>
                          <CardDescription className="mt-1 text-muted-foreground text-xs">
                            Configure access for profile:{" "}
                            <span className="font-semibold text-foreground">{selectedPSet.name}</span>.
                          </CardDescription>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void fetchData()}>
                          <RotateCw className="size-3.5" />
                          Refresh
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-muted/10">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="px-6 py-4 font-semibold text-foreground text-xs uppercase tracking-wider">
                                Module
                              </TableHead>
                              <TableHead className="w-[100px] px-6 py-4 text-center font-semibold text-foreground text-xs uppercase tracking-wider">
                                Enabled
                              </TableHead>
                              <TableHead className="px-6 py-4 font-semibold text-foreground text-xs uppercase tracking-wider">
                                Permissions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const matchingModules = MODULES_LIST.filter(
                                (mod) =>
                                  mod.label.toLowerCase() === selectedPSet?.name.toLowerCase() ||
                                  mod.subject.toLowerCase() === selectedPSet?.name.toLowerCase(),
                              );
                              const modulesToRender =
                                matchingModules.length > 0
                                  ? matchingModules
                                  : MODULES_LIST.filter((mod) => enabledModules[mod.subject] || false);
                              const finalModules = modulesToRender.length > 0 ? modulesToRender : MODULES_LIST;

                              return finalModules.map((mod) => {
                                const isEnabled = enabledModules[mod.subject];
                                return (
                                  <TableRow key={mod.subject} className="border-border hover:bg-muted/10">
                                    <TableCell className="whitespace-nowrap px-6 py-4 align-middle">
                                      <div className="font-semibold text-foreground text-sm">{mod.label}</div>
                                      <div className="mt-0.5 text-muted-foreground text-xs">{mod.subtext}</div>
                                    </TableCell>
                                    <TableCell className="w-[100px] whitespace-nowrap px-6 py-4 text-center align-middle">
                                      <Switch
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => handleToggleModule(mod.subject, checked)}
                                        className="data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[state=checked]:bg-primary"
                                      />
                                    </TableCell>
                                    <TableCell className="px-6 py-4 align-middle">
                                      <div className="flex max-w-[500px] flex-wrap gap-2 py-1">
                                        {ACTIONS_LIST.map((act) => {
                                          const isActive = isEnabled && matrixState[mod.subject]?.[act.action];
                                          return (
                                            <button
                                              key={act.action}
                                              type="button"
                                              disabled={!isEnabled}
                                              onClick={() => handleToggleAction(mod.subject, act.action)}
                                              className={cn(
                                                "inline-flex cursor-pointer select-none items-center rounded-full border px-3.5 py-1.5 font-medium text-xs outline-none transition-all disabled:cursor-not-allowed disabled:opacity-30",
                                                isActive
                                                  ? "border-transparent bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                                                  : "border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-800/20",
                                              )}
                                            >
                                              {isActive ? (
                                                <span className="mr-1.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                                                  <Check className="size-2.5 stroke-[4]" />
                                                </span>
                                              ) : (
                                                <span className="mr-1.5 size-3.5 shrink-0 rounded-full border border-zinc-700" />
                                              )}
                                              {act.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              });
                            })()}
                          </TableBody>
                        </Table>

                        <div className="flex justify-end border-border border-t bg-muted/5 p-6">
                          <Button className="font-semibold" onClick={handleSaveChanges} disabled={savingChanges}>
                            {savingChanges && <Spinner className="mr-2" />}
                            Save Changes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-border border-dashed bg-card p-6 text-muted-foreground">
                      <p className="text-sm">
                        Select a permission profile to view and configure its interactive matrix.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-reviews" className="mt-4">
          {/* Section 3: Access Reviews */}
          <Card className="border-border bg-card">
            <CardHeader className="p-6">
              <div className="flex flex-col gap-1">
                <CardTitle className="font-semibold text-xl leading-none tracking-tight">Access Reviews</CardTitle>
                <CardDescription className="mt-1 text-muted-foreground text-xs">
                  Historical reviews of access control modifications.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="border-border border-t p-0">
              <div className="overflow-hidden rounded-b-xl border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6 py-4">Role</TableHead>
                      <TableHead className="px-6 py-4">Reviewer</TableHead>
                      <TableHead className="px-6 py-4">Status</TableHead>
                      <TableHead className="px-6 py-4">Reviewed At</TableHead>
                      <TableHead className="px-6 py-4">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessReviewsList.map((review) => (
                      <TableRow key={review.id} className="hover:bg-muted/10">
                        <TableCell className="px-6 py-4 font-semibold text-sm">
                          {review.role?.name || "Deleted Role"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-muted-foreground text-sm">
                          {review.reviewer?.email}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="rounded-sm border-emerald-500/20 bg-emerald-500/10 font-semibold text-emerald-500 text-xs">
                            {review.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-mono text-muted-foreground text-sm">
                          {new Date(review.reviewedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate px-6 py-4 text-muted-foreground text-sm">
                          {review.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                    {accessReviewsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                          No access reviews logged yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Role Modal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Create Custom Role</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Define a new role and connect standard permission sets to configure access rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field className="gap-1.5">
              <label htmlFor="new-role-name" className="font-semibold text-xs">
                Role Name
              </label>
              <Input
                id="new-role-name"
                placeholder="e.g. Developer"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={isCreating}
              />
            </Field>

            <Field className="gap-1.5">
              <label htmlFor="new-role-desc" className="font-semibold text-xs">
                Description
              </label>
              <Textarea
                id="new-role-desc"
                placeholder="Role responsibilities..."
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                className="min-h-[60px]"
                disabled={isCreating}
              />
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Access Level</span>
              <Select value={roleAccessLevel} onValueChange={(v) => setRoleAccessLevel(v)} disabled={isCreating}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scoped">Scoped (Recommended)</SelectItem>
                  <SelectItem value="Full">Full (Administrator)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Connect Permission Sets</span>
              <div className="grid max-h-[140px] grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border/80 bg-muted/20 p-2">
                {permissionSetsList.map((ps) => (
                  <div key={ps.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pset-${ps.id}`}
                      checked={selectedPermissionSetIds.includes(ps.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissionSetIds([...selectedPermissionSetIds, ps.id]);
                        } else {
                          setSelectedPermissionSetIds(selectedPermissionSetIds.filter((id) => id !== ps.id));
                        }
                      }}
                      disabled={isCreating}
                    />
                    <label
                      htmlFor={`pset-${ps.id}`}
                      className="cursor-pointer select-none truncate font-medium text-xs"
                    >
                      {ps.name}
                    </label>
                  </div>
                ))}
              </div>
            </Field>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={isCreating || !roleName}>
              {isCreating && <Spinner className="mr-2" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Permission Profile Modal Dialog */}
      <Dialog open={isCreatePSetOpen} onOpenChange={setIsCreatePSetOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Create Permission Profile</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Add a new standard permission profile that can be mapped to roles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field className="gap-1.5">
              <label htmlFor="new-pset-name" className="font-semibold text-xs">
                Profile Name
              </label>
              <Input
                id="new-pset-name"
                placeholder="e.g. Developer Access"
                value={newPSetName}
                onChange={(e) => setNewPSetName(e.target.value)}
                disabled={isCreatingPSet}
              />
            </Field>

            <Field className="gap-1.5">
              <label htmlFor="new-pset-desc" className="font-semibold text-xs">
                Description
              </label>
              <Textarea
                id="new-pset-desc"
                placeholder="Profile capabilities description..."
                value={newPSetDesc}
                onChange={(e) => setNewPSetDesc(e.target.value)}
                className="min-h-[60px]"
                disabled={isCreatingPSet}
              />
            </Field>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreatePSetOpen(false)} disabled={isCreatingPSet}>
              Cancel
            </Button>
            <Button onClick={handleCreatePSet} disabled={isCreatingPSet || !newPSetName}>
              {isCreatingPSet && <Spinner className="mr-2" />}
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Custom Role Modal Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Edit Custom Role</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Modify custom role settings and connect permission sets to configure access rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field className="gap-1.5">
              <label htmlFor="edit-role-name" className="font-semibold text-xs">
                Role Name
              </label>
              <Input
                id="edit-role-name"
                placeholder="e.g. Developer"
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                disabled={isSavingEdit}
              />
            </Field>

            <Field className="gap-1.5">
              <label htmlFor="edit-role-desc" className="font-semibold text-xs">
                Description
              </label>
              <Textarea
                id="edit-role-desc"
                placeholder="Role responsibilities..."
                value={editRoleDesc}
                onChange={(e) => setEditRoleDesc(e.target.value)}
                className="min-h-[60px]"
                disabled={isSavingEdit}
              />
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Access Level</span>
              <Select
                value={editRoleAccessLevel}
                onValueChange={(v) => setEditRoleAccessLevel(v)}
                disabled={isSavingEdit}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scoped">Scoped (Recommended)</SelectItem>
                  <SelectItem value="Full">Full (Administrator)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Connect Permission Sets</span>
              <div className="grid max-h-[140px] grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border/80 bg-muted/20 p-2">
                {permissionSetsList.map((ps) => (
                  <div key={ps.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-pset-${ps.id}`}
                      checked={editSelectedPermissionSetIds.includes(ps.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditSelectedPermissionSetIds([...editSelectedPermissionSetIds, ps.id]);
                        } else {
                          setEditSelectedPermissionSetIds(editSelectedPermissionSetIds.filter((id) => id !== ps.id));
                        }
                      }}
                      disabled={isSavingEdit}
                    />
                    <label
                      htmlFor={`edit-pset-${ps.id}`}
                      className="cursor-pointer select-none truncate font-medium text-xs"
                    >
                      {ps.name}
                    </label>
                  </div>
                ))}
              </div>
            </Field>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isSavingEdit || !editRoleName}>
              {isSavingEdit && <Spinner className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Role Details Modal Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-lg border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Role Details</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Detailed configurations and membership for this role.
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner className="size-6" />
              <span className="ml-2 text-muted-foreground text-sm">Loading role details...</span>
            </div>
          ) : viewingRole ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-border/80 bg-muted/15 p-3.5">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Role Name</span>
                  <div className="font-semibold text-sm">{viewingRole.name}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Access Level</span>
                  <div>
                    <Badge variant="outline" className="rounded-sm mt-0.5 font-medium text-xs">
                      {viewingRole.accessLevel}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</span>
                  <p className="text-muted-foreground text-xs">
                    {viewingRole.description || "No description provided."}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
                  <div className="mt-0.5">
                    <Badge
                      className={cn(
                        "rounded-sm font-semibold text-xs",
                        viewingRole.status === "Active"
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-500",
                      )}
                    >
                      {viewingRole.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Owner</span>
                  <div className="text-muted-foreground text-xs">{viewingRole.owner}</div>
                </div>
              </div>

              <div>
                <span className="font-semibold text-xs">Connected Permission Sets</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {viewingRole.permissionSets?.map((ps: PermissionSet) => (
                    <Badge
                      key={ps.id}
                      variant="outline"
                      className="rounded-sm border-zinc-800 bg-zinc-900/40 px-2 py-0.5 text-xs text-zinc-300"
                    >
                      {ps.name}
                    </Badge>
                  ))}
                  {(!viewingRole.permissionSets || viewingRole.permissionSets.length === 0) && (
                    <span className="text-muted-foreground text-xs">No permission sets connected.</span>
                  )}
                </div>
              </div>

              <div>
                <span className="font-semibold text-xs">Assigned Members ({viewingRole.users?.length || 0})</span>
                <div className="mt-1.5 max-h-[120px] overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
                  {viewingRole.users?.map((u: DetailUser) => (
                    <div key={u.id} className="py-1 text-xs text-foreground">
                      • <span className="font-medium">{u.email}</span>
                    </div>
                  ))}
                  {(!viewingRole.users || viewingRole.users.length === 0) && (
                    <span className="text-muted-foreground text-xs">No members assigned to this role.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">Failed to load details.</div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Role Modal Dialog */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Duplicate Role</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Create a copy of an existing role with all of its connected permission sets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field className="gap-1.5">
              <label htmlFor="duplicate-role-name" className="font-semibold text-xs">
                New Role Name
              </label>
              <Input
                id="duplicate-role-name"
                placeholder="e.g. Developer Copy"
                value={duplicateRoleName}
                onChange={(e) => setDuplicateRoleName(e.target.value)}
                disabled={isSavingDuplicate}
              />
            </Field>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDuplicateOpen(false)} disabled={isSavingDuplicate}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDuplicate} disabled={isSavingDuplicate || !duplicateRoleName}>
              {isSavingDuplicate && <Spinner className="mr-2" />}
              Duplicate Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Permissions Modal Dialog */}
      <Dialog open={isReviewPermissionsOpen} onOpenChange={setIsReviewPermissionsOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Review Role Access & Permissions</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Verify standard permissions and mark this role as reviewed and active.
            </DialogDescription>
          </DialogHeader>

          {reviewingRole && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border/80 bg-muted/15 p-3">
                <div className="font-semibold text-sm">{reviewingRole.name}</div>
                <div className="mt-1 text-muted-foreground text-xs">
                  {reviewingRole.description || "No description provided."}
                </div>
              </div>

              <div>
                <span className="font-semibold text-xs">Permissions Summary</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {reviewingRole.permissionSets?.map((ps) => (
                    <Badge
                      key={ps.id}
                      variant="outline"
                      className="rounded-sm border-zinc-700 bg-zinc-900/50 text-[10px] text-zinc-300"
                    >
                      {ps.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <Field className="gap-1.5">
                <label htmlFor="review-notes" className="font-semibold text-xs">
                  Review Notes
                </label>
                <Textarea
                  id="review-notes"
                  placeholder="Approve access or summarize changes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="min-h-[70px]"
                  disabled={isSavingReview}
                />
              </Field>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewPermissionsOpen(false)} disabled={isSavingReview}>
              Cancel
            </Button>
            <Button className="font-semibold" onClick={handleConfirmReview} disabled={isSavingReview}>
              {isSavingReview && <Spinner className="mr-2" />}
              Approve & Complete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal Dialog */}
      <Dialog open={isManageMembersOpen} onOpenChange={setIsManageMembersOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Manage Role Members</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Assign or unassign workspace users to this role.
            </DialogDescription>
          </DialogHeader>

          {loadingMembers ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner className="size-6" />
              <span className="ml-2 text-muted-foreground text-sm">Loading members...</span>
            </div>
          ) : managingRole ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border/85 bg-muted/15 p-3">
                <div className="font-semibold text-sm">{managingRole.name}</div>
                <div className="mt-0.5 text-muted-foreground text-xs">
                  Currently assigned members:{" "}
                  <span className="font-semibold text-foreground">{managingRole.users?.length || 0}</span>
                </div>
              </div>

              <Field className="gap-1.5">
                <span className="font-semibold text-xs">Select Workspace Users</span>
                <div className="grid max-h-[180px] grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border/80 bg-muted/20 p-2">
                  {allWorkspaceUsersSorted().map((u) => {
                    const isChecked = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between space-x-2 py-1 border-b border-border/40 last:border-0 pr-1"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Checkbox
                            id={`user-assign-${u.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUserIds([...selectedUserIds, u.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                              }
                            }}
                            disabled={isSavingMembers}
                          />
                          <label
                            htmlFor={`user-assign-${u.id}`}
                            className="cursor-pointer select-none truncate font-medium text-xs text-foreground"
                          >
                            {u.name ? `${u.name} (${u.email})` : u.email}
                          </label>
                        </div>
                        {u.customRole && u.customRole.id !== managingRole.id && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded bg-muted/30">
                            {u.customRole.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {allWorkspaceUsersList.length === 0 && (
                    <span className="text-muted-foreground text-xs p-2 text-center">
                      No other workspace users found.
                    </span>
                  )}
                </div>
              </Field>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsManageMembersOpen(false)} disabled={isSavingMembers}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMembers} disabled={isSavingMembers}>
              {isSavingMembers && <Spinner className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
