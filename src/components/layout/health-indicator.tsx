"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export interface HealthData {
  lastRun: { started_at: string; finished_at: string | null; error_message: string | null } | null;
  pendingGenerationFailures: number;
  sendFailuresLast24h: number;
  unresolvedErrorGroups: number;
}

const REFRESH_EVENT = "email-automation:health-refresh";

function relativeMinutes(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

function formatAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Polled by the sidebar for both this indicator and the Error Logs badge.
// A failed poll keeps the last good value; the failure itself is reported
// by the global fetch wrapper.
export function useHealth(): HealthData | null {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/analytics/health");
        if (!res.ok) return;
        const data = (await res.json()) as HealthData;
        if (!cancelled) setHealth(data);
      } catch {
        // Network failure: keep showing the last known state.
      }
    }
    load();
    const interval = setInterval(load, 60000);
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, []);

  return health;
}

export function refreshHealth() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function HealthIndicator({ health }: { health: HealthData | null }) {
  if (!health) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-faint" />
        <span className="text-[11px] text-muted-faint">Checking status…</span>
      </div>
    );
  }

  const lastRun = health.lastRun;
  const minutesSince = lastRun ? relativeMinutes(lastRun.started_at) : null;

  let dotColor = "bg-success";
  let label = "All systems normal";

  if (!lastRun) {
    dotColor = "bg-muted-faint";
    label = "No dispatch runs yet";
  } else if (lastRun.error_message) {
    dotColor = "bg-danger";
    label = "Last dispatch run failed";
  } else if (minutesSince !== null && minutesSince > 90) {
    dotColor = "bg-danger";
    label = `Last dispatch ${formatAgo(minutesSince)}`;
  } else if (minutesSince !== null && minutesSince > 45) {
    dotColor = "bg-warning";
    label = `Last dispatch ${formatAgo(minutesSince)}`;
  } else if (minutesSince !== null) {
    label = `Last dispatch ${formatAgo(minutesSince)}`;
  }

  const problems = [
    health.pendingGenerationFailures > 0 && plural(health.pendingGenerationFailures, "generation failure"),
    health.sendFailuresLast24h > 0 && `${plural(health.sendFailuresLast24h, "send failure")} (24h)`,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className={`absolute inline-flex h-full w-full animate-pulse-subtle rounded-full ${dotColor}`} />
        </span>
        <span className="text-[11px] text-muted-faint">{label}</span>
      </div>
      {problems.length > 0 && (
        <Link
          href={health.pendingGenerationFailures > 0 ? "/leads?status=generation_failed" : "/history"}
          className="mt-1 flex items-center gap-1 text-[11px] text-warning hover:underline"
        >
          <AlertTriangle size={11} className="shrink-0" />
          {problems.join(", ")}
        </Link>
      )}
    </div>
  );
}
