"use client";

import { useState } from "react";
import { UserPlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const EMPTY = { name: "", email: "", company: "", title: "", bio: "" };

export function AddContactForm({ leadListId, onAdded }: { leadListId: string; onAdded: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [fields, setFields] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setFields(EMPTY);
    setError(null);
    setExpanded(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadListId, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add contact");
      reset();
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-[12.5px] font-medium text-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        <UserPlus size={14} /> Add a contact manually
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a contact manually</CardTitle>
        <Button variant="ghost" size="sm" onClick={reset}>
          <X size={13} /> Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Name *</Label>
            <Input value={fields.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={fields.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="jane@company.com"
            />
          </div>
          <div>
            <Label>Company</Label>
            <Input value={fields.company} onChange={(e) => update("company", e.target.value)} placeholder="Acme Inc." />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={fields.title} onChange={(e) => update("title", e.target.value)} placeholder="Founder" />
          </div>
          <div className="col-span-2">
            <Label>Bio</Label>
            <Input
              value={fields.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Optional context for personalization"
            />
          </div>
        </div>

        {error && <p className="text-[12px] text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={reset}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!fields.name.trim() || !fields.email.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Add contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
