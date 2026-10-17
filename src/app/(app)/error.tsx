"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { reportClientError } from "@/lib/client-log";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError({
      code: "PAGE_RENDER_FAILED",
      message: error.message || "A page failed to render",
      stack: error.stack,
      details: { digest: error.digest ?? null },
    });
  }, [error]);

  return (
    <div className="px-6 py-10">
      <EmptyState
        icon={<AlertTriangle size={18} />}
        title="This page couldn't load"
        description="The error has been recorded in Error Logs. Try again, and if it keeps happening check the log entry for details."
        action={
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw size={13} /> Try again
          </Button>
        }
      />
    </div>
  );
}
