import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-8 appearance-none rounded-md border border-border bg-surface-raised pl-3 pr-7 text-[12.5px] font-medium text-fg outline-none focus:border-border-strong focus:ring-1 focus:ring-accent/40",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-faint"
      />
    </div>
  )
);
Select.displayName = "Select";
