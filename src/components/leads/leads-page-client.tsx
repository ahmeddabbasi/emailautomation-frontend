"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactsTable } from "./contacts-table";
import type { Campaign, Contact, ContactStatus } from "@/lib/types";

export function LeadsPageClient({ contacts, campaigns }: { contacts: Contact[]; campaigns: Campaign[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") as ContactStatus | null;

  async function handleUpdateStatus(
    campaignContactId: string,
    status: "stopped" | "invalid" | "pending" | "queued"
  ) {
    const res = await fetch(`/api/contacts/${campaignContactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="px-6 py-5">
      <Card>
        <CardHeader>
          <CardTitle>All contacts</CardTitle>
        </CardHeader>
        <ContactsTable
          contacts={contacts}
          campaigns={campaigns}
          scope="global"
          onUpdateStatus={handleUpdateStatus}
          initialStatusFilter={statusParam ?? "all"}
        />
      </Card>
    </div>
  );
}
