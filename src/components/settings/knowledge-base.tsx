"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, cn } from "@/lib/utils";

const DOC_TYPE_LABELS = {
  company_profile: "Company database / profile",
  product: "Product information",
  pricing: "Pricing",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  case_studies: "Case studies",
  other: "Other",
} as const;
type DocType = keyof typeof DOC_TYPE_LABELS;
const DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as DocType[];

interface Item {
  id: string;
  kind: "document" | "link";
  docType: DocType;
  title: string;
  enabled: boolean;
  fileName: string | null;
  sizeBytes: number | null;
  url: string | null;
  lastFetchedAt: string | null;
  textLength: number;
  preview: string;
  status: "ok" | "empty" | "failed";
  error: string | null;
  updatedAt: string;
}

interface Brief {
  id: string;
  version: number;
  content: string;
  origin: "generated" | "edited";
  provider: string | null;
  createdAt: string;
}

interface Overview {
  documents: Item[];
  links: Item[];
  facts: string;
  brief: Brief | null;
  briefStale: boolean;
  enabledSources: number;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const POLL_MS = 4000;
const MAX_POLLS = 20;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

function formatBytes(n: number | null): string {
  if (n === null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DocTypeSelect({ value, onChange, label }: { value: DocType; onChange: (v: DocType) => void; label: string }) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as DocType)}>
      {DOC_TYPES.map((t) => (
        <option key={t} value={t}>
          {DOC_TYPE_LABELS[t]}
        </option>
      ))}
    </Select>
  );
}

