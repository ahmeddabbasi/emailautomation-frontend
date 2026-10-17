"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LeadList } from "@/lib/types";

interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  done: boolean;
  remaining: number;
}

export function GenerationProgress({ list }: { list: LeadList }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(list.generationCompleted);
  const [failedCount, setFailedCount] = useState(list.generationFailedCount);
  const [error, setError] = useState<string | null>(null);

  if (list.contactCount === 0) return null;

  const total = list.generationTotal;
  const remaining = Math.max(0, total - completed - failedCount);
  const allDone = remaining === 0;

  async function runBatches() {
    setRunning(true);
    setError(null);
    try {
      let done = false;
      while (!done) {
        const res = await fetch(`/api/lead-lists/${list.id}/generate`, { method: "POST" });
        const data: BatchResult = await res.json();
        if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? "Generation failed");
        setCompleted((c) => c + data.succeeded);
        setFailedCount((f) => f + data.failed);
        done = data.done;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setRunning(false);
    }
  }

  async function retryFailed() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/lead-lists/${list.id}/retry-failed`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Retry failed");
      setFailedCount((f) => Math.max(0, f - data.reset));
      await runBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
      setRunning(false);
    }
  }

  const pct = total > 0 ? Math.round(((completed + failedCount) / total) * 100) : 0;

  return (
    <Card className="mx-6 mt-5">
      <CardHeader>
        <CardTitle>Initial email generation</CardTitle>
        {allDone && failedCount === 0 ? (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-success">
            <CheckCircle2 size={13} /> Complete
          </span>
        ) : !running ? (
          <div className="flex items-center gap-2">
            {allDone && failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={retryFailed}>
                <RotateCcw size={13} /> Retry {failedCount} failed
              </Button>
            )}
            {!allDone && (
              <Button variant="primary" size="sm" onClick={runBatches}>
                <Sparkles size={13} /> {completed + failedCount > 0 ? "Resume" : "Start"} generation
              </Button>
            )}
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Loader2 size={13} className="animate-spin" /> Generating…
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {completed} generated, {failedCount} failed, {remaining} remaining, {total} total
        </p>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
