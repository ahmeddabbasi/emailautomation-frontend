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
  const [openAiForced, setOpenAiForced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [geminiRes, openAiRes] = await Promise.all([fetch("/api/settings/gemini"), fetch("/api/settings/openai")]);
        if (cancelled) return;
        if (geminiRes.ok) setStatus((await geminiRes.json()) as GeminiStatus);
        if (openAiRes.ok) {
          const openAi = (await openAiRes.json()) as { forced?: boolean };
          setOpenAiForced(openAi.forced === true);
        }
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

  if (!status && !openAiForced) return null;
  const nearQuota = Boolean(status && status.quotaUsed >= status.quotaLimit - 1 && status.quotaUsed > 0 && !openAiForced);
  const onGroq = status?.activeProvider === "groq" && !openAiForced;
  if (!nearQuota && !onGroq && !openAiForced) return null;

  async function resume() {
    const res = await fetch("/api/settings/gemini/resume", { method: "POST" });
    if (!res.ok) return;
    setStatus(await res.json());
  }

  async function useGemini() {
    const res = await fetch("/api/settings/openai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: false }),
    });
    if (!res.ok) return;
    setOpenAiForced(false);
  }

  return (
    <div className="space-y-px">
      {openAiForced && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-info/40 bg-info/10 px-6 py-2.5 text-[13px] text-fg">
          <p>New drafts are using OpenAI. Gemini and Groq are skipped until you turn this off.</p>
          <Button variant="outline" size="sm" onClick={() => void useGemini()}>
            Use Gemini again
          </Button>
        </div>
      )}
      {nearQuota && status && (
        <div className="border-b border-warning/40 bg-warning/10 px-6 py-2.5 text-[13px] text-fg">
          Gemini is about to hit its free limit: {status.quotaUsed} of {status.quotaLimit} requests in the last minute. The next limit switches writing to Groq.
        </div>
      )}
      {onGroq && status && (
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
