import { cn } from "@/lib/utils";
import type { CampaignStatus, ContactStatus, SendStatus } from "@/lib/types";

type Status = CampaignStatus | ContactStatus | SendStatus | "bounced" | "error" | "draft" | "scheduled" | "running";

const STYLES: Record<Status, string> = {
  active: "bg-success-muted text-success",
  paused: "bg-warning-muted text-warning",
  queued: "bg-info/15 text-info",
  pending: "bg-success-muted text-success",
  stopped: "bg-danger-muted text-danger",
  invalid: "bg-danger-muted text-danger",
  completed: "bg-surface-hover text-muted",
  generation_failed: "bg-warning-muted text-warning",
  replied: "bg-accent-muted text-accent",
  complained: "bg-danger-muted text-danger",
  unsubscribed: "bg-danger-muted text-danger",
  error: "bg-danger-muted text-danger",
  draft: "bg-surface-hover text-muted",
  scheduled: "bg-info/15 text-info",
  running: "bg-success-muted text-success",
  sent: "bg-success-muted text-success",
  failed: "bg-danger-muted text-danger",
  bounced: "bg-danger-muted text-danger",
};

const LABELS: Record<Status, string> = {
  active: "Active",
  paused: "Paused",
  queued: "Queued",
  pending: "Active",
  stopped: "Stopped",
  invalid: "Invalid",
  completed: "Completed",
  generation_failed: "Generation failed",
  replied: "Replied",
  complained: "Complained",
  unsubscribed: "Unsubscribed",
  error: "Error",
  draft: "Draft",
  scheduled: "Scheduled",
  running: "Running",
  sent: "Sent",
  failed: "Failed",
  bounced: "Bounced",
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap",
        STYLES[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
