import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { getCampaigns } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Every outreach campaign, active or paused."
        actions={
          <Link href="/campaigns/new" data-sim-target="new-campaign">
            <Button variant="primary" size="sm">
              <Plus size={14} /> New campaign
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-5">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={18} />}
            title="No campaigns yet"
            description="Create a campaign, then add one or more lead lists under it, each with its own targeting, template, and send schedule."
            action={
              <Link href="/campaigns/new" data-sim-target="new-campaign">
                <Button variant="primary" size="sm">
                  <Plus size={14} /> New campaign
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-surface text-[11.5px] uppercase tracking-wide text-muted-faint">
                  <th className="px-4 py-2.5 font-medium">Campaign</th>
                  <th className="px-4 py-2.5 font-medium">Lead lists</th>
                  <th className="px-4 py-2.5 font-medium">Contacts</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {campaigns.map((campaign, index) => (
                  <tr key={campaign.id} className="group hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        data-sim-target={index === 0 ? "select-campaign" : undefined}
                        className="text-[13.5px] font-medium text-fg group-hover:text-accent group-hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-muted">{campaign.leadListCount}</td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-muted">{campaign.contactCount}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={campaign.status} />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-faint">{formatDate(campaign.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
