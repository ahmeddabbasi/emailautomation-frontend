"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ZOHO_SMTP_HOSTS } from "@/lib/zoho-hosts";

interface Mailbox {
  id: string;
  displayName: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "ssl" | "starttls";
  username: string;
  imapHost: string | null;
  imapPort: number | null;
  replyTo: string | null;
  signatureHtml: string;
  dailyLimit: number;
  hourlyLimit: number;
  status: "active" | "paused" | "error";
  lastError: string | null;
  campaignId: string | null;
  campaignName: string | null;
}

interface CampaignOption {
  id: string;
  name: string;
}

const EMPTY = {
  displayName: "",
  email: "",
  smtpHost: "smtp.zoho.com",
  smtpPort: 465,
  smtpSecurity: "ssl" as "ssl" | "starttls",
  username: "",
  password: "",
  imapHost: "imap.zoho.com",
  imapPort: 993,
  replyTo: "",
  signatureHtml: "",
  dailyLimit: 30,
  hourlyLimit: 5,
};

export function MailboxesCard() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [mailboxRes, campaignRes] = await Promise.all([fetch("/api/mailboxes"), fetch("/api/campaigns")]);
    const mailboxData = await mailboxRes.json();
    const campaignData = await campaignRes.json();
    setMailboxes(mailboxData.mailboxes ?? []);
    setCampaigns((campaignData.campaigns ?? []).map((campaign: { id: string; name: string }) => ({ id: campaign.id, name: campaign.name })));
  }

  useEffect(() => {
    void reload();
  }, []);

  function payload(includePassword: boolean) {
    return {
      displayName: form.displayName,
      email: form.email,
      smtpHost: form.smtpHost,
      smtpPort: Number(form.smtpPort),
      smtpSecurity: form.smtpSecurity,
      username: form.username,
      ...(includePassword && form.password ? { password: form.password } : {}),
      imapHost: form.imapHost || null,
      imapPort: form.imapPort ? Number(form.imapPort) : null,
      replyTo: form.replyTo || null,
      signatureHtml: form.signatureHtml,
      dailyLimit: Number(form.dailyLimit),
      hourlyLimit: Number(form.hourlyLimit),
    };
  }

  async function save() {
    setError(null);
    setMessage(null);
    const res = await fetch(editing ? `/api/mailboxes/${editing}` : "/api/mailboxes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? payload(Boolean(form.password)) : { ...payload(true), password: form.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not save mailbox");
      return;
    }
    setForm(EMPTY);
    setEditing(null);
    setMessage("Saved as paused. Test the connection to mark it active.");
    await reload();
  }

  return (
    <Card className="mx-6 mb-6">
      <CardHeader>
        <CardTitle>Mailboxes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-[12.5px] text-muted">
          Linking a mailbox to a campaign sends that campaign through the mailbox. Campaigns with no mailbox still use Mailgun. Use a Zoho app password when 2FA is on. Daily limit cannot exceed 30. Passwords are encrypted and never shown again.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>From name</Label>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <Label>From email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Zoho host</Label>
            <Select value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value, imapHost: e.target.value.replace("smtp", "imap").replace("smtppro", "imap") })}>
              {ZOHO_SMTP_HOSTS.map((host) => (
                <option key={host.host} value={host.host}>{host.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Security</Label>
            <Select
              value={form.smtpSecurity}
              onChange={(e) => {
                const smtpSecurity = e.target.value as "ssl" | "starttls";
                setForm({ ...form, smtpSecurity, smtpPort: smtpSecurity === "ssl" ? 465 : 587 });
              }}
            >
              <option value="ssl">SSL (port 465)</option>
              <option value="starttls">STARTTLS (port 587)</option>
            </Select>
          </div>
          <div>
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <Label>{editing ? "New password (optional)" : "App password"}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label>Daily limit (max 30)</Label>
            <Input type="number" min={1} max={30} value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Hourly limit</Label>
            <Input type="number" min={1} max={form.dailyLimit} value={form.hourlyLimit} onChange={(e) => setForm({ ...form, hourlyLimit: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Signature HTML</Label>
            <Textarea value={form.signatureHtml} onChange={(e) => setForm({ ...form, signatureHtml: e.target.value })} />
          </div>
        </div>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        {message && <p className="text-[12.5px] text-success">{message}</p>}
        <Button variant="primary" size="sm" onClick={() => void save()}>
          {editing ? "Save mailbox" : "Add mailbox"}
        </Button>

        <ul className="divide-y divide-border rounded-md border border-border">
          {mailboxes.map((mailbox) => (
            <li key={mailbox.id} className="space-y-2 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-medium text-fg">{mailbox.displayName} · {mailbox.email}</p>
                  <p className="text-[12px] text-muted">
                    {mailbox.status} · {mailbox.dailyLimit}/day · {mailbox.hourlyLimit}/hour · {mailbox.campaignName ?? "Not linked"}
                  </p>
                  {mailbox.lastError && <p className="text-[12px] text-danger">{mailbox.lastError}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(mailbox.id); setForm({ ...EMPTY, ...mailbox, password: "", replyTo: mailbox.replyTo ?? "", imapHost: mailbox.imapHost ?? "", imapPort: mailbox.imapPort ?? 993 }); }}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await fetch(`/api/mailboxes/${mailbox.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paused" }) });
                      await reload();
                    }}
                  >
                    Pause
                  </Button>
                  <Button variant="danger" size="sm" onClick={async () => { await fetch(`/api/mailboxes/${mailbox.id}`, { method: "DELETE" }); await reload(); }}>
                    Delete
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-xs" placeholder="Test recipient" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setError(null);
                    const res = await fetch(`/api/mailboxes/${mailbox.id}/test`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(testTo ? { to: testTo } : {}),
                    });
                    const data = await res.json();
                    if (!res.ok) setError(data.error ?? "Test failed");
                    else setMessage("Connection succeeded. Mailbox is active.");
                    await reload();
                  }}
                >
                  Test connection
                </Button>
                <Select
                  value={mailbox.campaignId ?? ""}
                  onChange={async (e) => {
                    await fetch(`/api/mailboxes/${mailbox.id}/link`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ campaignId: e.target.value || null }),
                    });
                    await reload();
                  }}
                >
                  <option value="">No campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </Select>
              </div>
            </li>
          ))}
          {mailboxes.length === 0 && <li className="px-3 py-4 text-[12.5px] text-muted">No mailboxes yet.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
