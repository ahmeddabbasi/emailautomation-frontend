import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { getCampaigns } from "@/lib/data";

export default async function DashboardPage() {
  const campaigns = await getCampaigns();
  return <AnalyticsDashboard campaigns={campaigns} />;
}
