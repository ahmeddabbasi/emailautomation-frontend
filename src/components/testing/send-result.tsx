"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "checking" | "delivered" | "failed" | "accepted" | "unknown";

const POLL_DELAY_MS = 8000;

// Mailgun's API only confirms it ACCEPTED the message — actual delivery is
// async and can still fail afterward (bounce, ESP block), invisible unless
// something checks back. This polls the real Events API once, a few
// seconds after send, so the Testing tab never implies "delivered" when all
// that happened is "accepted".
//
// Callers key this on providerMessageId so a new send remounts it fresh
// instead of needing to reset state from inside the effect.
export function SendResult({ to, providerMessageId }: { to: string; providerMessageId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/testing/delivery-status?messageId=${encodeURIComponent(providerMessageId)}&to=${encodeURIComponent(to)}`
        );
        const data = await res.json();
        if (cancelled) return;
        setStatus((data.status as Status) ?? "unknown");
        setReason(data.reason ?? null);
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    }, POLL_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [to, providerMessageId]);

  return (
    <div className="space-y-1 text-[12.5px]">
      <p className="flex items-center gap-1.5 text-success">
        <CheckCircle2 size={13} /> Accepted by Mailgun. Message ID: {providerMessageId}
      </p>
      {status === "checking" && (
        <p className="flex items-center gap-1.5 text-muted-faint">
          <Loader2 size={12} className="animate-spin" /> Checking delivery status…
        </p>
      )}
      {status === "delivered" && (
        <p className="flex items-center gap-1.5 text-success">
          <CheckCircle2 size={13} /> Delivered
        </p>
      )}
      {status === "failed" && (
        <p className="flex items-start gap-1.5 text-danger">
          <XCircle size={13} className="mt-0.5 shrink-0" /> Delivery failed: {reason ?? "unknown reason"}
        </p>
      )}
      {(status === "accepted" || status === "unknown") && (
        <p className="text-muted-faint">Delivery not confirmed yet. Check the Mailgun dashboard for this message ID.</p>
      )}
    </div>
  );
}
