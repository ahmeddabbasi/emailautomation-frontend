"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked);
      }}
      className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-surface-hover border border-border"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </span>
      {label && <span className="whitespace-nowrap text-[13px] font-medium text-fg">{label}</span>}
    </button>
  );
}
