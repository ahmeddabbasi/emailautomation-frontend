"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, Send, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SendResult } from "@/components/testing/send-result";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AiSendForm({
  defaultSenderName = "",
  defaultSenderTitle = "",
}: {
  defaultSenderName?: string;
  defaultSenderTitle?: string;
}) {
  const [to, setTo] = useState("");
  const [senderName, setSenderName] = useState(defaultSenderName);
  const [senderTitle, setSenderTitle] = useState(defaultSenderTitle);
  const [tone, setTone] = useState<"professional" | "friendly" | "direct">("professional");
  const [instructions, setInstructions] = useState("");
  const [rawStructure, setRawStructure] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [openAi, setOpenAi] = useState(false);
  const [openAiForced, setOpenAiForced] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ to?: string; instructions?: string; senderName?: string }>({});
  const [result, setResult] = useState<{ providerMessageId: string; to: string } | null>(null);
  const lock = useRef<"generate" | "send" | null>(null);

  useEffect(() => {
    void fetch("/api/settings/openai")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.configured === "boolean") {
          setOpenAi(data.configured);
          setOpenAiForced(data.forced === true);
        }
      })
      .catch(() => setOpenAi(false));
  }, []);

  function validateGenerate() {
    const next: { instructions?: string; senderName?: string } = {};
    if (!instructions.trim()) next.instructions = "Add what this email should say.";
    else if (instructions.trim().length > 4000) next.instructions = "Keep the instructions under 4000 characters.";
    if (!senderName.trim()) next.senderName = "Add a sender name.";
    setFieldErrors((current) => ({ ...current, ...next, instructions: next.instructions, senderName: next.senderName }));
    return Object.keys(next).length === 0;
  }

  async function handleGenerate() {
    if (lock.current) return;
    setError(null);
    setResult(null);
    if (!validateGenerate()) return;
    lock.current = "generate";
    setGenerating(true);
    try {
      const shared = {
        instructions: instructions.trim(),
        senderName: senderName.trim(),
        senderTitle: senderTitle.trim(),
        rawStructure: rawStructure.trim() || undefined,
      };
      const res = await fetch("/api/testing/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shared,
          instructions: tone === "professional" ? shared.instructions : `${shared.instructions}\nTone: ${tone}.`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.subject !== "string" || typeof data.body !== "string") {
        throw new Error(data && typeof data.error === "string" ? data.error : "Could not generate a draft.");
      }
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a draft.");
    } finally {
      lock.current = null;
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (lock.current) return;
    setError(null);
    const next: { to?: string } = {};
    if (!EMAIL.test(to.trim())) next.to = "Enter a real email address.";
    if (!subject.trim() || !body.trim()) {
      setError("Generate a draft, then edit it before sending.");
    }
    setFieldErrors((current) => ({ ...current, to: next.to }));
    if (next.to || !subject.trim() || !body.trim()) return;
    lock.current = "send";
    setSending(true);
    try {
      const res = await fetch("/api/testing/raw-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          senderName: senderName.trim(),
          senderTitle: senderTitle.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data && typeof data.error === "string" ? data.error : "Send failed");
      setResult({ providerMessageId: data.providerMessageId, to: to.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      lock.current = null;
      setSending(false);
    }
  }

  const hasDraft = subject.length > 0 || body.length > 0;
  const busy = generating || sending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-assisted test send</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[12.5px] text-muted">
          {openAiForced
            ? "Generation is set to OpenAI, so these instructions are sent there. The draft stays editable, and nothing is sent until you press Send."
            : openAi
              ? "An OpenAI key is saved. Turn on Use OpenAI for generation in Settings when Gemini or Groq is limited. This button still uses Gemini or Groq."
              : "No OpenAI key yet. Generate uses Gemini, or Groq when Gemini is limited. Add a key in Settings to switch new drafts to OpenAI."}
        </p>
        <div>
          <Label htmlFor="ai-to">To</Label>
          <Input
            id="ai-to"
            type="email"
            autoComplete="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="you@company.com"
            aria-invalid={fieldErrors.to ? true : undefined}
            aria-describedby={fieldErrors.to ? "ai-to-error" : undefined}
            disabled={busy}
          />
          <FieldError id="ai-to-error">{fieldErrors.to}</FieldError>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ai-sender-name">Sender name</Label>
            <Input
              id="ai-sender-name"
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              placeholder="e.g. Alex"
              aria-invalid={fieldErrors.senderName ? true : undefined}
              aria-describedby={fieldErrors.senderName ? "ai-sender-error" : undefined}
              disabled={busy}
            />
            <FieldError id="ai-sender-error">{fieldErrors.senderName}</FieldError>
          </div>
          <div>
            <Label htmlFor="ai-sender-title">Sender title</Label>
            <Input id="ai-sender-title" value={senderTitle} onChange={(event) => setSenderTitle(event.target.value)} placeholder="e.g. Growth Lead" disabled={busy} />
          </div>
        </div>
        <div>
          <Label htmlFor="ai-tone">Tone</Label>
          <Select id="ai-tone" className="h-9 w-full" value={tone} onChange={(event) => setTone(event.target.value as typeof tone)} disabled={busy}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="direct">Direct</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ai-instructions">What should this email say or achieve?</Label>
          <Textarea
            id="ai-instructions"
            data-sim-target="draft-email"
            rows={4}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="A short note introducing the product to a dispatch lead."
            aria-invalid={fieldErrors.instructions ? true : undefined}
            aria-describedby={fieldErrors.instructions ? "ai-instructions-error" : undefined}
            disabled={busy}
          />
          <FieldError id="ai-instructions-error">{fieldErrors.instructions}</FieldError>
        </div>
        <div>
          <Label htmlFor="ai-structure">Raw structure to follow (optional)</Label>
          <Textarea id="ai-structure" rows={4} value={rawStructure} onChange={(event) => setRawStructure(event.target.value)} className="font-mono text-[12.5px]" disabled={busy} />
        </div>

        <Button variant="outline" size="sm" disabled={busy || !instructions.trim() || !senderName.trim()} aria-busy={generating} onClick={() => void handleGenerate()}>
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {hasDraft ? "Regenerate" : "Generate"}
        </Button>

        {hasDraft && (
          <div className="space-y-3 rounded-md border border-border bg-surface-raised p-4">
            <div>
              <Label htmlFor="ai-subject">Subject</Label>
              <Input id="ai-subject" value={subject} onChange={(event) => setSubject(event.target.value)} disabled={busy} />
            </div>
            <div>
              <Label htmlFor="ai-body">Body</Label>
              <Textarea id="ai-body" rows={8} value={body} onChange={(event) => setBody(event.target.value)} disabled={busy} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleGenerate()}>
                <RefreshCw size={13} /> Regenerate
              </Button>
              <Button variant="primary" size="sm" disabled={busy || !to.trim() || !senderName.trim()} aria-busy={sending} onClick={() => void handleSend()}>
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Send
              </Button>
            </div>
          </div>
        )}

        {result && <SendResult key={result.providerMessageId} to={result.to} providerMessageId={result.providerMessageId} />}
        {error && (
          <p role="alert" className="text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
