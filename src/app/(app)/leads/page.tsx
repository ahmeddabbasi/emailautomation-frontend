import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsPageClient } from "@/components/leads/leads-page-client";
import { UploadList } from "@/components/leads/upload-list";
import { getContacts, getCampaigns } from "@/lib/data";

export default async function LeadsPage() {
  const [contacts, campaigns] = await Promise.all([getContacts(), getCampaigns()]);

  return (
    <div>
      <PageHeader title="Leads" description="Every contact across every campaign and lead list." />
      <UploadList campaigns={campaigns} />
      <Suspense>
        <LeadsPageClient contacts={contacts} campaigns={campaigns} />
      </Suspense>
    </div>
  );
}
