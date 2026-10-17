"use client";

import { useRef, useState, DragEvent } from "react";
import { UploadCloud, ArrowRight, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ContactSource } from "@/lib/types";
import { CSV_PREVIEW_ROWS, rejectedToCsv } from "@/lib/import-limits";
import { cn } from "@/lib/utils";

type Step = "idle" | "loading" | "mapping" | "validating" | "review" | "committing" | "summary";
type MappingKey = "name" | "first_name" | "last_name" | "email" | "company" | "title" | "bio";

const EMPTY_MAPPING: Record<MappingKey, string | null> = {
  name: null,
  first_name: null,
  last_name: null,
  email: null,
  company: null,
  title: null,
  bio: null,
};

const TARGETS: { key: MappingKey; label: string; required: boolean }[] = [
  { key: "email", label: "Email", required: true },
  { key: "first_name", label: "First name", required: false },
  { key: "last_name", label: "Last name", required: false },
  { key: "name", label: "Full name", required: false },
  { key: "company", label: "Company", required: false },
  { key: "title", label: "Title", required: false },
  { key: "bio", label: "Bio", required: false },
];

interface PreviewResponse {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
  previewRows?: Record<string, string>[];
  guessedMapping: Record<MappingKey, string | null>;
}

interface CommitResponse {
  inserted: number;
  duplicates: number;
  rejected: { row: Record<string, string>; reason: string }[];
}

export function CsvUploadFlow({
  leadListId,
  source,
  onImported,
}: {
  leadListId: string;
  source: ContactSource;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<MappingKey, string | null>>(EMPTY_MAPPING);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setStep("loading");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/leads/preview", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to parse CSV");
      setPreview(data);
      setMapping(data.guessedMapping);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setStep("idle");
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files?.[0]);
  }

  async function submit(dryRun: boolean) {
    if (!preview) return;
    const returnTo = dryRun ? "mapping" : "review";
    setStep(dryRun ? "validating" : "committing");
    setError(null);
    try {
      const res = await fetch("/api/leads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadListId, source, mapping, rows: preview.rows, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to import contacts");
      if (!dryRun && data.jobId) {
        let current = data;
        while (!current.done) {
          const tick = await fetch(`/api/leads/imports/${data.jobId}`, { method: "POST" });
          current = await tick.json();
          if (!tick.ok) throw new Error(current.error ?? "Import failed");
        }
        setResult({
          inserted: current.imported,
          duplicates: current.duplicates,
          rejected: current.invalidRows ?? [],
        });
        setStep("summary");
        if (current.imported > 0) onImported();
        return;
      }
      setResult(data);
      setStep(dryRun ? "review" : "summary");
      if (!dryRun && data.inserted > 0) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import contacts");
      setStep(returnTo);
    }
  }

  function reset() {
    setStep("idle");
    setPreview(null);
    setResult(null);
    setError(null);
  }

  if (step === "idle" || step === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => step === "idle" && inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-10 text-center transition-colors",
              dragging ? "border-accent bg-accent-muted/40" : "border-border hover:border-border-strong"
            )}
          >
            {step === "loading" ? (
              <>
                <Loader2 size={22} className="animate-spin text-muted-faint" />
                <p className="text-[13.5px] font-medium text-fg">Parsing file…</p>
              </>
            ) : (
              <>
                <UploadCloud size={22} className="text-muted-faint" />
                <p className="text-[13.5px] font-medium text-fg">
                  Drop a CSV, or <span className="text-accent">browse</span>
                </p>
                <p className="text-[12px] text-muted-faint">
                  From Apollo or built by hand. Column names don&apos;t need to match.
                </p>
                <a
                  href="/sample-leads.csv"
                  onClick={(e) => e.stopPropagation()}
                  download
                  className="mt-1 text-[12px] font-medium text-accent hover:underline"
                >
                  Download a sample CSV
                </a>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
          </div>
          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if ((step === "mapping" || step === "validating") && preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Map columns: {preview.filename}</CardTitle>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw size={13} /> Start over
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-[12px] text-muted">
            Unmapped columns are stored as custom fields. Showing the first {CSV_PREVIEW_ROWS} rows.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TARGETS.map((t) => (
              <div key={t.key}>
                <label className="mb-1.5 block text-[12px] font-medium text-fg">
                  {t.label}
                  {t.required && <span className="text-danger"> *</span>}
                </label>
                <Select
                  value={mapping[t.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [t.key]: e.target.value || null }))
                  }
                  className="w-full"
                >
                  <option value="">Don&apos;t import</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-[11px] uppercase tracking-wide text-muted-faint">
                  {preview.headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(preview.previewRows ?? preview.rows).slice(0, CSV_PREVIEW_ROWS).map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-muted">
                        {row[h] || <span className="text-muted-faint">Empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > CSV_PREVIEW_ROWS && (
            <p className="text-[11.5px] text-muted-faint">
              +{preview.rows.length - CSV_PREVIEW_ROWS} more rows in this file
            </p>
          )}

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              disabled={!mapping.email || step === "validating"}
              onClick={() => submit(true)}
            >
              {step === "validating" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  Preview import <ArrowRight size={14} />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const reviewing = step === "review" || step === "committing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {reviewing ? "Review import" : "Import summary"}: {preview?.filename}
        </CardTitle>
        {reviewing ? (
          <Button variant="ghost" size="sm" disabled={step === "committing"} onClick={() => setStep("mapping")}>
            Back to mapping
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw size={13} /> Upload another
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex flex-1 items-center gap-2.5 rounded-md border border-border bg-success-muted/40 px-3.5 py-3">
            <CheckCircle2 size={16} className="text-success" />
            <div>
              <p className="text-[15px] font-semibold text-fg">
                {result.inserted} {reviewing ? "will be added" : "added"}
              </p>
              <p className="text-[11.5px] text-muted-faint">Queued for generation</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2.5 rounded-md border border-border bg-surface-hover px-3.5 py-3">
            <CheckCircle2 size={16} className="text-muted" />
            <div>
              <p className="text-[15px] font-semibold text-fg">{result.duplicates}</p>
              <p className="text-[11.5px] text-muted-faint">Already in this list</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2.5 rounded-md border border-border bg-warning-muted/40 px-3.5 py-3">
            <AlertTriangle size={16} className="text-warning" />
            <div>
              <p className="text-[15px] font-semibold text-fg">{result.rejected.length} rejected</p>
              <p className="text-[11.5px] text-muted-faint">Won&apos;t be imported</p>
            </div>
          </div>
        </div>

        {result.rejected.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const blob = new Blob([rejectedToCsv(result.rejected)], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "invalid-rows.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download invalid rows
            </Button>
          </div>
        )}

        {result.rejected.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-[11px] uppercase tracking-wide text-muted-faint">
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.rejected.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-muted">{Object.values(r.row).join(", ")}</td>
                    <td className="px-3 py-2 text-danger">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="text-[12px] text-danger">{error}</p>}

        {reviewing && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              disabled={result.inserted === 0 || step === "committing"}
              onClick={() => submit(false)}
            >
              {step === "committing" && <Loader2 size={14} className="animate-spin" />}
              Add {result.inserted} contact{result.inserted === 1 ? "" : "s"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
