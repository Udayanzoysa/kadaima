import {
  ClipboardList,
  BookOpen,
  CreditCard,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  Lock,
  type LucideIcon,
  Settings,
  Store,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboard",
    items: [
      {
        id: "default",
        title: "Overview",
        url: "/admin/default",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 2,
    label: "Learning",
    items: [
      {
        id: "my-quizzes",
        title: "My Quizzes",
        url: "/admin/quizzes",
        icon: ListChecks,
      },
      {
        id: "quizzes",
        title: "Quizzes",
        url: "/admin/quizzes/manage",
        icon: ClipboardList,
      },
      {
        id: "courses",
        title: "Courses",
        url: "/admin/courses",
        icon: BookOpen,
      },
      {
        id: "questions",
        title: "Questions",
        url: "/admin/questions",
        icon: HelpCircle,
      },
      {
        id: "teacher-page",
        title: "Customize my page",
        url: "/admin/teacher-page",
        icon: Store,
      },
      {
        id: "students",
        title: "Students",
        url: "/admin/students",
        icon: GraduationCap,
        badge: "soon",
        disabled: true,
      },
    ],
  },
  {
    id: 3,
    label: "Administration",
    items: [
      {
        id: "users",
        title: "Users",
        url: "/admin/users",
        icon: Users,
      },
      {
        id: "roles",
        title: "Roles",
        url: "/admin/roles",
        icon: Lock,
      },
      {
        id: "payments",
        title: "Payments",
        url: "/admin/payments",
        icon: CreditCard,
      },
      {
        id: "settings",
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];
