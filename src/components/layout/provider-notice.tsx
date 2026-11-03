"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface GeminiStatus {
  quotaUsed: number;
  quotaLimit: number;
  activeProvider: "gemini" | "groq";
  groqModel: string | null;
  cooldownUntil: string | null;
}

export function ProviderNotice() {
  const [status, setStatus] = useState<GeminiStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/settings/gemini");
        if (!res.ok) return;
        const data = (await res.json()) as GeminiStatus;
        if (!cancelled) setStatus(data);
      } catch {
        // The sidebar health check reports a dead API. This banner can stay quiet.
      }
    }
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!status) return null;
  const nearQuota = status.quotaUsed >= status.quotaLimit - 1 && status.quotaUsed > 0;
  const onGroq = status.activeProvider === "groq";
  if (!nearQuota && !onGroq) return null;

  async function resume() {
    const res = await fetch("/api/settings/gemini/resume", { method: "POST" });
    if (!res.ok) return;
    setStatus(await res.json());
  }

  return (
    <div className="space-y-px">
      {nearQuota && (
        <div className="border-b border-warning/40 bg-warning/10 px-6 py-2.5 text-[13px] text-fg">
          Gemini is about to hit its free limit: {status.quotaUsed} of {status.quotaLimit} requests in the last minute. The next limit switches writing to Groq.
        </div>
      )}
      {onGroq && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-info/40 bg-info/10 px-6 py-2.5 text-[13px] text-fg">
          <p>
            Writing has switched to Groq{status.groqModel ? ` (${status.groqModel})` : ""}
            {status.cooldownUntil ? ` until ${new Date(status.cooldownUntil).toLocaleTimeString()}` : ""}.
          </p>
          <Button variant="outline" size="sm" onClick={() => void resume()}>
            Use Gemini again
          </Button>
        </div>
      )}
    </div>
  );
}
