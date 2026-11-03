import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  simTarget,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  simTarget?: string;
}) {
  return (
    <div className="flex items-start justify-between border-b border-border px-6 py-5">
      <div>
        <h1 data-sim-target={simTarget} className="text-[18px] font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
