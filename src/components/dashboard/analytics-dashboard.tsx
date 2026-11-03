"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Send,
  Users,
  CheckCircle2,
  Ban,
  MessageSquareReply,
  AlertTriangle,
  Gauge,
  Loader2,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "./stat-card";
import { SendsChart } from "./sends-chart";
import { FunnelChart } from "./funnel-chart";
import { ActivityFeed } from "./activity-feed";
import { cn } from "@/lib/utils";
import { RunDispatchButton } from "@/components/layout/run-dispatch-button";
import { GuideNavigator } from "@/components/guide/navigator";
import type { Campaign, SendLog } from "@/lib/types";

interface Overview {
  sentToday: number;
  sentThisWeek: number;
  sentThisMonth: number;
  initialSent: number;
  followupSent: number;
  activeContacts: number;
  completedContacts: number;
  stoppedOrInvalid: number;
  complained: number;
  generationFailures: number;
  sendFailures: number;
  repliedContacts: number;
  replyRate: number | null;
  sentTodayVsCapacity: { sent: number; capacity: number };
  avgTimeToReplyHours: number | null;
}

interface Bucket {
  date: string;
  initial: number;
  followup: number;
  replies: number;
}

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  sent: number;
  replied: number;
  replyRate: number | null;
  sendFailures: number;
}

interface DashboardData {
  overview: Overview;
  timeseries: Bucket[];
  funnel: { step: number; label: string; count: number }[];
  comparison: CampaignRow[];
  activity: SendLog[];
}

function pct(v: number | null): string {
  return v === null ? "n/a" : `${Math.round(v * 100)}%`;
}

