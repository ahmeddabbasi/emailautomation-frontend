import { notFound } from "next/navigation";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { CampaignSending } from "@/components/campaigns/campaign-sending";
import { TemplateEditor } from "@/components/campaigns/template-editor";
import { LeadListsSection } from "@/components/campaigns/lead-lists-section";
import { getCampaign, getLeadLists } from "@/lib/data";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, leadLists] = await Promise.all([getCampaign(id), getLeadLists(id)]);
  if (!campaign) notFound();

  return (
    <div>
      <CampaignForm campaign={campaign} mode="edit" />
      <CampaignSending campaignId={id} />
      <TemplateEditor campaignId={id} />
      <LeadListsSection campaignId={id} leadLists={leadLists} />
    </div>
  );
}
