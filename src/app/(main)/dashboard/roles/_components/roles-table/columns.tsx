"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";

import type { Role } from "./data";

export const rolesColumns: ColumnDef<Role>[] = [
  {
    id: "group",
    accessorKey: "group",
    filterFn: "equalsString",
    enableHiding: true,
  },
  {
    id: "search",
    accessorFn: (row) => [row.role, row.owner, ...row.permissionSets].join(" "),
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    id: "role",
    accessorKey: "role",
    header: "Role",
    size: 180,
    minSize: 180,
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.role}</span>,
  },
  {
    id: "accessLevel",
    accessorKey: "accessLevel",
    header: "Access level",
    size: 120,
    cell: ({ row }) => (
      <Badge className="rounded-sm" variant="outline">
        {row.original.accessLevel}
      </Badge>
    ),
  },
  {
    id: "users",
    accessorKey: "users",
    header: "Users",
    size: 70,
    cell: ({ row }) => <span className="text-sm">{row.original.users}</span>,
  },
  {
    id: "permissionSets",
    accessorFn: (row) => row.permissionSets.join(" "),
    header: "Permission sets",
    size: 310,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center justify-start gap-2">
        {row.original.permissionSets.slice(0, 3).map((set) => (
          <Badge className="rounded-sm" variant="outline" key={set}>
            {set}
          </Badge>
        ))}
        {row.original.permissionSets.length > 3 ? (
          <span className="text-sm tabular-nums">+{row.original.permissionSets.length - 3}</span>
        ) : null}
      </div>
    ),
  },
  {
    id: "lastReview",
    accessorKey: "lastReview",
    header: "Last review",
    size: 120,
    cell: ({ row }) => <span className="text-sm">{row.original.lastReview}</span>,
  },
  {
    id: "owner",
    accessorKey: "owner",
    header: "Owner",
    size: 110,
    filterFn: "equalsString",
    cell: ({ row }) => <span className="text-sm">{row.original.owner}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    size: 130,
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge className="rounded-sm" variant="outline">
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    size: 70,
    cell: ({ row }) => {
      const isSystemRole = row.original.group === "System roles";
      const needsReview = row.original.status === "Needs review";

      const handleReview = async () => {
        const token = getClientCookie("session_token");
        try {
          const response = await fetch(`${APP_CONFIG.apiUrl}/roles/${row.original.id}/review`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ notes: "Reviewed via Roles & Permissions Dashboard" }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to review role.");
          }

          toast.success(`Role "${row.original.role}" reviewed successfully!`);
          window.dispatchEvent(new Event("refresh-roles"));
          window.dispatchEvent(new Event("refresh-access-reviews"));
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "An unexpected error occurred.";
          toast.error("Review failed", { description: errMsg });
        }
      };

      const handleDelete = async () => {
        const token = getClientCookie("session_token");
        try {
          const response = await fetch(`${APP_CONFIG.apiUrl}/roles/${row.original.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to delete role.");
          }

          toast.success(`Role "${row.original.role}" archived successfully!`);
          window.dispatchEvent(new Event("refresh-roles"));
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "An unexpected error occurred.";
          toast.error("Delete failed", { description: errMsg });
        }
      };

      const handleEdit = () => {
        window.dispatchEvent(
          new CustomEvent("edit-role", {
            detail: { id: row.original.id },
          }),
        );
      };

      const handleViewDetails = () => {
        window.dispatchEvent(
          new CustomEvent("view-role-details", {
            detail: { id: row.original.id },
          }),
        );
      };

      const handleDuplicate = () => {
        window.dispatchEvent(
          new CustomEvent("duplicate-role", {
            detail: { id: row.original.id },
          }),
        );
      };

      const handleReviewPermissions = () => {
        window.dispatchEvent(
          new CustomEvent("review-role-permissions", {
            detail: { id: row.original.id },
          }),
        );
      };

      const handleManageMembers = () => {
        window.dispatchEvent(
          new CustomEvent("manage-role-members", {
            detail: { id: row.original.id },
          }),
        );
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="end">
            <DropdownMenuGroup>
              {needsReview ? <DropdownMenuItem onClick={handleReview}>Review changes</DropdownMenuItem> : null}
              <DropdownMenuItem onClick={handleViewDetails}>View details</DropdownMenuItem>
              <DropdownMenuItem disabled={isSystemRole} onClick={handleEdit}>
                Edit role
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isSystemRole} onClick={handleDuplicate}>
                Duplicate role
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleReviewPermissions}>Review permissions</DropdownMenuItem>
              <DropdownMenuItem onClick={handleManageMembers}>Manage members</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={isSystemRole} variant="destructive" onClick={handleDelete}>
                Archive role
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableColumnFilter: false,
  },
];
