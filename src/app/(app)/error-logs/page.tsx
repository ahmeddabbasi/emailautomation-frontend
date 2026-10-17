import { PageHeader } from "@/components/ui/page-header";
import { ErrorLogsView } from "@/components/error-logs/error-logs-view";

export default function ErrorLogsPage() {
  return (
    <div>
      <PageHeader
        title="Error logs"
        description="Every backend and browser error or warning from the last 30 days. Identical errors are grouped."
      />
      <ErrorLogsView />
    </div>
  );
}
