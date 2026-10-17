"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshHealth } from "@/components/layout/health-indicator";

interface TickSummary {
  processed: number;
  sent: number;
  failed: number;
  generationFailed: number;
}

function describe(s: TickSummary): string {
  if (s.processed === 0) return "Nothing was due to send.";
  const parts = [`${s.sent} sent`];
  if (s.failed) parts.push(`${s.failed} failed`);
  if (s.generationFailed) parts.push(`${s.generationFailed} could not be generated`);
  return parts.join(", ");
}

// Triggers the same tick the cron runs, immediately: for demos and test mode,
// where waiting up to 15 minutes for the schedule isn't practical.
export function RunDispatchButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/dispatch/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Dispatch failed");
      setResult({ ok: true, text: describe(data as TickSummary) });
      refreshHealth();
      router.refresh();
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Dispatch failed" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      {result && (
        <span className={`flex items-center gap-1.5 text-[12px] ${result.ok ? "text-muted" : "text-danger"}`}>
          {result.ok ? <Check size={12} className="text-success" /> : <AlertTriangle size={12} />}
          {result.text}
        </span>
      )}
      <Button variant="outline" size="sm" onClick={run} disabled={running}>
        {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
        {running ? "Running dispatch…" : "Run dispatch now"}
      </Button>
    </div>
  );
}
