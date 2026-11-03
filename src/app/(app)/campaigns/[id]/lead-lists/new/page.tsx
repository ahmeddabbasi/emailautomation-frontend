import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LeadListForm } from "@/components/lead-lists/lead-list-form";
import { getCampaign, getUiDefaults } from "@/lib/data";

function usableCta(link: string): string {
  try {
    const host = new URL(link).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "example.com" || host === "example.org" || host === "localhost" || host.endsWith(".example")) return "";
  } catch {
    return "";
  }
  return link;
}

export default async function NewLeadListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const defaults = await getUiDefaults();
  const ctaLink = usableCta(defaults.ctaLink);

  return (
    <div>
      <PageHeader title="New lead list" description={`For ${campaign.name}`} />
      <div className="px-6 py-5">
        <LeadListForm
          campaignId={id}
          list={null}
          mode="create"
          defaultSenderName={defaults.defaultSenderName}
          defaultSenderTitle={defaults.defaultSenderTitle}
          defaultCtaLink={ctaLink}
          defaultEarlyBirdLine={defaults.earlyBirdLine}
        />
      </div>
    </div>
  );
}
