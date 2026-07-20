"use client";
"use no memo";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { AlertTriangle, Cog, Download, Grid, Plus, Rows3, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

import {
  ACCOUNT_TEAMS,
  displayUserRole,
  filters,
  formatJoinedDate,
  isRootPlatformOwner,
  PLATFORM_OWNER_EMAIL,
  suggestTeamForRole,
  type SystemRole,
  type UserRow,
  type UserStatus,
  type UserTeam,
} from "./data";
import { getUsersColumns } from "./users-columns";
import { UsersTable } from "./users-table";

const STUDENT_ROLE_VALUE = "None";
type SystemPrivilege = "USER" | "SUPER_ADMIN";

interface BackendRole {
  id: string;
  name: string;
}

interface BackendUser {
  id: string;
  email: string;
  name?: string | null;
  team?: string | null;
  status: string;
  createdAt: string;
  customRole?: {
    id: string;
    name: string;
  } | null;
  role: string;
  workspace?: {
    name: string;
  } | null;
  canViewOthers?: boolean;
  canManagePermissions?: boolean;
  authProvider?: "google" | "email";
  googleId?: string | null;
  teacherProfile?: {
    id: string;
    slug: string;
    reviewStatus: "Pending" | "Active" | "Rejected";
    isPublic: boolean;
  } | null;
}

function getDecodedToken(token: string | null | undefined) {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function Users({ users: initialUsers }: { users?: UserRow[] }) {
  const [usersList, setUsersList] = useState<UserRow[]>(initialUsers ?? []);
  const [rolesList, setRolesList] = useState<BackendRole[]>([]);
  const [loading, setLoading] = useState(!initialUsers);
  const [error, setError] = useState<string | null>(null);

  // Modal form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserTeam, setNewUserTeam] = useState<UserTeam>("Student");
  const [newUserRoleId, setNewUserRoleId] = useState(STUDENT_ROLE_VALUE);
  const [newCanViewOthers, setNewCanViewOthers] = useState(false);
  const [newCanManagePermissions, setNewCanManagePermissions] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Edit / View user modal state
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserRow | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserTeam, setEditUserTeam] = useState("Platform");
  const [editUserRoleId, setEditUserRoleId] = useState("");
  const [editSystemPrivilege, setEditSystemPrivilege] = useState<SystemPrivilege>("USER");
  const [editCanViewOthers, setEditCanViewOthers] = useState(false);
  const [editCanManagePermissions, setEditCanManagePermissions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Soft / hard delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Activate teacher profile
  const [activateTarget, setActivateTarget] = useState<UserRow | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (selectedUserForModal) {
      setEditUserName(selectedUserForModal.name);
      setEditUserTeam(selectedUserForModal.team);
      setEditUserRoleId(selectedUserForModal.customRoleId || "None");
      setEditSystemPrivilege(
        selectedUserForModal.systemRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER",
      );
      setEditCanViewOthers(!!selectedUserForModal.canViewOthers);
      setEditCanManagePermissions(!!selectedUserForModal.canManagePermissions);
    } else {
      setEditUserName("");
      setEditUserTeam("Platform");
      setEditUserRoleId("");
      setEditSystemPrivilege("USER");
      setEditCanViewOthers(false);
      setEditCanManagePermissions(false);
    }
  }, [selectedUserForModal]);

  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "joinedDate", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    search: false,
    team: false,
    // Auth method is shown under the user name; keep dedicated column optional
    authProvider: false,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Platform owner / SUPER_ADMIN can manage delegation flags; root alone grants SUPER_ADMIN
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [isRootCaller, setIsRootCaller] = useState(false);

  useEffect(() => {
    const token = getClientCookie("session_token");
    const decoded = getDecodedToken(token);
    const email = decoded?.email as string | undefined;
    const role = decoded?.role as string | undefined;
    setIsRootCaller(isRootPlatformOwner(email));
    setIsPlatformOwner(role === "SUPER_ADMIN" || isRootPlatformOwner(email));
  }, []);

  const fetchData = useCallback(async () => {
    const token = getClientCookie("session_token");
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${APP_CONFIG.apiUrl}/users`, { headers }),
        fetch(`${APP_CONFIG.apiUrl}/roles`, { headers }),
      ]);

      if (!usersRes.ok || !rolesRes.ok) {
        throw new Error("Failed to load workspace members or access roles.");
      }

      const [usersData, rolesData] = await Promise.all([usersRes.json(), rolesRes.json()]);

      // Map backend users to UserRow UI definitions
      const mapped: UserRow[] = usersData.map((u: BackendUser) => ({
        id: u.id,
        name: u.name ?? u.email.split("@")[0],
        email: u.email,
        role: displayUserRole({
          customRoleName: u.customRole?.name,
          systemRole: u.role,
          team: u.team,
        }),
        systemRole: u.role as SystemRole,
        team: (u.team ?? "Platform") as UserTeam,
        workspace: u.workspace?.name ? [u.workspace.name] : ["Workspace"],
        status: (u.status === "Inactive" ? "Deactivated" : u.status === "Active" ? "Active" : u.status) as UserStatus,
        joinedDate: formatJoinedDate(u.createdAt),
        lastActive: 0,
        canViewOthers: u.canViewOthers,
        canManagePermissions: u.canManagePermissions,
        customRoleId: u.customRole?.id || null,
        authProvider: u.authProvider ?? (u.googleId ? "google" : "email"),
        teacherProfile: u.teacherProfile ?? null,
      }));

      setUsersList(mapped);
      setRolesList(rolesData);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred while syncing with backend.";
      setError(errMsg);
      toast.error("Fetch failed", { description: errMsg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();

    const handleRefresh = () => {
      void fetchData();
    };

    window.addEventListener("refresh-users", handleRefresh);
    return () => {
      window.removeEventListener("refresh-users", handleRefresh);
    };
  }, [fetchData]);

  const applyRoleSelection = (
    roleId: string,
    setRoleId: (id: string) => void,
    setTeam: (team: UserTeam) => void,
  ) => {
    setRoleId(roleId);
    if (roleId === STUDENT_ROLE_VALUE) {
      setTeam("Student");
      return;
    }
    const role = rolesList.find((r) => r.id === roleId);
    setTeam(suggestTeamForRole(role?.name));
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserTeam) return;
    setIsAdding(true);
    const token = getClientCookie("session_token");
    try {
      const customRoleId =
        !newUserRoleId || newUserRoleId === STUDENT_ROLE_VALUE ? undefined : newUserRoleId;
      const response = await fetch(`${APP_CONFIG.apiUrl}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          team: newUserTeam,
          customRoleId,
          status: "Active",
          canViewOthers: isPlatformOwner ? newCanViewOthers : false,
          canManagePermissions: isPlatformOwner ? newCanManagePermissions : false,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to onboard new user.");
      }

      toast.success(`User "${newUserName}" added to workspace!`);
      setIsAddOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserTeam("Student");
      setNewUserRoleId(STUDENT_ROLE_VALUE);
      setNewCanViewOthers(false);
      setNewCanManagePermissions(false);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Invitation failed", { description: errMsg });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUserForModal?.id || !editUserName.trim()) return;
    if (isRootPlatformOwner(selectedUserForModal.email)) {
      toast.error("Root owner is locked", {
        description: `${PLATFORM_OWNER_EMAIL} cannot be edited.`,
      });
      return;
    }
    setIsUpdating(true);
    const token = getClientCookie("session_token");
    try {
      const body: Record<string, unknown> = {
        name: editUserName,
        team: editUserTeam,
        customRoleId: editUserRoleId === "None" || !editUserRoleId ? null : editUserRoleId,
        canViewOthers: isPlatformOwner ? editCanViewOthers : undefined,
        canManagePermissions: isPlatformOwner ? editCanManagePermissions : undefined,
      };
      if (isRootCaller) {
        body.role = editSystemPrivilege;
      }
      const response = await fetch(`${APP_CONFIG.apiUrl}/users/${selectedUserForModal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update user profile.");
      }

      toast.success("User profile updated successfully!");
      setSelectedUserForModal(null);
      setModalMode(null);
      await fetchData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Request failed";
      toast.error("Update failed", { description: errMsg });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id || !deleteMode) return;
    const token = getClientCookie("session_token");
    setIsDeleting(true);
    try {
      const url =
        deleteMode === "soft"
          ? `${APP_CONFIG.apiUrl}/users/${deleteTarget.id}/soft-delete`
          : `${APP_CONFIG.apiUrl}/users/${deleteTarget.id}`;
      const response = await fetch(url, {
        method: deleteMode === "soft" ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || `Failed to ${deleteMode === "soft" ? "soft-delete" : "hard-delete"} user.`;
        throw new Error(errMsg);
      }
      toast.success(deleteMode === "soft" ? "User deactivated" : "User permanently deleted", {
        description:
          result.message ||
          (deleteMode === "soft"
            ? `${deleteTarget.name} can no longer sign in.`
            : `${deleteTarget.name} has been removed.`),
      });
      setDeleteTarget(null);
      setDeleteMode(null);
      await fetchData();
    } catch (err) {
      toast.error(deleteMode === "soft" ? "Soft delete failed" : "Hard delete failed", {
        description: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteMode, fetchData]);

  const confirmActivateTeacher = useCallback(async () => {
    if (!activateTarget?.id) return;
    const token = getClientCookie("session_token");
    setIsActivating(true);
    try {
      const response = await fetch(
        `${APP_CONFIG.apiUrl}/users/${activateTarget.id}/activate-teacher`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message || "Failed to activate teacher profile.";
        throw new Error(errMsg);
      }
      toast.success("Teacher profile activated", {
        description: result.message || `${activateTarget.name} can now publish their page.`,
      });
      setActivateTarget(null);
      await fetchData();
    } catch (err) {
      toast.error("Activation failed", {
        description: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setIsActivating(false);
    }
  }, [activateTarget, fetchData]);

  const columns = useMemo(() => {
    return getUsersColumns(
      isPlatformOwner,
      async (userId, field, currentValue) => {
        const target = usersList.find((u) => u.id === userId);
        if (target && isRootPlatformOwner(target.email)) {
          toast.error("Root owner is locked", {
            description: `${PLATFORM_OWNER_EMAIL} permissions cannot be changed.`,
          });
          return;
        }
        const token = getClientCookie("session_token");
        try {
          const response = await fetch(`${APP_CONFIG.apiUrl}/users/${userId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              [field]: !currentValue,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to update user permissions.");
          }

          toast.success("User permissions updated successfully!");
          void fetchData();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Request failed";
          toast.error("Update failed", { description: errMsg });
        }
      },
      (action, user) => {
        if (action === "edit" && isRootPlatformOwner(user.email)) {
          toast.error("Root owner is locked", {
            description: `${PLATFORM_OWNER_EMAIL} cannot be edited.`,
          });
          return;
        }
        setSelectedUserForModal(user);
        setModalMode(action);
      },
      (user) => {
        if (isRootPlatformOwner(user.email)) {
          toast.error("Root owner is locked", {
            description: `${PLATFORM_OWNER_EMAIL} cannot be deactivated.`,
          });
          return;
        }
        setDeleteTarget(user);
        setDeleteMode("soft");
      },
      (user) => {
        if (isRootPlatformOwner(user.email)) {
          toast.error("Root owner is locked", {
            description: `${PLATFORM_OWNER_EMAIL} cannot be deleted.`,
          });
          return;
        }
        setDeleteTarget(user);
        setDeleteMode("hard");
      },
      (user) => setActivateTarget(user),
    );
  }, [isPlatformOwner, fetchData, usersList]);

  const table = useReactTable({
    data: usersList,
    columns: columns,
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.email,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const roleFilterOptions = useMemo(() => {
    const fromApi = rolesList.map((r) => r.name);
    const merged = new Set(["All", "Student", "User", ...fromApi, ...filters.role.slice(1)]);
    return Array.from(merged);
  }, [rolesList]);

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string) ?? "";
  const roleFilter = (table.getColumn("role")?.getFilterValue() as string) ?? "All";
  const teamFilter = (table.getColumn("team")?.getFilterValue() as string) ?? filters.team[0];
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) ?? filters.status[0];
  const workspaceFilter = (table.getColumn("workspace")?.getFilterValue() as string) ?? filters.workspace[0];
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  if (loading && usersList.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
        <span className="ml-2 text-muted-foreground text-sm">Syncing workspace members...</span>
      </div>
    );
  }

  if (error && usersList.length === 0) {
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
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">Users</CardTitle>
        <CardDescription className="max-w-sm leading-snug">
          Manage your organization members and their access.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              className="h-7"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(event) => {
                table.getColumn("search")?.setFilterValue(event.target.value || undefined);
                table.setPageIndex(0);
              }}
            />
            <InputGroupAddon align="inline-end">
              <Kbd className="h-4 text-[10px]">⌘K</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <Button variant="outline" size="sm">
            <SlidersHorizontal /> Hide
          </Button>
          <Button variant="outline" size="sm">
            <Cog /> Customize
          </Button>
          <Button variant="outline" size="sm">
            <Download /> Export
          </Button>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus /> Add User
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={roleFilter} onValueChange={(value) => setColumnSelectFilter("role", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Role:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {roleFilterOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={teamFilter} onValueChange={(value) => setColumnSelectFilter("team", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Team:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filters.team.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setColumnSelectFilter("status", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Status:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filters.status.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Select value={workspaceFilter} onValueChange={(value) => setColumnSelectFilter("workspace", value)}>
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Workspace:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                {filters.workspace.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 px-4">
          <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} selected</div>

          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list" aria-label="List view">
                <Rows3 />
              </TabsTrigger>
              <TabsTrigger value="grid" aria-label="Grid view">
                <Grid />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <UsersTable table={table} />
      </CardContent>

      <AlertDialog
        open={!!activateTarget}
        onOpenChange={(open) => {
          if (!open && !isActivating) setActivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate teacher profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Approve <strong>{activateTarget?.name}</strong> ({activateTarget?.email}) so they can
              publish their public teacher page. They will receive a confirmation email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isActivating}
              onClick={(e) => {
                e.preventDefault();
                void confirmActivateTeacher();
              }}
            >
              {isActivating ? <Spinner className="size-4" /> : null}
              Activate profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget && !!deleteMode}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
            setDeleteMode(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "hard" ? "Permanently delete user?" : "Soft-delete (deactivate) user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "hard" ? (
                <>
                  This will permanently remove <strong>{deleteTarget?.name}</strong> (
                  {deleteTarget?.email}). Quizzes they created stay in the system and are reassigned to
                  you. This cannot be undone.
                </>
              ) : (
                <>
                  <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) will be deactivated and
                  cannot sign in. You can restore access later by setting status back to Active.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={deleteMode === "hard" ? "destructive" : "default"}
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {isDeleting ? <Spinner className="size-4" /> : null}
              {deleteMode === "hard" ? "Hard delete" : "Soft delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Modal Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Onboard New Member</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Add a new member to your tenant workspace and assign their access permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field className="gap-1.5">
              <label htmlFor="new-user-name" className="font-semibold text-xs">
                Full Name
              </label>
              <Input
                id="new-user-name"
                placeholder="e.g. Sarah Jenkins"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                disabled={isAdding}
              />
            </Field>

            <Field className="gap-1.5">
              <label htmlFor="new-user-email" className="font-semibold text-xs">
                Email Address
              </label>
              <Input
                id="new-user-email"
                type="email"
                placeholder="sarah@company.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                disabled={isAdding}
              />
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Role</span>
              <Select
                value={newUserRoleId}
                onValueChange={(v) => applyRoleSelection(v, setNewUserRoleId, setNewUserTeam)}
                disabled={isAdding}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select workspace role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STUDENT_ROLE_VALUE}>Student (no custom role)</SelectItem>
                  {rolesList.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Team</span>
              <Select
                value={newUserTeam}
                onValueChange={(v) => setNewUserTeam(v)}
                disabled={isAdding}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-[11px]">
                Owner → Executive · Teacher → Teacher · Student → Student. You can override team
                manually.
              </p>
            </Field>

            {isPlatformOwner && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="new-user-can-view"
                    checked={newCanViewOthers}
                    onCheckedChange={(checked) => setNewCanViewOthers(!!checked)}
                    disabled={isAdding}
                  />
                  <label htmlFor="new-user-can-view" className="font-semibold text-xs cursor-pointer select-none">
                    Can view other users
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="new-user-can-manage"
                    checked={newCanManagePermissions}
                    onCheckedChange={(checked) => setNewCanManagePermissions(!!checked)}
                    disabled={isAdding}
                  />
                  <label htmlFor="new-user-can-manage" className="font-semibold text-xs cursor-pointer select-none">
                    Can manage permissions / add users
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={isAdding || !newUserName || !newUserEmail || !newUserTeam}
            >
              {isAdding && <Spinner className="mr-2" />}
              Invite User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / View User Dialog */}
      <Dialog
        open={selectedUserForModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserForModal(null);
            setModalMode(null);
          }
        }}
      >
        <DialogContent className="max-w-md border border-border bg-card animate-fadeIn">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">
              {modalMode === "view" ? "User Profile" : "Edit User Access"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {modalMode === "view"
                ? "View member details and current access level."
                : "Modify member profile and assign module permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field className="gap-1.5">
              <label htmlFor="edit-user-name" className="font-semibold text-xs">
                Full Name
              </label>
              <Input
                id="edit-user-name"
                placeholder="Full Name"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                disabled={modalMode === "view" || isUpdating}
              />
            </Field>

            <Field className="gap-1.5">
              <label htmlFor="edit-user-email" className="font-semibold text-xs">
                Email Address
              </label>
              <Input id="edit-user-email" type="email" value={selectedUserForModal?.email || ""} disabled={true} />
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Role</span>
              <Select
                value={editUserRoleId || STUDENT_ROLE_VALUE}
                onValueChange={(v) => applyRoleSelection(v, setEditUserRoleId, setEditUserTeam)}
                disabled={modalMode === "view" || isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select custom role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STUDENT_ROLE_VALUE}>Student (no custom role)</SelectItem>
                  {rolesList.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field className="gap-1.5">
              <span className="font-semibold text-foreground text-xs">Team</span>
              <Select
                value={
                  ACCOUNT_TEAMS.includes(editUserTeam as (typeof ACCOUNT_TEAMS)[number])
                    ? editUserTeam
                    : editUserTeam || "Platform"
                }
                onValueChange={(v) => setEditUserTeam(v)}
                disabled={modalMode === "view" || isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                  {editUserTeam &&
                  !ACCOUNT_TEAMS.includes(editUserTeam as (typeof ACCOUNT_TEAMS)[number]) ? (
                    <SelectItem value={editUserTeam}>{editUserTeam}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-[11px]">
                Changing role auto-sets team (Owner → Executive, Teacher → Teacher, Student →
                Student). Adjust team if needed before saving.
              </p>
            </Field>

            {isRootCaller ? (
              <Field className="gap-1.5">
                <span className="font-semibold text-foreground text-xs">System privilege</span>
                <Select
                  value={editSystemPrivilege}
                  onValueChange={(v) => setEditSystemPrivilege(v as SystemPrivilege)}
                  disabled={modalMode === "view" || isUpdating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Standard user</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-[11px]">
                  Only the root owner ({PLATFORM_OWNER_EMAIL}) can grant or revoke Super Admin.
                  Super Admin gets full platform access (Settings, Users, Backup, Logs).
                </p>
              </Field>
            ) : null}

            {isPlatformOwner && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-user-can-view"
                    checked={editCanViewOthers}
                    onCheckedChange={(checked) => setEditCanViewOthers(!!checked)}
                    disabled={modalMode === "view" || isUpdating}
                  />
                  <label htmlFor="edit-user-can-view" className="font-semibold text-xs cursor-pointer select-none">
                    Can view other users
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-user-can-manage"
                    checked={editCanManagePermissions}
                    onCheckedChange={(checked) => setEditCanManagePermissions(!!checked)}
                    disabled={modalMode === "view" || isUpdating}
                  />
                  <label htmlFor="edit-user-can-manage" className="font-semibold text-xs cursor-pointer select-none">
                    Can manage permissions / add users
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedUserForModal(null);
                setModalMode(null);
              }}
              disabled={isUpdating}
            >
              {modalMode === "view" ? "Close" : "Cancel"}
            </Button>
            {modalMode === "edit" && (
              <Button onClick={handleUpdateUser} disabled={isUpdating || !editUserName.trim()}>
                {isUpdating && <Spinner className="mr-2" />}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
