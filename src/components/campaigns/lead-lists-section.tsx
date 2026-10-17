import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import type { LeadList } from "@/lib/types";
import { UnlinkListButton } from "./unlink-list-button";

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${min > 0 ? ":" + String(min).padStart(2, "0") : ""}${period}`;
}

function formatWindow(start: number, end: number): string {
  if (start === 0 && end >= 1440) return "all day";
  return `${formatMinutes(start)} to ${formatMinutes(end)}`;
}

export function LeadListsSection({ campaignId, leadLists }: { campaignId: string; leadLists: LeadList[] }) {
  return (
    <Card className="m-6">
      <CardHeader>
        <CardTitle>Lead lists</CardTitle>
        <Link href={`/campaigns/${campaignId}/lead-lists/new`}>
          <Button variant="primary" size="sm">
            <Plus size={14} /> New lead list
          </Button>
        </Link>
      </CardHeader>

      {leadLists.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<ListChecks size={18} />}
            title="No lead lists yet"
            description="Each lead list has its own targeting, email structure, and send schedule. Create one to start uploading leads."
            action={
              <Link href={`/campaigns/${campaignId}/lead-lists/new`}>
                <Button variant="primary" size="sm">
                  <Plus size={14} /> New lead list
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {leadLists.map((list) => (
            <li key={list.id} className="flex items-center">
              <Link
                href={`/campaigns/${campaignId}/lead-lists/${list.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3.5 hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-medium text-fg">{list.name}</p>
                    <StatusPill status={list.status} />
                    {list.testMode && (
                      <span className="rounded bg-info/15 px-1.5 py-0.5 text-[10.5px] font-medium text-info">Test mode</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-faint">
                    {list.contactCount} {list.contactCount === 1 ? "contact" : "contacts"} ·{" "}
                    {list.industry || "No industry set"} · {list.timezone},{" "}
                    {formatWindow(list.windowStartMinutes, list.windowEndMinutes)}, up to {list.dailyCap}/day
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {list.generationStatus !== "completed" ? (
                    <p className="text-[11.5px] font-medium text-warning">
                      {list.generationCompleted}/{list.generationTotal} generated
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-muted-faint">Generation complete</p>
                  )}
                </div>
              </Link>
              <div className="pr-3">
                <UnlinkListButton listId={list.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
