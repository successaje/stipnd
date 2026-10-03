import * as React from "react";
import { cn } from "@/lib/cn";

/** Every empty state says why it is empty, whether that is normal, and what to do next. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 px-5 py-10 sm:px-8", className)}>
      {icon && (
        <div className="flex size-9 items-center justify-center rounded-md border border-line bg-paper-2 text-ink-2">
          {icon}
        </div>
      )}
      <div className="max-w-md">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-3">{description}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
