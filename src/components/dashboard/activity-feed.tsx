import Link from "next/link";
import { History } from "lucide-react";
import type { SendLog } from "@/lib/types";
import { SEQUENCE_STEP_LABELS } from "@/lib/labels";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export function ActivityFeed({ logs }: { logs: SendLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<History size={18} />}
          title="No sends yet"
          description="Once a lead list starts sending, activity will show up here."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {logs.map((log) => (
        <li key={log.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-medium text-fg">{log.contactName}</p>
              <span className="text-[12px] text-muted-faint">·</span>
              <p className="truncate text-[12px] text-muted">{log.company}</p>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-faint">
              {log.campaignId ? (
                <Link href={`/campaigns/${log.campaignId}`} className="truncate hover:text-accent hover:underline">
                  {log.campaignName}
                </Link>
              ) : (
                <span className="truncate">{log.campaignName ?? "No campaign"}</span>
              )}
              <span>·</span>
              <span>{SEQUENCE_STEP_LABELS[log.sequenceStep]}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[11.5px] text-muted-faint">{formatRelativeTime(log.createdAt)}</span>
            <StatusPill status={log.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
