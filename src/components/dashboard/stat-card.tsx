import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  tone?: "default" | "accent" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        <Icon
          size={15}
          className={cn(
            tone === "accent" && "text-accent",
            tone === "warning" && "text-warning",
            tone === "default" && "text-muted-faint"
          )}
        />
      </div>
      <p className="mt-2.5 text-[26px] font-semibold tracking-tight text-fg tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-faint">{sub}</p>}
    </div>
  );
}
