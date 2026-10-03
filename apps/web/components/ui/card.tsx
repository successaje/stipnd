import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" | "li" }) {
  return (
    <Tag className={cn("rounded-lg border border-line bg-surface", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-6 text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-5", className)} {...props} />;
}

/** Key/value rows with a hairline between them. */
export function DefinitionList({
  items,
  className,
}: {
  items: Array<{ term: React.ReactNode; detail: React.ReactNode; mono?: boolean }>;
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
          <dt className="text-ink-3">{it.term}</dt>
          <dd className={cn("text-right text-ink", it.mono && "font-mono tabular text-[13px]")}>
            {it.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
