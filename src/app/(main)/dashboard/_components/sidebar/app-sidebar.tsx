"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { CircleHelp, ClipboardList, Command, Database, File, Search, Settings } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { usePermissions } from "./permission-guard";

const _data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  const [filteredItems, setFilteredItems] = useState(sidebarItems);
  const { hasPermission, permissions } = usePermissions();

  useEffect(() => {
    // Note: permissions is only ever read here after PermissionGuard finishes
    // loading, so an empty array legitimately means "no granted permissions"
    // (e.g. a plain student account) rather than "still loading".
    const updated = sidebarItems.map((group) => {
      const filteredGroupItems = group.items
        .map((item) => {
          const subject = item.id.toUpperCase().replace("-", "_");

          if (item.subItems) {
            const filteredSub = item.subItems.filter((sub) => {
              if (sub.id.endsWith("-new")) {
                return hasPermission("CREATE", subject) || hasPermission("MANAGE", subject);
              }
              if (sub.id.endsWith("-list")) {
                return hasPermission("READ", subject) || hasPermission("MANAGE", subject);
              }
              return true;
            });
            return {
              ...item,
              subItems: filteredSub,
            };
          }
          return item;
        })
        .filter((item) => {
          if (item.id === "default") return true;

          const isSuperAdmin = hasPermission("MANAGE", "all");
          const canManageQuizzes =
            isSuperAdmin ||
            hasPermission("READ", "QUIZZES") ||
            hasPermission("MANAGE", "QUIZZES");

          // Students: My Quizzes only. Teachers: Quizzes + Questions. Super admin: all.
          if (item.id === "my-quizzes") {
            return isSuperAdmin || !canManageQuizzes;
          }
          if (item.id === "quizzes" || item.id === "questions") {
            return canManageQuizzes;
          }
          if (item.id === "students") {
            return false; // soon / disabled
          }

          const subject = item.id.toUpperCase().replace("-", "_");
          const hasRead = hasPermission("READ", subject) || hasPermission("MANAGE", subject);
          if (!hasRead) return false;
          if (item.subItems && item.subItems.length === 0) return false;
          return true;
        });

      return {
        ...group,
        items: filteredGroupItems,
      };
    });

    setFilteredItems(updated.filter((group) => group.items.length > 0));
  }, [permissions, hasPermission]);

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/admin/default">
                <Command />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
