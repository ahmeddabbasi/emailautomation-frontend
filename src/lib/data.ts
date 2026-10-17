import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Campaign, Contact, LeadList, SendLog } from "@/lib/types";

export interface UiDefaults {
  defaultSenderName: string;
  defaultSenderTitle: string;
  ctaLink: string;
  earlyBirdLine: string;
}

function backendUrl(): string {
  const url = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!url) throw new Error("Missing required environment variable: BACKEND_URL");
  return url;
}

async function readView<T>(query: string, missing: "null" | "throw" = "throw"): Promise<T> {
  const jar = await cookies();
  const response = await fetch(`${backendUrl()}/api/view?${query}`, {
    headers: { cookie: jar.toString() },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login");
  if (response.status === 404 && missing === "null") return null as T;
  if (!response.ok) throw new Error(`Could not load ${query} (${response.status})`);
  return (await response.json()) as T;
}

export function getCampaigns(): Promise<Campaign[]> {
  return readView<Campaign[]>("resource=campaigns");
}

export function getCampaign(id: string): Promise<Campaign | null> {
  return readView<Campaign | null>(`resource=campaign&id=${encodeURIComponent(id)}`, "null");
}

export function getLeadLists(campaignId: string): Promise<LeadList[]> {
  return readView<LeadList[]>(`resource=lead-lists&campaignId=${encodeURIComponent(campaignId)}`);
}

export function getLeadList(id: string): Promise<LeadList | null> {
  return readView<LeadList | null>(`resource=lead-list&id=${encodeURIComponent(id)}`, "null");
}

export function getContacts(filters: { leadListId?: string; campaignId?: string } = {}): Promise<Contact[]> {
  const params = new URLSearchParams({ resource: "contacts" });
  if (filters.leadListId) params.set("leadListId", filters.leadListId);
  if (filters.campaignId) params.set("campaignId", filters.campaignId);
  return readView<Contact[]>(params.toString());
}

export function getSendLogs(): Promise<SendLog[]> {
  return readView<SendLog[]>("resource=sends");
}

export function getUiDefaults(): Promise<UiDefaults> {
  return readView<UiDefaults>("resource=defaults");
}
