import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-accent">
        <span className="h-2.5 w-2.5 bg-accent-fg" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-fg">
        Email
        <span className="ml-1 font-normal text-muted">Automation</span>
      </span>
    </div>
  );
}
