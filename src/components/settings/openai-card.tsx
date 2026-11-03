"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface OpenAiStatus {
  configured: boolean;
  keyHint: string;
  source: "saved" | "environment" | "missing";
  model: string;
  forced: boolean;
}

function keyProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Paste an OpenAI key that starts with sk-";
  if (!/^sk-[A-Za-z0-9_-]{16,}$/.test(trimmed) || trimmed.length > 300) return "Paste an OpenAI key that starts with sk-";
  return null;
}

export function OpenAiCard() {
  const [status, setStatus] = useState<OpenAiStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "remove" | "force" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  async function load() {
    const res = await fetch("/api/settings/openai");
    const data = await res.json().catch(() => null);
    if (res.ok && data) setStatus(data as OpenAiStatus);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setForce(next: boolean) {
    if (lock.current) return;
    setError(null);
    setMessage(null);
    if (next && !status?.configured) {
      setError("Save an OpenAI key before using it for generation.");
      return;
    }
    lock.current = true;
    setBusy("force");
    try {
      const res = await fetch("/api/settings/openai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not change the writer");
      if (typeof data.configured === "boolean") setStatus(data as OpenAiStatus);
      else void load();
      setMessage(next ? "New drafts will use OpenAI." : "New drafts will use Gemini, or Groq when Gemini is limited.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the writer");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  async function run(action: "save" | "test" | "remove") {
    if (lock.current) return;
    setError(null);
    setMessage(null);
    if (action === "save" || (action === "test" && apiKey.trim())) {
      const problem = keyProblem(apiKey);
      if (problem) {
        setError(problem);
        return;
      }
    }
    if (action === "test" && !apiKey.trim() && !status?.configured) {
      setError("No OpenAI key is saved yet");
      return;
    }
    lock.current = true;
    setBusy(action);
    try {
      const res =
        action === "remove"
          ? await fetch("/api/settings/openai", { method: "DELETE" })
          : action === "save"
            ? await fetch("/api/settings/openai", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
              })
            : await fetch("/api/settings/openai/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
              });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
      if (action === "save") setApiKey("");
      if (typeof data.configured === "boolean") setStatus(data as OpenAiStatus);
      else void load();
      setMessage(
        action === "test" ? "OpenAI accepted this key." : action === "save" ? "Key saved. The full key is not shown again." : "Saved OpenAI key removed."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  const configured = status?.configured === true;

  return (
    <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>OpenAI</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <p className="text-[12.5px] text-muted">
            {configured
              ? `Configured (${status?.source === "saved" ? "saved here" : "server environment"}, ${status?.keyHint}). Model ${status?.model}.`
              : "Not configured. Drafts keep using Gemini, or Groq when Gemini is limited."}
          </p>
          <div>
            <Label htmlFor="openai-key">OpenAI API key</Label>
            <Input
              id="openai-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={configured ? "Paste a new key to replace it" : "sk-"}
              aria-invalid={error ? true : undefined}
              aria-describedby="openai-key-hint openai-key-error"
              disabled={busy !== null}
            />
            <FieldHint id="openai-key-hint">The full key is not shown again after you save it. A key must be saved before generation can use OpenAI.</FieldHint>
            <FieldError id="openai-key-error">{error}</FieldError>
          </div>
          <Switch
            checked={status?.forced === true}
            disabled={!configured || busy !== null}
            onCheckedChange={(checked) => void setForce(checked)}
            label={status?.forced ? "Using OpenAI for generation" : "Use OpenAI for generation"}
          />
          <FieldHint>
            {configured
              ? "When this is on, new campaign drafts and test drafts go to OpenAI. Gemini and Groq are skipped until you turn it off."
              : "Save a key before this can be turned on."}
          </FieldHint>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={busy !== null || apiKey.trim().length < 20} aria-busy={busy === "save"} onClick={() => void run("save")}>
              {busy === "save" ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" size="sm" disabled={busy !== null || (!apiKey.trim() && !configured)} aria-busy={busy === "test"} onClick={() => void run("test")}>
              {busy === "test" ? "Testing…" : "Test connection"}
            </Button>
            <Button variant="outline" size="sm" disabled={busy !== null || status?.source !== "saved"} aria-busy={busy === "remove"} onClick={() => void run("remove")}>
              {busy === "remove" ? "Removing…" : "Remove key"}
            </Button>
          </div>
          {message && <p className="text-[12.5px] text-success">{message}</p>}
        </CardContent>
    </Card>
  );
}