function ItemRow({ item, onChanged, onRemoved }: { item: Item; onChanged: (item: Item) => void; onRemoved: (id: string) => void }) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [busy, setBusy] = useState<null | "save" | "refresh" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function patch(body: Partial<Pick<Item, "title" | "enabled" | "docType">>) {
    setBusy("save");
    setError(null);
    try {
      const { item: updated } = await request<{ item: Item }>(`/api/knowledge/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onChanged(updated);
      setRenaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    setBusy("refresh");
    setError(null);
    try {
      const { item: updated } = await request<{ item: Item }>(`/api/knowledge/${item.id}/refresh`, { method: "POST" });
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      await request(`/api/knowledge/${item.id}`, { method: "DELETE" });
      onRemoved(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(null);
    }
  }

  return (
    <li className={cn("px-4 py-3", !item.enabled && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim()) patch({ title: title.trim() });
              }}
            >
              <Input aria-label="Name" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 max-w-sm" autoFocus />
              <Button type="submit" variant="primary" size="sm" disabled={!title.trim() || busy === "save"}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle(item.title);
                  setRenaming(false);
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              {item.kind === "document" ? <FileText size={14} className="shrink-0 text-muted-faint" /> : <Link2 size={14} className="shrink-0 text-muted-faint" />}
              <p className="truncate text-[13.5px] font-medium text-fg">{item.title}</p>
              <button
                type="button"
                aria-label={`Rename ${item.title}`}
                onClick={() => setRenaming(true)}
                className="rounded p-0.5 text-muted-faint hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <p className="mt-1 text-[11.5px] text-muted-faint">
            {item.kind === "document" ? (
              <>
                {item.fileName} · {formatBytes(item.sizeBytes)}
              </>
            ) : (
              <>
                <a href={item.url ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent hover:underline">
                  {item.url} <ExternalLink size={10} />
                </a>
                {item.lastFetchedAt && <> · fetched {formatDateTime(item.lastFetchedAt)}</>}
              </>
            )}
          </p>
          <div className="mt-1.5 text-[12px]">
            {item.status === "ok" && (
              <span className="flex items-center gap-1 text-success">
                <Check size={12} /> {item.textLength.toLocaleString()} characters extracted
              </span>
            )}
            {item.status === "empty" && (
              <span className="flex items-start gap-1 text-warning">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {item.error}
              </span>
            )}
            {item.status === "failed" && (
              <span className="flex items-start gap-1 text-danger">
                <XCircle size={12} className="mt-0.5 shrink-0" /> {item.error}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DocTypeSelect label="Document type" value={item.docType} onChange={(docType) => patch({ docType })} />
          <Switch checked={item.enabled} onCheckedChange={(enabled) => patch({ enabled })} label={item.enabled ? "Used" : "Off"} />
          {item.kind === "link" && (
            <Button variant="ghost" size="sm" onClick={refresh} disabled={busy !== null}>
              <RefreshCw size={12} className={busy === "refresh" ? "animate-spin" : ""} /> Refresh
            </Button>
          )}
          {confirmDelete ? (
            <>
              <Button variant="danger" size="sm" onClick={remove} disabled={busy !== null}>
                {busy === "delete" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" aria-label={`Delete ${item.title}`} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}

      {item.textLength > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-[12px] text-muted hover:text-fg focus-visible:outline-none focus-visible:underline"
          >
            {showPreview ? "Hide extracted text" : "Preview extracted text"}
          </button>
          {showPreview && (
            <pre className="mt-1.5 max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-bg px-3 py-2 font-sans text-[12px] leading-relaxed text-muted">
              {item.preview}
              {item.textLength > item.preview.length && `\n\n(${(item.textLength - item.preview.length).toLocaleString()} more characters not shown)`}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}

function BriefCard({ overview, onSaved }: { overview: Overview; onSaved: (brief: Brief) => void }) {
  const brief = overview.brief;
  const [draft, setDraft] = useState(brief?.content ?? "");
  const [busy, setBusy] = useState<null | "save" | "regenerate">(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenId, setLastSeenId] = useState(brief?.id);

  if (brief?.id !== lastSeenId) {
    setLastSeenId(brief?.id);
    setDraft(brief?.content ?? "");
  }

  const dirty = brief ? draft.trim() !== brief.content.trim() : draft.trim().length > 0;

  async function run(kind: "save" | "regenerate") {
    setBusy(kind);
    setError(null);
    try {
      const { brief: saved } = await request<{ brief: Brief }>("/api/knowledge/brief", {
        method: kind === "save" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: kind === "save" ? JSON.stringify({ content: draft }) : undefined,
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-wrap gap-3">
        <CardTitle>Company brief used for generation</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => run("regenerate")} disabled={busy !== null || overview.enabledSources === 0}>
            {busy === "regenerate" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Regenerate
          </Button>
          <Button variant="primary" size="sm" onClick={() => run("save")} disabled={busy !== null || !dirty || !draft.trim()}>
            {busy === "save" && <Loader2 size={13} className="animate-spin" />} Save edits
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {brief ? (
          <p className="text-[12px] text-muted">
            <span className="font-medium text-fg">Version {brief.version}</span>, {brief.origin === "edited" ? "edited by hand" : `generated${brief.provider ? ` by ${brief.provider === "groq" ? "Groq" : brief.provider === "openai" ? "OpenAI" : "Gemini"}` : ""}`} on{" "}
            {formatDateTime(brief.createdAt)}. Every new email uses this version.
          </p>
        ) : (
          <p className="text-[12px] text-muted">
            No brief yet. Emails are written from the campaign description and lead list settings only. Add documents, links, or company facts
            below and a brief is generated automatically.
          </p>
        )}
        {overview.briefStale && (
          <p className="flex items-center gap-1.5 rounded-md bg-warning-muted/40 px-3 py-2 text-[12px] text-warning">
            <Loader2 size={12} className="animate-spin" /> The knowledge base changed. A new brief is being generated; emails keep using the
            current version until it is ready.
          </p>
        )}
        <Textarea
          aria-label="Company brief"
          rows={14}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="The brief appears here once there is something in the knowledge base."
          className="text-[13px]"
        />
        <FieldHint className="mt-0">
          Editing and saving creates a new version. The AI may only state facts that appear here, in the lead list settings, or in the contact&apos;s own
          data.
        </FieldHint>
        {error && <p className="text-[12px] text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}

function FactsCard({ initial, onSaved }: { initial: string; onSaved: () => void }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await request("/api/knowledge/facts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setSaved(text);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company facts</CardTitle>
        <div className="flex items-center gap-3">
          {justSaved && (
            <span className="flex items-center gap-1 text-[12px] text-success">
              <Check size={12} /> Saved
            </span>
          )}
          <Button variant="primary" size="sm" onClick={save} disabled={busy || text === saved}>
            {busy && <Loader2 size={13} className="animate-spin" />} Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          aria-label="Company facts"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Anything you'd rather type than upload: what the company does, offers, numbers you're happy for emails to mention."
        />
        <FieldHint className="mt-0">{text.length.toLocaleString()} / 20,000 characters</FieldHint>
        {error && <p className="text-[12px] text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}

function UploadForm({ onAdded }: { onAdded: (item: Item) => void }) {
  const [docType, setDocType] = useState<DocType>("company_profile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("This file is larger than 10 MB. Upload a smaller file.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("docType", docType);
      const { item } = await request<{ item: Item }>("/api/knowledge/documents", { method: "POST", body });
      onAdded(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Document type</Label>
          <DocTypeSelect label="Document type for upload" value={docType} onChange={setDocType} />
        </div>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {busy ? "Uploading and extracting…" : "Upload file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <span className="pb-1.5 text-[11.5px] text-muted-faint">PDF, DOCX, TXT or MD, up to 10 MB</span>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

function LinkForm({ onAdded }: { onAdded: (item: Item) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("product");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { item } = await request<{ item: Item }>("/api/knowledge/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, docType }),
      });
      onAdded(item);
      setUrl("");
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="space-y-2 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label htmlFor="link-label">Label</Label>
          <Input id="link-label" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pricing page" className="h-8" />
        </div>
        <div className="min-w-64 flex-1">
          <Label htmlFor="link-url">URL</Label>
          <Input id="link-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="h-8" />
        </div>
        <div>
          <Label>Type</Label>
          <DocTypeSelect label="Link type" value={docType} onChange={setDocType} />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={busy || !url.trim() || !title.trim()}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
          {busy ? "Fetching page…" : "Add link"}
        </Button>
      </div>
      <FieldHint className="mt-0">The page is fetched once when you add it, and again only when you press Refresh. It is never fetched during email generation.</FieldHint>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

export function KnowledgeBase() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const polls = useRef(0);

  useEffect(() => {
    let cancelled = false;
    request<Overview>("/api/knowledge")
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load settings");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // While a regeneration runs in the background, poll until the new brief
  // lands, so the version shown is always the one being used.
  useEffect(() => {
    if (!overview?.briefStale || polls.current >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      polls.current += 1;
      setReloadKey((k) => k + 1);
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [overview]);

  function reload() {
    polls.current = 0;
    setReloadKey((k) => k + 1);
  }

  function upsert(item: Item) {
    setOverview((prev) => {
      if (!prev) return prev;
      const key = item.kind === "document" ? "documents" : "links";
      const list = prev[key];
      const next = list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item];
      return { ...prev, [key]: next };
    });
    reload();
  }

  function removeItem(id: string) {
    setOverview((prev) => prev && { ...prev, documents: prev.documents.filter((i) => i.id !== id), links: prev.links.filter((i) => i.id !== id) });
    reload();
  }

  if (error && !overview) {
    return (
      <div>
        <EmptyState
          icon={<AlertTriangle size={18} />}
          title="Couldn't load settings"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex h-40 items-center justify-center text-muted">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BriefCard overview={overview} onSaved={(brief) => setOverview({ ...overview, brief, briefStale: false })} />
      <FactsCard initial={overview.facts} onSaved={reload} />

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <UploadForm onAdded={upsert} />
        {overview.documents.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-muted-faint">
            No documents yet. Upload a company profile, product sheet, pricing, terms, privacy policy, or case studies.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.documents.map((item) => (
              <ItemRow key={`${item.id}-${item.updatedAt}`} item={item} onChanged={upsert} onRemoved={removeItem} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important links</CardTitle>
        </CardHeader>
        <LinkForm onAdded={upsert} />
        {overview.links.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-muted-faint">No links yet. Add your website, pricing page, or product pages.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.links.map((item) => (
              <ItemRow key={`${item.id}-${item.updatedAt}`} item={item} onChanged={upsert} onRemoved={removeItem} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
