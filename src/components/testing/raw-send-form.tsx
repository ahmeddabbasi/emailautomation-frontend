"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendResult } from "@/components/testing/send-result";

export function RawSendForm() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: true; providerMessageId: string } | { ok: false; message: string } | null>(
    null
  );

  async function handleSend() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/testing/raw-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setResult({ ok: true, providerMessageId: data.providerMessageId });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw manual send</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[12px] text-muted">Sends exactly what you type through Mailgun, with no AI involved. Useful for checking deliverability and how the email renders in an inbox.</p>
        <div>
          <Label>To</Label>
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        {result &&
          (result.ok ? (
            <SendResult key={result.providerMessageId} to={to} providerMessageId={result.providerMessageId} />
          ) : (
            <p className="text-[12.5px] text-danger">{result.message}</p>
          ))}

        <Button
          variant="primary"
          size="sm"
          disabled={!to || !subject || !body || sending}
          onClick={handleSend}
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Send test email
        </Button>
      </CardContent>
    </Card>
  );
}
