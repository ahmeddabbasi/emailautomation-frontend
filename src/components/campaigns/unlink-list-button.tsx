"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UnlinkListButton({ listId }: { listId: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch(`/api/lead-lists/${listId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: null }),
        });
        router.refresh();
      }}
    >
      Unlink
    </Button>
  );
}
