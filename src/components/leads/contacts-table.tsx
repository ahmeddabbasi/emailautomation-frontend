"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Ban, MailX, RotateCcw, Users } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SEQUENCE_STEP_LABELS } from "@/lib/labels";
import { formatDueDate, cn } from "@/lib/utils";
import type { Campaign, Contact, ContactStatus } from "@/lib/types";

type MutableStatus = "stopped" | "invalid" | "pending" | "queued";
type SortKey = "name" | "company" | "nextSendAt";
type Sort = { key: SortKey; dir: 1 | -1 };

const PAGE_SIZE = 10;

function SortHeader({
  label,
  sortKey,
  sort,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onToggle: (key: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onToggle(sortKey)}
      className="flex items-center gap-1 whitespace-nowrap font-medium text-muted-faint hover:text-fg"
    >
      {label}
      <ArrowUpDown size={11} className={sort.key === sortKey ? "text-accent" : ""} />
    </button>
  );
}

export function ContactsTable({
  contacts,
  campaigns,
  scope = "global",
  onUpdateStatus,
  initialStatusFilter = "all",
}: {
  contacts: Contact[];
  campaigns?: Campaign[];
  scope?: "global" | "list";
  onUpdateStatus: (contactId: string, status: MutableStatus) => void;
  initialStatusFilter?: ContactStatus | "all";
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">(initialStatusFilter);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [sort, setSort] = useState<Sort>({ key: "name", dir: 1 });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = contacts;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (scope === "global" && campaignFilter !== "all") list = list.filter((c) => c.campaignId === campaignFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sort.key === "nextSendAt") {
        const av = a.nextSendAt ? new Date(a.nextSendAt).getTime() : Infinity;
        const bv = b.nextSendAt ? new Date(b.nextSendAt).getTime() : Infinity;
        return (av - bv) * sort.dir;
      }
      return a[sort.key].localeCompare(b[sort.key]) * sort.dir;
    });
  }, [contacts, statusFilter, campaignFilter, query, sort, scope]);

  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search name, email, company…" className="w-64" />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as ContactStatus | "all"); setPage(1); }}
        >
          <option value="all">All statuses</option>
          <option value="queued">Queued</option>
          <option value="pending">Active</option>
          <option value="stopped">Stopped</option>
          <option value="invalid">Invalid</option>
          <option value="completed">Completed</option>
          <option value="generation_failed">Generation failed</option>
          <option value="replied">Replied</option>
          <option value="complained">Complained</option>
        </Select>
        {scope === "global" && campaigns && (
          <Select
            value={campaignFilter}
            onChange={(e) => { setCampaignFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <span className="ml-auto text-[12px] text-muted-faint">{filtered.length} {filtered.length === 1 ? "contact" : "contacts"}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={18} />}
          title="No contacts match these filters"
          description="Try clearing the search or filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-2.5"><SortHeader label="Name" sortKey="name" sort={sort} onToggle={toggleSort} /></th>
                  <th className="px-4 py-2.5"><SortHeader label="Company" sortKey="company" sort={sort} onToggle={toggleSort} /></th>
                  <th className="px-4 py-2.5 font-medium text-muted-faint">Source</th>
                  {scope === "global" && <th className="px-4 py-2.5 font-medium text-muted-faint">List</th>}
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium text-muted-faint">Step</th>
                  <th className="px-4 py-2.5 font-medium text-muted-faint">Status</th>
                  <th className="px-4 py-2.5"><SortHeader label="Next send" sortKey="nextSendAt" sort={sort} onToggle={toggleSort} /></th>
                  <th className="px-4 py-2.5 font-medium text-muted-faint text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageItems.map((c) => (
                  <tr key={c.id} className="group hover:bg-surface-hover">
                    <td className="px-4 py-2.5">
                      <p className="text-[13px] font-medium text-fg">{c.name}</p>
                      <p className="text-[11.5px] text-muted-faint">{c.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-muted">{c.company}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-medium",
                          c.source === "apollo" ? "bg-info/15 text-info" : "bg-surface-hover text-muted"
                        )}
                      >
                        {c.source === "apollo" ? "Apollo" : "Manual"}
                      </span>
                    </td>
                    {scope === "global" && (
                      <td className="px-4 py-2.5 text-[12.5px] text-muted">
                        {c.campaignName} / {c.leadListName}
                        {c.leadListTestMode && (
                          <span className="ml-1.5 rounded bg-info/15 px-1.5 py-0.5 text-[10.5px] font-medium text-info">Test mode</span>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-muted">
                      {SEQUENCE_STEP_LABELS[c.sequenceStep]}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-muted-faint">
                      {c.status === "pending" && c.nextSendAt ? formatDueDate(c.nextSendAt) : "Not scheduled"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        {c.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateStatus(c.id, "stopped")}
                            >
                              <Ban size={12} /> Stop
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateStatus(c.id, "invalid")}
                            >
                              <MailX size={12} /> Invalid
                            </Button>
                          </>
                        )}
                        {c.status === "generation_failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdateStatus(c.id, c.sequenceStep === 0 ? "queued" : "pending")}
                          >
                            <RotateCcw size={12} /> Retry
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
