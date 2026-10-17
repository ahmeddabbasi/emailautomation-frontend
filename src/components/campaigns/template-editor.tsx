"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function TemplateEditor({ campaignId }: { campaignId: string }) {
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState("Hi {{first_name|there}}");
  const [htmlBody, setHtmlBody] = useState("<p>Hi {{first_name|there}},</p><p>We help {{company|companies}} with outreach.</p>");
  const [textBody, setTextBody] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch(`/api/campaigns/${campaignId}/templates`)
      .then((res) => res.json())
      .then((data) => {
        const match = (data.templates ?? []).find((template: { sequence_step: number }) => template.sequence_step === step);
        if (!match) return;
        setSubject(match.subject);
        setHtmlBody(match.html_body);
        setTextBody(match.text_body ?? "");
      });
  }, [campaignId, step]);

  async function save(send: boolean) {
    setError(null);
    setSaved(false);
    const payload = {
      sequenceStep: step,
      subject,
      htmlBody,
      textBody,
      sample: { first_name: "Ada", last_name: "Lovelace", company: "Analytical Engines", email: "ada@example.com" },
      ...(send && testTo ? { to: testTo } : {}),
    };
    if (!send) {
      const res = await fetch(`/api/campaigns/${campaignId}/templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not save template");
      else setSaved(true);
      return;
    }
    const res = await fetch(`/api/campaigns/${campaignId}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Preview failed");
    else setPreview(data);
  }

  return (
    <Card className="mx-6 mt-6">
      <CardHeader>
        <CardTitle>HTML template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[12.5px] text-muted">
          Variables: {"{{first_name|there}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{email}}"}, plus custom CSV columns as {"{{column_name}}"}. Scripts are stripped. Leave this blank to keep AI copy for that step.
        </p>
        <Label>Sequence step</Label>
        <Input type="number" min={0} max={3} value={step} onChange={(e) => setStep(Number(e.target.value))} />
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Label>HTML body</Label>
        <Textarea className="min-h-36 font-mono" value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} />
        <Label>Plain text fallback</Label>
        <Textarea value={textBody} onChange={(e) => setTextBody(e.target.value)} placeholder="Generated from the HTML if left empty" />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        {saved && <p className="text-[12.5px] text-success">Template saved for step {step}.</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => void save(false)}>Save template</Button>
          <Button variant="outline" size="sm" onClick={() => void save(true)}>Preview</Button>
          <Input className="max-w-xs" placeholder="Send test to" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <Button variant="outline" size="sm" disabled={!testTo} onClick={() => void save(true)}>Send test</Button>
        </div>
        {preview && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-[13px] font-medium text-fg">{preview.subject}</p>
            <div className="text-[13px] text-fg" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
