"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CsvUploadFlow } from "./csv-upload-flow";
import type { Campaign } from "@/lib/types";

export function UploadList({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [leadListId, setLeadListId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createList() {
    setError(null);
    const res = await fetch("/api/lead-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, source: "manual", campaignId: campaignId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not create the list");
      return;
    }
    setLeadListId(data.leadList.id);
  }

  return (
    <div className="px-6 pt-5">
      {!open ? (
        <Button variant="primary" size="sm" data-sim-target="add-recipients" onClick={() => setOpen(true)}>Upload list</Button>
      ) : (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Upload list</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setLeadListId(null); }}>Close</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!leadListId ? (
              <>
                <div>
                  <Label>List name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Campaign (optional)</Label>
                  <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                    <option value="">Do not link yet</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </Select>
                </div>
                {error && <p className="text-[12.5px] text-danger">{error}</p>}
                <Button variant="primary" size="sm" disabled={!name.trim()} onClick={() => void createList()}>Continue</Button>
              </>
            ) : (
              <CsvUploadFlow leadListId={leadListId} source="manual" onImported={() => router.refresh()} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
