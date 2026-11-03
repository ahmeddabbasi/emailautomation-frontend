"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Campaign } from "@/lib/types";

interface FormState {
  name: string;
  status: "active" | "paused";
  companyDescription: string;
  valueProps: string;
}

const EMPTY_FORM: FormState = { name: "", status: "active", companyDescription: "", valueProps: "" };

function toFormState(campaign: Campaign | null): FormState {
  if (!campaign) return EMPTY_FORM;
  return {
    name: campaign.name,
    status: campaign.status,
    companyDescription: campaign.companyDescription,
    valueProps: campaign.valueProps,
  };
}

export function CampaignForm({ campaign, mode }: { campaign: Campaign | null; mode: "create" | "edit" }) {
  const router = useRouter();
  const initial = useMemo(() => toFormState(campaign), [campaign]);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (savingLock.current) return;
    if (!form.name.trim()) {
      setError("Add a campaign name.");
      return;
    }
    savingLock.current = true;
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data && typeof data.error === "string" ? data.error : "Failed to create campaign");
        router.push(`/campaigns/${data.campaign.id}`);
        return;
      }

      const res = await fetch(`/api/campaigns/${campaign!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data && typeof data.error === "string" ? data.error : "Failed to save campaign");
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-border px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl flex-1">
          <Label htmlFor="campaign-name" className="sr-only">Campaign name</Label>
          <Input
            id="campaign-name"
            data-sim-target="campaign-name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Campaign name"
            aria-invalid={!form.name.trim() && error ? true : undefined}
            aria-describedby={error ? "campaign-save-error" : undefined}
            disabled={saving}
            className="h-auto border-none bg-transparent px-0 text-[18px] font-semibold tracking-tight text-fg placeholder:text-muted-faint focus:ring-0"
          />
          <div className="mt-2">
            <Switch
              checked={form.status === "active"}
              onCheckedChange={(checked) => updateField("status", checked ? "active" : "paused")}
              label={form.status === "active" ? "Active" : "Paused"}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {error && (
            <span id="campaign-save-error" role="alert" className="flex items-center gap-1.5 text-[12px] font-medium text-danger">
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
          <Button variant="primary" size="sm" disabled={!dirty || saving || !form.name.trim()} aria-busy={saving} onClick={handleSave}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {mode === "create" ? "Create campaign" : "Save"}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="campaign-description">What does your company do?</Label>
          <Textarea
            id="campaign-description"
            rows={3}
            value={form.companyDescription}
            onChange={(e) => updateField("companyDescription", e.target.value)}
            placeholder="Plain description of the product or company. Shared context for every lead list in this campaign."
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="campaign-value-props">Key value props</Label>
          <Textarea
            id="campaign-value-props"
            rows={3}
            value={form.valueProps}
            onChange={(e) => updateField("valueProps", e.target.value)}
            placeholder={"One per line, e.g.\n- Saves X hours per week"}
            disabled={saving}
          />
          <FieldHint>Targeting, template, and schedule live on each lead list below.</FieldHint>
        </div>
      </div>
    </div>
  );
}
