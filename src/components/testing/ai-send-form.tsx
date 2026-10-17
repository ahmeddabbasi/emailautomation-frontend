"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Send, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendResult } from "@/components/testing/send-result";

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
  const [instructions, setInstructions] = useState("");
  const [rawStructure, setRawStructure] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ providerMessageId: string; to: string } | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/testing/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions, senderName, senderTitle, rawStructure: rawStructure || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/testing/raw-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, senderName, senderTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setResult({ providerMessageId: data.providerMessageId, to });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const hasDraft = subject.length > 0 || body.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-assisted test send</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>To</Label>
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Sender name</Label>
            <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Alex" />
          </div>
          <div>
            <Label>Sender title</Label>
            <Input value={senderTitle} onChange={(e) => setSenderTitle(e.target.value)} placeholder="e.g. Growth Lead" />
          </div>
        </div>
        <div>
          <Label>What should this email say or achieve?</Label>
          <Textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. A short, friendly note introducing our product to a marketing director, mentioning the free trial."
          />
        </div>
        <div>
          <Label>Raw structure to follow (optional)</Label>
          <Textarea rows={4} value={rawStructure} onChange={(e) => setRawStructure(e.target.value)} className="font-mono text-[12.5px]" />
        </div>

        <Button variant="outline" size="sm" disabled={!instructions || !senderName || generating} onClick={handleGenerate}>
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {hasDraft ? "Regenerate" : "Generate"}
        </Button>

        {hasDraft && (
          <div className="space-y-3 rounded-md border border-border bg-surface-raised p-4">
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={generating} onClick={handleGenerate}>
                <RefreshCw size={13} /> Regenerate
              </Button>
              <Button variant="primary" size="sm" disabled={!to || !senderName || sending} onClick={handleSend}>
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Send
              </Button>
            </div>
          </div>
        )}

        {result && <SendResult key={result.providerMessageId} to={result.to} providerMessageId={result.providerMessageId} />}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
