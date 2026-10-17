"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2, AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ACTIVE_DAY_LABELS } from "@/lib/labels";
import { RunDispatchButton } from "@/components/layout/run-dispatch-button";

const TEST_MODE_FOLLOWUP_MINUTES = [5, 10, 15];
import { cn } from "@/lib/utils";
import type { ContactSource, LeadList } from "@/lib/types";

interface FormState {
  name: string;
  source: ContactSource;
  status: "active" | "paused";
  industry: string;
  targetAudience: string;
  senderName: string;
  senderTitle: string;
  rawSubjectStructure: string;
  rawEmailStructure: string;
  ctaLink: string;
  earlyBirdLine: string;
  otherRequiredElements: string[];
  bannedPhrases: string[];
  universalImageUrl: string | null;
  followupDay3Guidance: string;
  followupDay7Guidance: string;
  followupDay14Guidance: string;
  followupOffsetsDays: number[];
  timezone: string;
  dailyCap: number;
  windowStartMinutes: number;
  windowEndMinutes: number;
  dripBatchSize: number;
  dripIntervalMinutes: number;
  activeDays: number[];
  testMode: boolean;
}

function emptyForm(defaultSenderName: string, defaultSenderTitle: string, defaultCtaLink: string, defaultEarlyBirdLine: string): FormState {
  return {
  name: "",
  source: "manual",
  status: "active",
  industry: "",
  targetAudience: "",
  senderName: defaultSenderName,
  senderTitle: defaultSenderTitle,
  rawSubjectStructure: "",
  rawEmailStructure: "",
  ctaLink: defaultCtaLink,
  earlyBirdLine: defaultEarlyBirdLine,
  otherRequiredElements: [],
  bannedPhrases: [],
  universalImageUrl: null,
  followupDay3Guidance: "",
  followupDay7Guidance: "",
  followupDay14Guidance: "",
  followupOffsetsDays: [3, 7, 14],
  timezone: "UTC",
  dailyCap: 20,
  windowStartMinutes: 540,
  windowEndMinutes: 1080,
  dripBatchSize: 5,
  dripIntervalMinutes: 180,
  activeDays: [1, 2, 3, 4, 5],
  testMode: false,
  };
}

function toFormState(
  list: LeadList | null,
  defaults: { senderName: string; senderTitle: string; ctaLink: string; earlyBirdLine: string }
): FormState {
  if (!list) return emptyForm(defaults.senderName, defaults.senderTitle, defaults.ctaLink, defaults.earlyBirdLine);
  return {
    name: list.name,
    source: list.source,
    status: list.status,
    industry: list.industry,
    targetAudience: list.targetAudience,
    senderName: list.senderName,
    senderTitle: list.senderTitle,
    rawSubjectStructure: list.rawSubjectStructure,
    rawEmailStructure: list.rawEmailStructure,
    ctaLink: list.ctaLink,
    earlyBirdLine: list.earlyBirdLine,
    otherRequiredElements: list.otherRequiredElements,
    bannedPhrases: list.bannedPhrases,
    universalImageUrl: list.universalImageUrl,
    followupDay3Guidance: list.followupDay3Guidance,
    followupDay7Guidance: list.followupDay7Guidance,
    followupDay14Guidance: list.followupDay14Guidance,
    followupOffsetsDays: list.followupOffsetsDays,
    timezone: list.timezone,
    dailyCap: list.dailyCap,
    windowStartMinutes: list.windowStartMinutes,
    windowEndMinutes: list.windowEndMinutes,
    dripBatchSize: list.dripBatchSize,
    dripIntervalMinutes: list.dripIntervalMinutes,
    activeDays: list.activeDays,
    testMode: list.testMode,
  };
}

