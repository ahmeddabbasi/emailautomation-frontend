import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LeadListForm } from "@/components/lead-lists/lead-list-form";
import { GenerationProgress } from "@/components/lead-lists/generation-progress";
import { LeadListContactsClient } from "@/components/lead-lists/lead-list-contacts-client";
import { getCampaign, getLeadList, getContacts } from "@/lib/data";

export default async function LeadListDetailPage({
  params,
}: {
  params: Promise<{ id: string; listId: string }>;
}) {
  const { id, listId } = await params;
  const [campaign, list, contacts] = await Promise.all([
    getCampaign(id),
    getLeadList(listId),
    getContacts({ leadListId: listId }),
  ]);
  if (!campaign || !list) notFound();

  return (
    <div>
      <PageHeader title={list.name} description={`${campaign.name} · Lead list configuration and contacts`} />
      <div className="px-6 py-5">
        <LeadListForm campaignId={id} list={list} mode="edit" />
      </div>
      <GenerationProgress list={list} />
      <LeadListContactsClient leadListId={listId} source={list.source} contacts={contacts} />
    </div>
  );
}
