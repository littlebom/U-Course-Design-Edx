"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Library as LibIcon, BookOpen, FolderOpen, Users,
  PanelLeftClose, PanelLeftOpen, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "ucb:navCollapsed";

interface NavItem {
  href: string;
  label: string;
  icon: typeof BookOpen;
  adminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/courses", label: "Course", icon: BookOpen },
  { href: "/libraries", label: "Library", icon: FolderOpen },
  { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users, adminOnly: true },
];

export function HubShell({
  role,
  name,
  children,
}: {
  role: string;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
    router.refresh();
  };

  const items = ITEMS.filter((i) => !i.adminOnly || role === "admin");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r bg-default-50 transition-all duration-200",
          collapsed ? "w-14" : "w-56",
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b px-3", collapsed && "justify-center px-0")}>
          <LibIcon size={20} className="shrink-0 text-primary" />
          {!collapsed && <span className="truncate text-sm font-semibold text-default-700">U-CourseBuilder</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                title={collapsed ? it.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-default-600 hover:bg-default-100 hover:text-default-900",
                )}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer: user + logout + collapse */}
        <div className="shrink-0 space-y-1 border-t p-2">
          {!collapsed && (
            <div className="truncate px-2.5 py-1 text-sm text-default-500" title={name}>
              {name} {role === "admin" && <span className="text-primary">(admin)</span>}
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            title="ออกจากระบบ"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-default-600 transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut size={17} className="shrink-0" />
            {!collapsed && <span>ออกจากระบบ</span>}
          </button>
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-default-500 transition-colors hover:bg-default-100",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!collapsed && <span>ย่อเมนู</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
