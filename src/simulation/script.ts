import { CANNED_DRAFT, SAMPLE_RECIPIENT } from "./mock-data";

export interface SimStep {
  id: string;
  href: string;
  target: string;
  fallbackTarget?: string;
  title: string;
  caption: string;
  sample?: string;
}

export const SIM_STEPS: SimStep[] = [
  {
    id: "overview",
    href: "/dashboard",
    target: "view-results",
    title: "Start on Overview",
    caption: "Overview is the home screen. It shows what to do next and whether a campaign is ready. This tour only points at the screen. It does not change any campaign.",
  },
  {
    id: "select-campaign",
    href: "/campaigns",
    target: "select-campaign",
    fallbackTarget: "new-campaign",
    title: "Select a campaign",
    caption: "Each campaign holds the company description and the lists under it. The cursor points at a campaign. Opening it for real is left to you after the tour.",
  },
  {
    id: "campaign-brief",
    href: "/campaigns/new",
    target: "campaign-name",
    title: "Name the campaign",
    caption: "A campaign needs a name and a plain description of the company. The sample name is typed here in the caption only. The form is not saved.",
    sample: "Northwind Logistics check-in",
  },
  {
    id: "add-recipients",
    href: "/leads",
    target: "add-recipients",
    title: "Add recipients",
    caption: "Recipients come from a CSV on Leads. A sample row is Jordan Lee at Harbor Freight Co. No file is uploaded during the tour.",
    sample: SAMPLE_RECIPIENT,
  },
  {
    id: "draft-email",
    href: "/testing",
    target: "draft-email",
    title: "Draft the email",
    caption: "Generate on Testing writes a subject and body you can edit. With an OpenAI key, those instructions are sent to OpenAI. This tour shows a canned draft and does not call OpenAI.",
    sample: "A short note about on-time updates for dispatch teams.",
  },
  {
    id: "review",
    href: "/testing",
    target: "draft-email",
    title: "Review before sending",
    caption: `Subject: ${CANNED_DRAFT.subject}. ${CANNED_DRAFT.body} The draft stays editable. Sending is a separate button. This tour never sends.`,
  },
  {
    id: "results",
    href: "/history",
    target: "send-history",
    title: "Check results",
    caption: "Send history shows what went out. Campaign mail leaves only after a list is active and inside its send window. Leave a campaign paused until the setup steps are done.",
  },
];