function minutesToTimeValue(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function timeValueToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function LeadListForm({
  campaignId,
  list,
  mode,
  defaultSenderName = "",
  defaultSenderTitle = "",
  defaultCtaLink = "",
  defaultEarlyBirdLine = "",
}: {
  campaignId: string;
  list: LeadList | null;
  mode: "create" | "edit";
  defaultSenderName?: string;
  defaultSenderTitle?: string;
  defaultCtaLink?: string;
  defaultEarlyBirdLine?: string;
}) {
  const router = useRouter();
  const initial = useMemo(
    () => toFormState(list, { senderName: defaultSenderName, senderTitle: defaultSenderTitle, ctaLink: defaultCtaLink, earlyBirdLine: defaultEarlyBirdLine }),
    [list, defaultSenderName, defaultSenderTitle, defaultCtaLink, defaultEarlyBirdLine]
  );
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateOffset(index: number, value: number) {
    const next = [...form.followupOffsetsDays];
    next[index] = value;
    update("followupOffsetsDays", next);
  }

  function toggleDay(day: number) {
    update(
      "activeDays",
      form.activeDays.includes(day) ? form.activeDays.filter((d) => d !== day) : [...form.activeDays, day].sort()
    );
  }

  async function uploadImage(file: File): Promise<string> {
    if (!list) throw new Error("Save the lead list before attaching an image");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/lead-lists/${list.id}/image`, { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (form.windowEndMinutes <= form.windowStartMinutes) {
        throw new Error("Send window end must be after start");
      }

      if (mode === "create") {
        const res = await fetch(`/api/campaigns/${campaignId}/lead-lists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create lead list");
        router.push(`/campaigns/${campaignId}/lead-lists/${data.leadList.id}`);
        return;
      }

      const res = await fetch(`/api/lead-lists/${list!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save lead list");
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead list");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl flex-1 space-y-3">
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="List name, e.g. SaaS founders, March batch"
          />
          <div className="flex items-center gap-5">
            <Switch
              checked={form.status === "active"}
              onCheckedChange={(checked) => update("status", checked ? "active" : "paused")}
              label={form.status === "active" ? "Active" : "Paused"}
            />
            <Switch
              checked={form.testMode}
              onCheckedChange={(checked) => update("testMode", checked)}
              label="Test mode"
            />
            <div className="flex items-center gap-2">
              <Label className="mb-0">Source</Label>
              <Select value={form.source} onChange={(e) => update("source", e.target.value as ContactSource)}>
                <option value="apollo">Apollo</option>
                <option value="manual">Manual</option>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {mode === "edit" && <RunDispatchButton />}
          {error && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-danger">
              <AlertTriangle size={13} /> {error}
            </span>
          )}
          {!error && savedAt && !dirty && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-success">
              <Check size={13} /> Saved
            </span>
          )}
          {!error && dirty && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-warning">
              <Circle size={7} className="fill-current" /> Unsaved changes
            </span>
          )}
          <Button variant="primary" size="sm" disabled={!dirty || saving || !form.name.trim()} onClick={handleSave}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {mode === "create" ? "Create list" : "Save"}
          </Button>
        </div>
      </div>

      {form.testMode && (
        <div className="flex max-w-3xl items-start gap-2.5 rounded-md border border-info/30 bg-info/10 px-4 py-3 text-[12.5px] text-fg">
          <FlaskConical size={15} className="mt-0.5 shrink-0 text-info" />
          <p>
            <span className="font-semibold">Test mode{dirty && list?.testMode !== form.testMode ? " (save to apply)" : " is on"}.</span> Follow-ups go
            out {TEST_MODE_FOLLOWUP_MINUTES[0]}, {TEST_MODE_FOLLOWUP_MINUTES[1]} and {TEST_MODE_FOLLOWUP_MINUTES[2]} minutes after the previous email, and the send window, active
            days and daily cap are ignored. Emails are real sends and count in analytics, flagged as test mode so they can be filtered out. Use
            Run dispatch now instead of waiting for the schedule. Turning test mode off restores the normal schedule below.
          </p>
        </div>
      )}

      <section className="max-w-3xl space-y-4">
        <h3 className="text-[12.5px] font-semibold text-fg">Targeting</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Industry / sector</Label>
            <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="e.g. B2B SaaS" />
          </div>
          <div>
            <Label>Target audience</Label>
            <Input
              value={form.targetAudience}
              onChange={(e) => update("targetAudience", e.target.value)}
              placeholder="Who these leads are and what they care about"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Sender name</Label>
            <Input value={form.senderName} onChange={(e) => update("senderName", e.target.value)} placeholder="e.g. Alex" />
            <FieldHint>Used as the email signature and the From name. Sending is blocked if this is empty.</FieldHint>
          </div>
          <div>
            <Label>Sender title</Label>
            <Input value={form.senderTitle} onChange={(e) => update("senderTitle", e.target.value)} placeholder="e.g. Growth Lead" />
          </div>
        </div>
      </section>

      <section className="max-w-3xl space-y-4">
        <h3 className="text-[12.5px] font-semibold text-fg">Template</h3>
        <div>
          <Label>Raw subject line structure</Label>
          <FieldHint className="mt-0 mb-1.5">The AI follows this structure strictly. It may change wording, not format.</FieldHint>
          <Textarea
            rows={2}
            value={form.rawSubjectStructure}
            onChange={(e) => update("rawSubjectStructure", e.target.value)}
            placeholder="[Short, specific, references company/industry]"
            className="font-mono text-[12.5px]"
          />
        </div>
        <div>
          <Label>Raw email structure</Label>
          <FieldHint className="mt-0 mb-1.5">
            Each [bracketed instruction] produces exactly one paragraph, in order. This is checked when each email is generated.
          </FieldHint>
          <Textarea
            rows={12}
            value={form.rawEmailStructure}
            onChange={(e) => update("rawEmailStructure", e.target.value)}
            placeholder="Hi {{first_name}},&#10;&#10;[Open with something specific]&#10;&#10;[Explain how we help]&#10;&#10;[CTA]"
            className="font-mono text-[12.5px] leading-relaxed"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>CTA link</Label>
            <Input value={form.ctaLink} onChange={(e) => update("ctaLink", e.target.value)} placeholder="https://" />
          </div>
          <div>
            <Label>Early bird line</Label>
            <Input value={form.earlyBirdLine} onChange={(e) => update("earlyBirdLine", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Other required elements</Label>
          <TagInput
            tags={form.otherRequiredElements}
            onChange={(tags) => update("otherRequiredElements", tags)}
            placeholder="Add a required element…"
          />
        </div>
        <div>
          <Label>Banned phrases</Label>
          <TagInput tags={form.bannedPhrases} onChange={(tags) => update("bannedPhrases", tags)} placeholder="Add a banned phrase…" />
        </div>
        <div>
          <Label>Universal image (Day 0 only)</Label>
          {list ? (
            <FileDropzone value={form.universalImageUrl} onChange={(url) => update("universalImageUrl", url)} onUpload={uploadImage} />
          ) : (
            <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-[12px] text-muted-faint">
              Save the list once to attach an image.
            </p>
          )}
        </div>
      </section>

      <section className="max-w-3xl space-y-4">
        <h3 className="text-[12.5px] font-semibold text-fg">Follow-ups</h3>
        <div className="grid grid-cols-3 gap-4">
          {(["followupDay3Guidance", "followupDay7Guidance", "followupDay14Guidance"] as const).map((key, i) => (
            <div key={key}>
              <Label>
                Follow-up {i + 1}:{" "}
                {form.testMode
                  ? `${TEST_MODE_FOLLOWUP_MINUTES[i]} min after the previous email`
                  : `day ${form.followupOffsetsDays[i]}`}
              </Label>
              <Textarea rows={4} value={form[key]} onChange={(e) => update(key, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Label className="mb-0 shrink-0">Days after original send</Label>
          {form.followupOffsetsDays.map((offset, i) => (
            <Input
              key={i}
              type="number"
              min={1}
              value={offset}
              onChange={(e) => updateOffset(i, Number(e.target.value))}
              className="w-20"
            />
          ))}
        </div>
      </section>

      <section className="max-w-3xl space-y-4">
        <h3 className="text-[12.5px] font-semibold text-fg">Schedule</h3>
        {form.testMode && (
          <p className="text-[12px] text-info">Ignored while test mode is on. These settings come back into effect when it is turned off.</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => update("timezone", e.target.value)} list="tz-options" />
            <datalist id="tz-options">
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Daily send cap</Label>
            <Input type="number" min={1} value={form.dailyCap} onChange={(e) => update("dailyCap", Number(e.target.value))} />
          </div>
          <div>
            <Label>Window start</Label>
            <Input
              type="time"
              value={minutesToTimeValue(form.windowStartMinutes)}
              onChange={(e) => update("windowStartMinutes", timeValueToMinutes(e.target.value))}
            />
          </div>
          <div>
            <Label>Window end</Label>
            <Input
              type="time"
              value={minutesToTimeValue(form.windowEndMinutes)}
              onChange={(e) => update("windowEndMinutes", timeValueToMinutes(e.target.value))}
            />
          </div>
          <div>
            <Label>Drip batch size</Label>
            <Input
              type="number"
              min={1}
              value={form.dripBatchSize}
              onChange={(e) => update("dripBatchSize", Number(e.target.value))}
            />
            <FieldHint>Emails per burst, e.g. 5.</FieldHint>
          </div>
          <div>
            <Label>Minutes between bursts</Label>
            <Input
              type="number"
              min={1}
              value={form.dripIntervalMinutes}
              onChange={(e) => update("dripIntervalMinutes", Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <Label>Active days</Label>
          <div className="flex gap-1.5">
            {ACTIVE_DAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "h-8 w-11 rounded-md border text-[12px] font-medium transition-colors",
                  form.activeDays.includes(day)
                    ? "border-accent bg-accent-muted/40 text-accent"
                    : "border-border text-muted-faint hover:text-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
