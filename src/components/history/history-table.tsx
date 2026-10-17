"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, History as HistoryIcon } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SEQUENCE_STEP_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Campaign, SendLog } from "@/lib/types";

const PAGE_SIZE = 12;

const PROVIDER_LABELS = { gemini: "Gemini", groq: "Groq" } as const;

type DisplayStatus = "sent" | "failed" | "bounced";

// A bounce arrives after Mailgun already accepted the send, so the row stays
// status=sent in the database but must never read as a success here.
function displayStatus(log: SendLog): DisplayStatus {
  if (log.status === "sent" && log.deliveryFailedAt) return "bounced";
  return log.status;
}

export function HistoryTable({ logs, campaigns }: { logs: SendLog[]; campaigns: Campaign[] }) {
  const [query, setQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | "all">("all");
  const [providerFilter, setProviderFilter] = useState<"all" | "gemini" | "groq">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (campaignFilter !== "all" && log.campaignId !== campaignFilter) return false;
      if (statusFilter !== "all" && displayStatus(log) !== statusFilter) return false;
      if (providerFilter !== "all" && log.provider !== providerFilter) return false;
      if (fromDate && new Date(log.createdAt) < new Date(fromDate)) return false;
      if (toDate && new Date(log.createdAt) > new Date(toDate + "T23:59:59")) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !log.contactName.toLowerCase().includes(q) &&
          !log.company.toLowerCase().includes(q) &&
          !(log.subject ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [logs, campaignFilter, statusFilter, providerFilter, fromDate, toDate, query]);

  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search contact, company, subject…"
          className="w-64"
        />
        <Select
          value={campaignFilter}
          onChange={(e) => {
            setCampaignFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as DisplayStatus | "all");
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Failed</option>
        </Select>
        <Select
          aria-label="Model"
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value as "all" | "gemini" | "groq");
            setPage(1);
          }}
        >
          <option value="all">All models</option>
          <option value="gemini">Gemini</option>
          <option value="groq">Groq</option>
        </Select>
        <div className="w-36 shrink-0">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="h-8 text-[12.5px]"
          />
        </div>
        <span className="text-[12px] text-muted-faint">to</span>
        <div className="w-36 shrink-0">
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="h-8 text-[12.5px]"
          />
        </div>
        <span className="ml-auto text-[12px] text-muted-faint">{filtered.length} {filtered.length === 1 ? "send" : "sends"}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={18} />}
          title="No sends match these filters"
          description="Try widening the date range or clearing filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-[11px] uppercase tracking-wide text-muted-faint">
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">Campaign</th>
                  <th className="px-4 py-2.5 font-medium">Step</th>
                  <th className="px-4 py-2.5 font-medium">Subject</th>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Sent</th>
                  <th className="w-8 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageItems.map((log) => {
                  const expanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(expanded ? null : log.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedId(expanded ? null : log.id);
                          }
                        }}
                        tabIndex={0}
                        aria-expanded={expanded}
                        className="cursor-pointer hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                      >
                        <td className="px-4 py-2.5">
                          <p className="text-[13px] font-medium text-fg">{log.contactName}</p>
                          <p className="text-[11.5px] text-muted-faint">{log.company}</p>
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-2.5 text-[12.5px] text-muted">
                          {log.campaignName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-muted">
                          {SEQUENCE_STEP_LABELS[log.sequenceStep]}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-2.5 text-[12.5px] text-fg">
                          {log.subject ?? <span className="text-muted-faint">No subject</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted">
                          {log.provider ? PROVIDER_LABELS[log.provider] : <span className="text-muted-faint">n/a</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <StatusPill status={displayStatus(log)} />
                            {log.testMode && (
                              <span className="rounded bg-info/15 px-1.5 py-0.5 text-[10.5px] font-medium text-info">Test mode</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted-faint">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <ChevronDown
                            size={14}
                            className={cn(
                              "text-muted-faint transition-transform",
                              expanded && "rotate-180 text-fg"
                            )}
                          />
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-surface-raised">
                          <td colSpan={8} className="px-4 py-4">
                            {log.errorMessage && (
                              <p className="mb-3 text-[12.5px] text-danger">{log.errorMessage}</p>
                            )}
                            {log.subject && log.body ? (
                              <div className="max-w-2xl rounded-md border border-border bg-[#f4f4f2] px-5 py-4 text-[#1c1c1e]">
                                <p className="mb-2 text-[12px] font-semibold">{log.subject}</p>
                                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                                  {log.body}
                                </p>
                              </div>
                            ) : (
                              !log.errorMessage && (
                                <p className="text-[12.5px] text-muted-faint">No content was generated for this attempt.</p>
                              )
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
