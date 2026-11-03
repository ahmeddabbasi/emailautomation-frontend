import { PageHeader } from "@/components/ui/page-header";
import { DefaultsCard } from "@/components/settings/defaults-card";
import { GeminiCard } from "@/components/settings/gemini-card";
import { OpenAiCard } from "@/components/settings/openai-card";
import { KnowledgeBase } from "@/components/settings/knowledge-base";
import { MailboxesCard } from "@/components/settings/mailboxes-card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Writers, mailboxes, and the company knowledge used when emails are drafted."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-6">
        <section className="space-y-3">
          <h2 className="text-[11.5px] font-medium uppercase tracking-wide text-muted-faint">Writers</h2>
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <GeminiCard />
            <OpenAiCard />
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-[11.5px] font-medium uppercase tracking-wide text-muted-faint">Sending</h2>
          <div className="space-y-4">
            <DefaultsCard />
            <MailboxesCard />
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-[11.5px] font-medium uppercase tracking-wide text-muted-faint">Knowledge</h2>
          <KnowledgeBase />
        </section>
      </div>
    </div>
  );
}
