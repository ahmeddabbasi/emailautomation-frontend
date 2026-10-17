"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvUploadFlow } from "@/components/leads/csv-upload-flow";
import { AddContactForm } from "@/components/leads/add-contact-form";
import { ContactsTable } from "@/components/leads/contacts-table";
import type { Contact, ContactSource } from "@/lib/types";

export function LeadListContactsClient({
  leadListId,
  source,
  contacts,
}: {
  leadListId: string;
  source: ContactSource;
  contacts: Contact[];
}) {
  const router = useRouter();

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
    <div className="space-y-5 px-6 py-5">
      <CsvUploadFlow leadListId={leadListId} source={source} onImported={() => router.refresh()} />
      <AddContactForm leadListId={leadListId} onAdded={() => router.refresh()} />

      <Card>
        <CardHeader>
          <CardTitle>Contacts in this list</CardTitle>
        </CardHeader>
        <ContactsTable contacts={contacts} scope="list" onUpdateStatus={handleUpdateStatus} />
      </Card>
    </div>
  );
}
