"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { parse } from "date-fns";
import { Check, Clock, Mail, MoreHorizontal, X } from "lucide-react";
import { siGoogle } from "simple-icons";
import { toast } from "sonner";

import { SimpleIcon } from "@/components/simple-icon";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { cn, getInitials } from "@/lib/utils";

import { statusMeta, type TeacherReviewStatus, type UserRow } from "./data";

function AuthProviderBadge({ provider }: { provider?: UserRow["authProvider"] }) {
  if (provider === "google") {
    return (
      <Badge
        variant="outline"
        className="mt-0.5 gap-1 border-slate-200 bg-white px-1.5 py-0 text-[10px] font-medium text-slate-600"
        title="Registered with Google"
      >
        <SimpleIcon icon={siGoogle} className="size-2.5" />
        Google
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="mt-0.5 gap-1 border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] font-medium text-slate-500"
      title="Registered with email and password"
    >
      <Mail className="size-2.5" />
      Email
    </Badge>
  );
}

function RoleCell({
  role,
  team,
  teacherReviewStatus,
}: {
  role: string;
  team: string;
  teacherReviewStatus?: TeacherReviewStatus;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="whitespace-nowrap">{role}</span>
      <span className="text-muted-foreground text-xs">{team}</span>
      {teacherReviewStatus === "Pending" ? (
        <Badge
          variant="outline"
          className="mt-0.5 w-fit border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-700"
        >
          Teacher pending
        </Badge>
      ) : null}
      {teacherReviewStatus === "Active" && (role === "Teacher" || team === "Teacher") ? (
        <Badge
          variant="outline"
          className="mt-0.5 w-fit border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] font-medium text-emerald-700"
        >
          Teacher active
        </Badge>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: UserRow["status"] }) {
  const meta = statusMeta[status];

  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {status}
    </Badge>
  );
}

function getAvatarTone(name: string) {
  const tones = [
    "[&_[data-slot=avatar-fallback]]:bg-amber-100 [&_[data-slot=avatar-fallback]]:text-amber-700 after:border-amber-200 dark:[&_[data-slot=avatar-fallback]]:bg-amber-500/15 dark:[&_[data-slot=avatar-fallback]]:text-amber-300 dark:after:border-amber-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-orange-100 [&_[data-slot=avatar-fallback]]:text-orange-700 after:border-orange-200 dark:[&_[data-slot=avatar-fallback]]:bg-orange-500/15 dark:[&_[data-slot=avatar-fallback]]:text-orange-300 dark:after:border-orange-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-rose-100 [&_[data-slot=avatar-fallback]]:text-rose-700 after:border-rose-200 dark:[&_[data-slot=avatar-fallback]]:bg-rose-500/15 dark:[&_[data-slot=avatar-fallback]]:text-rose-300 dark:after:border-rose-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-pink-100 [&_[data-slot=avatar-fallback]]:text-pink-700 after:border-pink-200 dark:[&_[data-slot=avatar-fallback]]:bg-pink-500/15 dark:[&_[data-slot=avatar-fallback]]:text-pink-300 dark:after:border-pink-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-fuchsia-100 [&_[data-slot=avatar-fallback]]:text-fuchsia-700 after:border-fuchsia-200 dark:[&_[data-slot=avatar-fallback]]:bg-fuchsia-500/15 dark:[&_[data-slot=avatar-fallback]]:text-fuchsia-300 dark:after:border-fuchsia-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-purple-100 [&_[data-slot=avatar-fallback]]:text-purple-700 after:border-purple-200 dark:[&_[data-slot=avatar-fallback]]:bg-purple-500/15 dark:[&_[data-slot=avatar-fallback]]:text-purple-300 dark:after:border-purple-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-violet-100 [&_[data-slot=avatar-fallback]]:text-violet-700 after:border-violet-200 dark:[&_[data-slot=avatar-fallback]]:bg-violet-500/15 dark:[&_[data-slot=avatar-fallback]]:text-violet-300 dark:after:border-violet-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-indigo-100 [&_[data-slot=avatar-fallback]]:text-indigo-700 after:border-indigo-200 dark:[&_[data-slot=avatar-fallback]]:bg-indigo-500/15 dark:[&_[data-slot=avatar-fallback]]:text-indigo-300 dark:after:border-indigo-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-sky-100 [&_[data-slot=avatar-fallback]]:text-sky-700 after:border-sky-200 dark:[&_[data-slot=avatar-fallback]]:bg-sky-500/15 dark:[&_[data-slot=avatar-fallback]]:text-sky-300 dark:after:border-sky-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-emerald-100 [&_[data-slot=avatar-fallback]]:text-emerald-700 after:border-emerald-200 dark:[&_[data-slot=avatar-fallback]]:bg-emerald-500/15 dark:[&_[data-slot=avatar-fallback]]:text-emerald-300 dark:after:border-emerald-500/20",
  ];

  return tones[name.length % tones.length];
}

function getLastActiveBadge(lastActive: number) {
  if (lastActive < 1) {
    return {
      className: "bg-green-600 text-green-950 [&>svg]:text-white",
      icon: Check,
    };
  }

  if (lastActive < 4 * 60) {
    return {
      className: "bg-amber-500 text-amber-950",
      icon: Clock,
    };
  }

  if (lastActive < 7 * 24 * 60) {
    return {
      className: "bg-destructive",
      icon: null,
    };
  }

  return {
    className: "bg-muted-foreground text-muted",
    icon: X,
  };
}

function AvatarCell({ lastActive, name }: { lastActive: number; name: string }) {
  const badge = getLastActiveBadge(lastActive);
  const BadgeIcon = badge.icon;

  return (
    <Avatar size="lg" className={cn("font-medium", getAvatarTone(name))}>
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
      <AvatarBadge className={badge.className}>{BadgeIcon ? <BadgeIcon /> : null}</AvatarBadge>
    </Avatar>
  );
}

function WorkspaceCell({ workspaces }: { workspaces: string[] }) {
  const [firstWorkspace, ...remainingWorkspaces] = workspaces;
  const remainingCount = remainingWorkspaces.length;

  return (
    <AvatarGroup className="*:data-[slot=avatar]:ring-0">
      {firstWorkspace ? (
        <Avatar className="after:rounded-sm">
          <AvatarFallback className="rounded-sm ring-0">{getInitials(firstWorkspace)}</AvatarFallback>
        </Avatar>
      ) : null}
      {remainingCount > 0 ? (
        <AvatarGroupCount className="rounded-sm border ring-card">+{remainingCount}</AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  );
}

export const getUsersColumns = (
  isUdaya: boolean,
  onTogglePermission: (userId: string, field: "canViewOthers" | "canManagePermissions", currentValue: boolean) => void,
  onAction?: (action: "view" | "edit", user: UserRow) => void,
  onSoftDelete?: (user: UserRow) => void,
  onHardDelete?: (user: UserRow) => void,
  onActivateTeacher?: (user: UserRow) => void,
): ColumnDef<UserRow>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          aria-label="Select all users"
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          aria-label={`Select ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "search",
    accessorFn: (row) => `${row.name} ${row.email}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <AvatarCell name={row.original.name} lastActive={row.original.lastActive} />
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground text-sm">{row.original.name}</div>
          <div className="truncate text-muted-foreground text-sm">{row.original.email}</div>
          <AuthProviderBadge provider={row.original.authProvider} />
        </div>
      </div>
    ),
  },
  {
    accessorKey: "authProvider",
    header: "Sign-in",
    filterFn: "equalsString",
    cell: ({ row }) => <AuthProviderBadge provider={row.original.authProvider} />,
  },
  {
    accessorKey: "role",
    header: "Role / Team",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <RoleCell
        role={row.original.role}
        team={row.original.team}
        teacherReviewStatus={row.original.teacherProfile?.reviewStatus}
      />
    ),
  },
  {
    accessorKey: "canViewOthers",
    header: "View Others",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.original.canViewOthers || false}
          disabled={!isUdaya}
          onCheckedChange={() => {
            if (row.original.id) {
              onTogglePermission(row.original.id, "canViewOthers", row.original.canViewOthers || false);
            }
          }}
          aria-label="Toggle can view others"
        />
      </div>
    ),
  },
  {
    accessorKey: "canManagePermissions",
    header: "Manage Perms",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.original.canManagePermissions || false}
          disabled={!isUdaya}
          onCheckedChange={() => {
            if (row.original.id) {
              onTogglePermission(row.original.id, "canManagePermissions", row.original.canManagePermissions || false);
            }
          }}
          aria-label="Toggle can manage permissions"
        />
      </div>
    ),
  },
  {
    accessorKey: "team",
    header: "Team",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="text-sm">{row.original.team}</div>,
  },
  {
    accessorKey: "workspace",
    header: "Workspace",
    filterFn: "arrIncludes",
    cell: ({ row }) => <WorkspaceCell workspaces={row.original.workspace} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "joinedDate",
    accessorFn: (row) => parse(row.joinedDate, "dd MMM yyyy, h:mm a", new Date()).getTime(),
    header: "Joined date",
    cell: ({ row }) => <div className="text-foreground text-sm">{row.original.joinedDate}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Open actions for ${row.original.name}`}
              className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
              size="icon-sm"
              variant="ghost"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction?.("view", row.original)}>View profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("edit", row.original)}>Edit user</DropdownMenuItem>
            {row.original.teacherProfile?.reviewStatus === "Pending" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onActivateTeacher?.(row.original)}>
                  Activate teacher profile
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                if (!row.original.id) return;
                const token = getClientCookie("session_token");
                try {
                  const response = await fetch(`${APP_CONFIG.apiUrl}/users/${row.original.id}/invite`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  if (!response.ok) throw new Error("Failed to resend invite.");
                  toast.success(`Onboarding invitation resent to ${row.original.email}`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Request failed";
                  toast.error("Failed to invite", { description: msg });
                }
              }}
            >
              Resend invite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={row.original.status === "Deactivated"}
              onClick={() => onSoftDelete?.(row.original)}
            >
              Soft delete (deactivate)
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onHardDelete?.(row.original)}>
              Hard delete (permanent)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
];
