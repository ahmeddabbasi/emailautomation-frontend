"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/input";

interface GeminiStatus {
  configured: boolean;
  keyHint: string;
  source: "saved" | "environment" | "missing";
  model: string;
  quotaUsed: number;
  quotaLimit: number;
  activeProvider: "gemini" | "groq";
  groqConfigured: boolean;
  groqModel: string | null;
  cooldownUntil: string | null;
}

export function GeminiCard() {
  const [status, setStatus] = useState<GeminiStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "resume" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/gemini");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setStatus(data as GeminiStatus);
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(action: "save" | "test" | "resume") {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const res =
        action === "resume"
          ? await fetch("/api/settings/gemini/resume", { method: "POST" })
          : action === "save"
            ? await fetch("/api/settings/gemini", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey }),
              })
            : await fetch("/api/settings/gemini/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiKey.trim() ? { apiKey } : {}),
              });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (action === "save") setApiKey("");
      if (data.configured !== undefined) setStatus(data as GeminiStatus);
      else void load();
      setMessage(action === "test" ? "Gemini accepted this key." : action === "save" ? "Key saved. Gemini is the writer again." : "Gemini is the writer again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  const usingGroq = status?.activeProvider === "groq";

  return (
    <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Gemini</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <p className="text-[12.5px] text-muted">
            {status?.configured
              ? `A key is active (${status.source === "saved" ? "saved here" : "server environment"}, ending ${status.keyHint}). Model ${status.model}.`
              : "No Gemini key is set."}{" "}
            {status ? `${status.quotaUsed} of ${status.quotaLimit} requests used in the last minute.` : ""}
            {usingGroq && status?.groqModel ? ` Writing is on Groq (${status.groqModel}) until Gemini is available.` : ""}
          </p>
          <div>
            <Label htmlFor="gemini-key">New Gemini API key</Label>
            <Input
              id="gemini-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste a key from Google AI Studio"
            />
            <FieldHint>Replaces the key used for new emails. The full key is not shown again.</FieldHint>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={busy !== null || apiKey.trim().length < 20} onClick={() => void run("save")}>
              {busy === "save" ? "Saving…" : "Save key"}
            </Button>
            <Button variant="outline" size="sm" disabled={busy !== null || (!apiKey.trim() && !status?.configured)} onClick={() => void run("test")}>
              {busy === "test" ? "Testing…" : "Test key"}
            </Button>
            <Button variant="outline" size="sm" disabled={busy !== null || !usingGroq} onClick={() => void run("resume")}>
              {busy === "resume" ? "Switching…" : "Use Gemini again"}
            </Button>
          </div>
          {message && <p className="text-[12.5px] text-success">{message}</p>}
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
        </CardContent>
    </Card>
  );
}
