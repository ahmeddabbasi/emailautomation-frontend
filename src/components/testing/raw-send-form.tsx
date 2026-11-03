"use client";

import { useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FieldError, Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendResult } from "@/components/testing/send-result";

export function RawSendForm() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const lock = useRef(false);
  const [result, setResult] = useState<{ ok: true; providerMessageId: string } | { ok: false; message: string } | null>(
    null
  );

  async function handleSend() {
    if (lock.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim()) || !subject.trim() || !body.trim()) {
      setFieldError("Add a real email address, a subject, and a body.");
      return;
    }
    setFieldError(null);
    lock.current = true;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/testing/raw-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data && typeof data.error === "string" ? data.error : "Send failed");
      setResult({ ok: true, providerMessageId: data.providerMessageId });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      lock.current = false;
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
          <Label htmlFor="raw-to">To</Label>
          <Input id="raw-to" type="email" autoComplete="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@company.com" aria-invalid={fieldError ? true : undefined} aria-describedby={fieldError ? "raw-error" : undefined} disabled={sending} />
        </div>
        <div>
          <Label htmlFor="raw-subject">Subject</Label>
          <Input id="raw-subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={sending} />
        </div>
        <div>
          <Label htmlFor="raw-body">Body</Label>
          <Textarea id="raw-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} disabled={sending} />
          <FieldError id="raw-error">{fieldError}</FieldError>
        </div>

        {result &&
          (result.ok ? (
            <SendResult key={result.providerMessageId} to={to} providerMessageId={result.providerMessageId} />
          ) : (
            <p role="alert" className="text-[12.5px] text-danger">{result.message}</p>
          ))}

        <Button
          variant="primary"
          size="sm"
          disabled={!to.trim() || !subject.trim() || !body.trim() || sending}
          aria-busy={sending}
          onClick={handleSend}
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Send test email
        </Button>
      </CardContent>
    </Card>
  );
}
