import { PageHeader } from "@/components/ui/page-header";
import { RawSendForm } from "@/components/testing/raw-send-form";
import { AiSendForm } from "@/components/testing/ai-send-form";
import { getUiDefaults } from "@/lib/data";

export default async function TestingPage() {
  const defaults = await getUiDefaults();
  return (
    <div>
      <PageHeader
        title="Testing"
        description="Manual test sends. These are separate from campaign sending and excluded from analytics."
      />
      <div className="grid grid-cols-2 gap-5 px-6 py-5">
        <RawSendForm />
        <AiSendForm defaultSenderName={defaults.defaultSenderName} defaultSenderTitle={defaults.defaultSenderTitle} />
      </div>
    </div>
  );
}
