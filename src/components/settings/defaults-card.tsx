"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/input";

interface Defaults {
  ctaLink: string;
  earlyBirdLine: string;
}

export function DefaultsCard() {
  const [saved, setSaved] = useState<Defaults | null>(null);
  const [form, setForm] = useState<Defaults>({ ctaLink: "", earlyBirdLine: "" });
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/defaults")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load defaults");
        return data as Defaults;
      })
      .then((data) => {
        if (cancelled) return;
        setSaved(data);
        setForm(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load defaults");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save defaults");
      setSaved(form);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save defaults");
    } finally {
      setBusy(false);
    }
  }

  const dirty = saved !== null && (form.ctaLink !== saved.ctaLink || form.earlyBirdLine !== saved.earlyBirdLine);

  return (
    <div className="max-w-5xl px-6 pt-5">
      <Card>
        <CardHeader>
          <CardTitle>Lead list defaults</CardTitle>
          <div className="flex items-center gap-3">
            {justSaved && (
              <span className="flex items-center gap-1 text-[12px] text-success">
                <Check size={12} /> Saved
              </span>
            )}
            <Button variant="primary" size="sm" onClick={save} disabled={busy || !dirty}>
              {busy && <Loader2 size={13} className="animate-spin" />} Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-cta">Default CTA link</Label>
            <Input id="default-cta" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="https://" />
          </div>
          <div>
            <Label htmlFor="default-early-bird">Default early-bird line</Label>
            <Input id="default-early-bird" value={form.earlyBirdLine} onChange={(e) => setForm({ ...form, earlyBirdLine: e.target.value })} />
          </div>
          <FieldHint className="mt-0">New lead lists start with these values. Each list can override both.</FieldHint>
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
