"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideAction {
  title: string;
  detail: string;
  href: string;
  label: string;
}

interface GuideStep {
  id: string;
  title: string;
  detail: string;
  href: string;
  state: "done" | "now" | "later";
}

interface GuideTip {
  title: string;
  detail: string;
}

interface GuidePayload {
  readyToSend: boolean;
  headline: string;
  next: GuideAction | null;
  steps: GuideStep[];
  tips: GuideTip[];
}

function useGuide() {
  const [guide, setGuide] = useState<GuidePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/guide")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GuidePayload | null) => {
        if (!cancelled) setGuide(data);
      })
      .catch(() => {
        if (!cancelled) setGuide(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return guide;
}

export function GuideBar() {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;
  return <GuideBarLoaded />;
}

function GuideBarLoaded() {
  const guide = useGuide();
  if (!guide?.next) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-2.5">
      <p className="min-w-0 text-[13px] text-fg">
        <span className="font-medium">Next. </span>
        <span className="text-muted">{guide.next.title}. {guide.next.detail}</span>
      </p>
      <Link href={guide.next.href} className="inline-flex h-7 shrink-0 items-center rounded-md bg-accent px-2.5 text-[12.5px] font-medium text-accent-fg">
        {guide.next.label}
      </Link>
    </div>
  );
}

export function GuideNavigator() {
  const guide = useGuide();
  if (!guide) return null;
  const current = guide.steps.find((step) => step.state === "now");

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-semibold text-fg">{guide.readyToSend ? "Ready to send" : "Do this next"}</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">{current?.detail}</p>
        </div>
        {guide.next && (
          <Link href={guide.next.href} className="inline-flex h-7 shrink-0 items-center rounded-md bg-accent px-2.5 text-[12.5px] font-medium text-accent-fg">
            {guide.next.label}
          </Link>
        )}
      </div>
      <ol className="grid gap-0 md:grid-cols-2">
        {guide.steps.map((step, index) => (
          <li key={step.id} className="border-t border-border px-4 py-2.5 md:[&:nth-child(-n+2)]:border-t-0">
            <Link href={step.href} className="flex items-start gap-2">
              {step.state === "done" ? (
                <Check size={14} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <Circle size={14} className={cn("mt-0.5 shrink-0", step.state === "now" ? "text-accent" : "text-muted-faint")} />
              )}
              <span>
                <span className={cn("block text-[13px]", step.state === "later" ? "text-muted" : "font-medium text-fg")}>
                  {index + 1}. {step.title}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 border-t border-border px-4 py-3 md:grid-cols-3">
        {guide.tips.map((tip) => (
          <div key={tip.title}>
            <p className="text-[12.5px] font-medium text-fg">{tip.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{tip.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
