"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Loader2, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { refreshHealth } from "@/components/layout/health-indicator";
import { OPERATOR_TIMEZONE } from "@/lib/timezone";
import { cn } from "@/lib/utils";

interface Group {
  fingerprint: string;
  level: "error" | "warning";
  source: string;
  code: string;
  message: string;
  occurrences: number;
  unresolved: number;
  firstSeen: string;
  lastSeen: string;
}

interface Occurrence {
  id: string;
  createdAt: string;
  level: "error" | "warning";
  source: string;
  code: string;
  message: string;
  details: Record<string, unknown>;
  stack: string | null;
  resolved: boolean;
  resolvedAt: string | null;
}

interface Filters {
  level: string;
  source: string;
  code: string;
  resolved: string;
  from: string;
  to: string;
  q: string;
}

const PAGE_SIZE = 50;
const INITIAL_FILTERS: Filters = { level: "", source: "", code: "", resolved: "false", from: "", to: "", q: "" };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: OPERATOR_TIMEZONE,
  });
}

function toQuery(filters: Filters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, ...extra })) if (v) params.set(k, v);
  return params.toString();
}

function diagnosticText(group: Group, occurrences: Occurrence[]): string {
  const latest = occurrences[0];
  return [
    `[${group.level.toUpperCase()}] ${group.code} (source: ${group.source})`,
    group.message,
    `Occurrences: ${group.occurrences} (${group.unresolved} unresolved)`,
    `First seen: ${formatTime(group.firstSeen)}  Last seen: ${formatTime(group.lastSeen)} (${OPERATOR_TIMEZONE})`,
    latest ? `\nLatest occurrence ${latest.id} at ${formatTime(latest.createdAt)}` : "",
    latest ? `Details:\n${JSON.stringify(latest.details, null, 2)}` : "",
    latest?.stack ? `Stack:\n${latest.stack}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function LevelPill({ level }: { level: "error" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        level === "error" ? "bg-danger-muted text-danger" : "bg-warning-muted text-warning"
      )}
    >
      {level === "error" ? "Error" : "Warning"}
    </span>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(getText());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy for diagnosis"}
    </Button>
  );
}

function GroupDetail({
  group,
  filters,
  onChanged,
}: {
  group: Group;
  filters: Filters;
  onChanged: () => void;
}) {
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const qs = toQuery({ ...filters, q: "", level: "", source: "", code: "" }, { fingerprint: group.fingerprint });
    fetch(`/api/logs/occurrences?${qs}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load occurrences");
        return data.occurrences as Occurrence[];
      })
      .then((rows) => {
        if (!cancelled) setOccurrences(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load occurrences");
      });
    return () => {
      cancelled = true;
    };
  }, [filters, group.fingerprint, reloadKey]);

  async function resolveOne(id: string, resolved: boolean) {
    setBusyId(id);
    const res = await fetch("/api/logs/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], resolved }),
    });
    setBusyId(null);
    if (res.ok) {
      setReloadKey((k) => k + 1);
      onChanged();
    }
  }

  if (error) return <p className="text-[12.5px] text-danger">{error}</p>;
  if (!occurrences) {
    return (
      <p className="flex items-center gap-2 text-[12.5px] text-muted-faint">
        <Loader2 size={13} className="animate-spin" /> Loading occurrences…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <CopyButton getText={() => diagnosticText(group, occurrences)} />
        <span className="text-[12px] text-muted-faint">
          First seen {formatTime(group.firstSeen)}, last seen {formatTime(group.lastSeen)}
        </span>
      </div>
      {occurrences.length === 0 && <p className="text-[12.5px] text-muted-faint">No occurrences match the current filters.</p>}
      <ul className="space-y-2">
        {occurrences.map((o) => (
          <li key={o.id} className="rounded-md border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="tabular-nums text-muted">{formatTime(o.createdAt)}</span>
                {o.resolved && <span className="text-success">Resolved</span>}
              </div>
              <Button variant="ghost" size="sm" disabled={busyId === o.id} onClick={() => resolveOne(o.id, !o.resolved)}>
                {busyId === o.id ? <Loader2 size={12} className="animate-spin" /> : o.resolved ? <RotateCcw size={12} /> : <Check size={12} />}
                {o.resolved ? "Reopen" : "Mark resolved"}
              </Button>
            </div>
            <div className="space-y-2 px-3 py-2.5">
              <p className="text-[12.5px] text-fg">{o.message}</p>
              <pre className="max-h-72 overflow-auto rounded bg-bg px-3 py-2 font-mono text-[11.5px] leading-relaxed text-muted">
                {JSON.stringify(o.details, null, 2)}
              </pre>
              {o.stack && (
                <details>
                  <summary className="cursor-pointer text-[12px] text-muted hover:text-fg">Stack trace</summary>
                  <pre className="mt-1.5 max-h-72 overflow-auto rounded bg-bg px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-faint">
                    {o.stack}
                  </pre>
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErrorLogsView() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<{ codes: string[]; sources: string[] }>({ codes: [], sources: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.q === search ? f : { ...f, q: search }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/logs?${toQuery(filters, { page: String(page) })}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load error logs");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setGroups(data.groups);
        setTotal(data.total);
        setFacets(data.facets);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load error logs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setLoading(true);
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
    setSelected(new Set());
    setExpanded(null);
  }

  function toggleSelected(fingerprint: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fingerprint)) next.delete(fingerprint);
      else next.add(fingerprint);
      return next;
    });
  }

  async function resolveGroups(fingerprints: string[], resolved: boolean) {
    setResolving(true);
    const res = await fetch("/api/logs/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprints, resolved }),
    });
    setResolving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update the selected entries");
      return;
    }
    setSelected(new Set());
    reload();
    refreshHealth();
  }

  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const allSelected = groups.length > 0 && groups.every((g) => selected.has(g.fingerprint));
  const filtersActive = JSON.stringify({ ...filters, q: search }) !== JSON.stringify(INITIAL_FILTERS);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search messages and details…" className="w-64" />
        <Select aria-label="Status" value={filters.resolved} onChange={(e) => setFilter("resolved", e.target.value)}>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
          <option value="">All statuses</option>
        </Select>
        <Select aria-label="Level" value={filters.level} onChange={(e) => setFilter("level", e.target.value)}>
          <option value="">All levels</option>
          <option value="error">Errors</option>
          <option value="warning">Warnings</option>
        </Select>
        <Select aria-label="Source" value={filters.source} onChange={(e) => setFilter("source", e.target.value)}>
          <option value="">All sources</option>
          {facets.sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select aria-label="Code" value={filters.code} onChange={(e) => setFilter("code", e.target.value)} className="max-w-56">
          <option value="">All codes</option>
          {facets.codes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <div className="w-36 shrink-0">
          <Input aria-label="From date" type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className="h-8 text-[12.5px]" />
        </div>
        <span className="text-[12px] text-muted-faint">to</span>
        <div className="w-36 shrink-0">
          <Input aria-label="To date" type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className="h-8 text-[12.5px]" />
        </div>
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setLoading(true);
              setFilters(INITIAL_FILTERS);
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {loading && <Loader2 size={14} className="animate-spin text-muted-faint" />}
          {selected.size > 0 && (
            <Button variant="primary" size="sm" disabled={resolving} onClick={() => resolveGroups([...selected], filters.resolved !== "true")}>
              {resolving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              {filters.resolved === "true" ? "Reopen" : "Mark resolved"} ({selected.size})
            </Button>
          )}
          <span className="text-[12px] text-muted-faint">
            {total} {total === 1 ? "group" : "groups"}
          </span>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 px-6 pt-3 text-[12.5px] text-danger">
          <TriangleAlert size={13} /> {error}
        </p>
      )}

      {!loading && groups.length === 0 && !error ? (
        <div className="px-6 py-5">
          <EmptyState
            icon={<ShieldCheck size={18} />}
            title={filtersActive ? "No log entries match these filters" : "No unresolved errors or warnings"}
            description={filtersActive ? "Try widening the date range or clearing filters." : "Anything that goes wrong in the backend or the browser will appear here."}
          />
        </div>
      ) : (
        <div className={cn("overflow-x-auto transition-opacity", loading && groups.length > 0 && "opacity-60")}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-[11px] uppercase tracking-wide text-muted-faint">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(groups.map((g) => g.fingerprint)))}
                    className="accent-[var(--color-accent)]"
                  />
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">Last seen</th>
                <th className="px-3 py-2.5 font-medium">Level</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
                <th className="px-3 py-2.5 font-medium">Code</th>
                <th className="px-3 py-2.5 font-medium">Message</th>
                <th className="px-3 py-2.5 text-right font-medium">Count</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groups.map((g) => {
                const isOpen = expanded === g.fingerprint;
                const toggle = () => setExpanded(isOpen ? null : g.fingerprint);
                return (
                  <Fragment key={g.fingerprint}>
                    <tr
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle();
                        }
                      }}
                      className="cursor-pointer align-top hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${g.code}`}
                          checked={selected.has(g.fingerprint)}
                          onChange={() => toggleSelected(g.fingerprint)}
                          className="accent-[var(--color-accent)]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] tabular-nums text-muted">{formatTime(g.lastSeen)}</td>
                      <td className="px-3 py-2.5">
                        <LevelPill level={g.level} />
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px] text-muted">{g.source}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11.5px] text-fg">{g.code}</td>
                      <td className="max-w-md px-3 py-2.5 text-[12.5px] text-fg">
                        <p className="line-clamp-2">{g.message}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-muted">
                          {g.occurrences > 1 ? `×${g.occurrences}` : "1"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <ChevronDown size={14} className={cn("text-muted-faint transition-transform", isOpen && "rotate-180 text-fg")} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-surface-raised">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resolving}
                              onClick={() => resolveGroups([g.fingerprint], g.unresolved > 0)}
                            >
                              {g.unresolved > 0 ? <ShieldCheck size={13} /> : <RotateCcw size={13} />}
                              {g.unresolved > 1 ? `Mark all ${g.unresolved} resolved` : g.unresolved === 1 ? "Mark resolved" : "Reopen"}
                            </Button>
                          </div>
                          <GroupDetail group={g} filters={filters} onChanged={() => { reload(); refreshHealth(); }} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <Pagination page={page} pageCount={pageCount} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  );
}
