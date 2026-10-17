import { PageHeader } from "@/components/ui/page-header";
import { DefaultsCard } from "@/components/settings/defaults-card";
import { KnowledgeBase } from "@/components/settings/knowledge-base";
import { MailboxesCard } from "@/components/settings/mailboxes-card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company knowledge the AI draws on when writing emails. It only states facts found here, in the lead list settings, or in the contact's own data."
      />
      <DefaultsCard />
      <MailboxesCard />
      <KnowledgeBase />
    </div>
  );
}
