import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { HistoryTable } from "@/components/history/history-table";
import { getSendLogs, getCampaigns } from "@/lib/data";

export default async function HistoryPage() {
  const [logs, campaigns] = await Promise.all([getSendLogs(), getCampaigns()]);

  return (
    <div>
      <PageHeader title="Send history" description="Every send across every campaign." />
      <div className="px-6 py-5">
        <Card>
          <HistoryTable logs={logs} campaigns={campaigns} />
        </Card>
      </div>
    </div>
  );
}
