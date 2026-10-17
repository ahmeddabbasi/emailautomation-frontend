"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, Users, FlaskConical, History, TriangleAlert, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "./wordmark";
import { HealthIndicator, useHealth } from "./health-indicator";
import { LogoutButton } from "./logout-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/testing", label: "Testing", icon: FlaskConical },
  { href: "/history", label: "Send history", icon: History },
  { href: "/error-logs", label: "Error logs", icon: TriangleAlert },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const health = useHealth();
  const unresolved = health?.unresolvedErrorGroups ?? 0;

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Wordmark />
      </div>

      <nav className="flex-1 space-y-0.5 px-2.5 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const badge = item.href === "/error-logs" && unresolved > 0 ? (unresolved > 99 ? "99+" : String(unresolved)) : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                active ? "bg-surface-hover text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-accent" />}
              <Icon size={16} strokeWidth={2} className={active ? "text-accent" : "text-muted-faint group-hover:text-muted"} />
              {item.label}
              {badge && (
                <span
                  className="ml-auto rounded-full bg-danger/15 px-1.5 py-px text-[11px] font-semibold tabular-nums text-danger"
                  aria-label={`${badge} unresolved errors`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border px-4 py-3">
        <HealthIndicator health={health} />
        <LogoutButton />
      </div>
    </aside>
  );
}
