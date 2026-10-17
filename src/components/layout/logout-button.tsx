"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // replace, so Back doesn't return to an authenticated page; refresh
      // drops the client router's cached pages along with the session.
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="outline" size="sm" className="w-full" onClick={handleLogout} disabled={pending}>
      {pending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
      Log out
    </Button>
  );
}
