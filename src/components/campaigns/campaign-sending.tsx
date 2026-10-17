"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";

interface SendingState {
  badge: "draft" | "scheduled" | "running" | "paused" | "completed";
  listCount: number;
  hasStepZeroTemplate: boolean;
  activeMailboxes: number;
  linkedMailboxes: number;
  stats: { sent: number; pending: number; failed: number; bounced: number; replied: number };
  mailboxUsage: { id: string; name: string; status: string; dailyLimit: number; sentToday: number }[];
}

export function CampaignSending({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [state, setState] = useState<SendingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [startMinutes, setStartMinutes] = useState(540);
  const [endMinutes, setEndMinutes] = useState(1020);

  async function reload() {
    const res = await fetch(`/api/campaigns/${campaignId}/sending`);
    if (res.ok) setState(await res.json());
  }

  useEffect(() => {
    void reload();
  }, [campaignId]);

  async function act(path: string, body?: unknown) {
    setError(null);
    setWarning(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    if (data.warnings?.[0]) setWarning(data.warnings[0]);
    await reload();
    router.refresh();
  }

  return (
    <Card className="mx-6 mt-6">
      <CardHeader>
        <CardTitle>Sending</CardTitle>
        {state && <StatusPill status={state.badge} />}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[12.5px] text-muted">
          If this campaign has a linked mailbox, every send goes through that mailbox. Mailgun is used only when no mailbox is linked. A linked mailbox that is paused, in error, or at its cap holds the queue instead of switching provider.
        </p>
        {state && (
          <div className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-5">
            <Stat label="Sent" value={state.stats.sent} />
            <Stat label="Pending" value={state.stats.pending} />
            <Stat label="Failed" value={state.stats.failed} />
            <Stat label="Bounced" value={state.stats.bounced} />
            <Stat label="Replied" value={state.stats.replied} />
          </div>
        )}
        {state && state.mailboxUsage.length > 0 && (
          <ul className="text-[12.5px] text-muted">
            {state.mailboxUsage.map((mailbox) => (
              <li key={mailbox.id}>{mailbox.name}: {mailbox.sentToday}/{mailbox.dailyLimit} today ({mailbox.status})</li>
            ))}
          </ul>
        )}
        {state && !state.hasStepZeroTemplate && <p className="text-[12px] text-muted">No HTML template for the first email. The AI draft will be used.</p>}
        {state && state.linkedMailboxes === 0 && <p className="text-[12px] text-muted">No mailbox linked. Sends go through Mailgun.</p>}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        {warning && <p className="text-[12.5px] text-warning">{warning}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => void act(`/api/campaigns/${campaignId}/run`, {})}>Run campaign</Button>
          <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>Schedule</Button>
          <Button variant="outline" size="sm" onClick={() => void act(`/api/campaigns/${campaignId}/schedule`, { action: "pause" })}>Pause</Button>
          <Button variant="outline" size="sm" onClick={() => void act(`/api/campaigns/${campaignId}/schedule`, { action: "resume" })}>Resume</Button>
          <Button variant="danger" size="sm" onClick={() => void act(`/api/campaigns/${campaignId}/schedule`, { action: "stop" })}>Stop</Button>
        </div>
        {open && (
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
            <div>
              <Label>Window start (minutes)</Label>
              <Input type="number" value={startMinutes} onChange={(e) => setStartMinutes(Number(e.target.value))} />
            </div>
            <div>
              <Label>Window end (minutes)</Label>
              <Input type="number" value={endMinutes} onChange={(e) => setEndMinutes(Number(e.target.value))} />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                void act(`/api/campaigns/${campaignId}/schedule`, {
                  action: "schedule",
                  startAt: new Date(startAt).toISOString(),
                  timezone,
                  windowStartMinutes: startMinutes,
                  windowEndMinutes: endMinutes,
                  activeDays: [1, 2, 3, 4, 5],
                })
              }
            >
              Save schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-faint">{label}</p>
      <p className="text-[15px] font-semibold text-fg">{value}</p>
    </div>
  );
}