function formatHours(h: number | null): string {
  if (h === null) return "n/a";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request to ${url} failed (${res.status})`);
  return data as T;
}

export function AnalyticsDashboard({ campaigns }: { campaigns: Campaign[] }) {
  const [campaignId, setCampaignId] = useState("all");
  const [excludeTestMode, setExcludeTestMode] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (campaignId !== "all") params.set("campaignId", campaignId);
    if (excludeTestMode) params.set("excludeTestMode", "1");
    const qs = params.toString() ? `?${params}` : "";
    const activityQs = campaignId !== "all" ? `&campaignId=${campaignId}` : "";

    Promise.all([
      getJson<Overview>(`/api/analytics/overview${qs}`),
      getJson<{ buckets: Bucket[] }>(`/api/analytics/timeseries${qs}`),
      getJson<{ funnel: DashboardData["funnel"] }>(`/api/analytics/funnel${qs}`),
      getJson<{ campaigns: CampaignRow[] }>(`/api/analytics/campaigns${excludeTestMode ? "?excludeTestMode=1" : ""}`),
      getJson<{ activity: SendLog[] }>(`/api/dashboard/activity?limit=12${activityQs}`),
    ])
      .then(([overview, ts, funnel, cmp, activity]) => {
        if (cancelled) return;
        setData({
          overview,
          timeseries: ts.buckets,
          funnel: funnel.funnel,
          comparison: cmp.campaigns,
          activity: activity.activity,
        });
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, excludeTestMode, reloadKey]);

  function changeScope(update: () => void) {
    setLoading(true);
    update();
  }

  const overview = data?.overview;
  const hasSends = (data?.timeseries ?? []).some((b) => b.initial + b.followup + b.replies > 0);
  const hasFunnel = (data?.funnel ?? []).some((f) => f.count > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-fg">Overview</h1>
          <p className="mt-1 text-[13px] text-muted">
            Live metrics from your database. Volumes cover the last 90 days; dates use Pakistan time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {loading && data && <Loader2 size={14} className="animate-spin text-muted-faint" />}
          <RunDispatchButton />
          <Switch
            checked={excludeTestMode}
            onCheckedChange={(v) => changeScope(() => setExcludeTestMode(v))}
            label="Exclude test mode"
          />
          <Select value={campaignId} onChange={(e) => changeScope(() => setCampaignId(e.target.value))}>
            <option value="all">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="px-6 pt-5">
        <GuideNavigator />
      </div>

      {error && !data ? (
        <div className="px-6 py-5">
          <EmptyState
            icon={<AlertTriangle size={18} />}
            title="Couldn't load analytics"
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={() => changeScope(reload)}>
                <RotateCcw size={13} /> Try again
              </Button>
            }
          />
        </div>
      ) : !data || !overview ? (
        <div className="flex h-64 items-center justify-center text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className={cn("space-y-5 px-6 py-5 transition-opacity", loading && "opacity-60")}>
          {error && (
            <p className="flex items-center gap-1.5 text-[12.5px] text-danger">
              <AlertTriangle size={13} /> Showing previous results. Refresh failed: {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Sent today" value={overview.sentToday} icon={Send} tone="accent" />
            <StatCard label="Sent this week" value={overview.sentThisWeek} sub="Since Monday" icon={Send} />
            <StatCard label="Sent this month" value={overview.sentThisMonth} sub="Since the 1st" icon={Send} />
            <StatCard
              label="Today vs. daily capacity"
              value={`${overview.sentTodayVsCapacity.sent} / ${overview.sentTodayVsCapacity.capacity}`}
              sub="Across active lists"
              icon={Gauge}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label="Initial / follow-up"
              value={`${overview.initialSent} / ${overview.followupSent}`}
              sub="Last 90 days"
              icon={Send}
            />
            <StatCard label="Active in sequence" value={overview.activeContacts} icon={Users} tone="accent" />
            <StatCard label="Completed" value={overview.completedContacts} icon={CheckCircle2} />
            <StatCard
              label="Stopped / invalid"
              value={overview.stoppedOrInvalid}
              sub={overview.complained > 0 ? `Plus ${overview.complained} spam complaint${overview.complained === 1 ? "" : "s"}` : undefined}
              icon={Ban}
              tone="warning"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label="Reply rate"
              value={pct(overview.replyRate)}
              sub={`${overview.repliedContacts} replied`}
              icon={MessageSquareReply}
              tone="accent"
            />
            <StatCard label="Avg. time to reply" value={formatHours(overview.avgTimeToReplyHours)} icon={MessageSquareReply} />
            <StatCard
              label="Generation failures"
              value={overview.generationFailures}
              icon={AlertTriangle}
              tone={overview.generationFailures > 0 ? "warning" : "default"}
            />
            <StatCard
              label="Send failures"
              value={overview.sendFailures}
              sub="Rejected or bounced, last 90 days"
              icon={AlertTriangle}
              tone={overview.sendFailures > 0 ? "warning" : "default"}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Sends over the last 30 days</CardTitle>
              </CardHeader>
              <div className="p-4">
                {hasSends ? (
                  <SendsChart data={data.timeseries} />
                ) : (
                  <EmptyState icon={<BarChart3 size={18} />} title="No sends in the last 30 days" />
                )}
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sequence funnel</CardTitle>
              </CardHeader>
              <div className="p-4">
                {hasFunnel ? (
                  <FunnelChart data={data.funnel} />
                ) : (
                  <EmptyState icon={<BarChart3 size={18} />} title="No delivered emails yet" />
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <ActivityFeed logs={data.activity} />
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Campaign performance</CardTitle>
              </CardHeader>
              <ul className="divide-y divide-border">
                {data.comparison.map((c) => (
                  <li key={c.campaignId}>
                    <Link
                      href={`/campaigns/${c.campaignId}`}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover",
                        c.campaignId === campaignId && "bg-surface-hover"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-fg">{c.campaignName}</p>
                        <p className="mt-0.5 text-[11px] text-muted-faint">
                          {c.sent} sent{c.sendFailures > 0 ? `, ${c.sendFailures} failed` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-medium tabular-nums text-fg">{pct(c.replyRate)}</p>
                    </Link>
                  </li>
                ))}
                {data.comparison.length === 0 && (
                  <li className="px-4 py-6 text-center text-[12.5px] text-muted-faint">No campaigns yet</li>
                )}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
