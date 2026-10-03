"use client";

import * as React from "react";
import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  size = "md",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-xl" };
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-fade" />
      <RD.Content
        className={cn(
          "fixed z-50 flex w-full flex-col bg-surface shadow-pop focus:outline-none",
          // Bottom sheet on phones, centered card on larger screens.
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg",
          "data-[state=open]:animate-rise",
          widths[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div>
            <RD.Title className="text-base font-semibold text-ink">{title}</RD.Title>
            {description ? (
              <RD.Description className="mt-1 text-sm text-ink-3">{description}</RD.Description>
            ) : (
              <RD.Description className="sr-only">{title}</RD.Description>
            )}
          </div>
          <RD.Close
            className="-mr-1.5 -mt-1.5 flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </RD.Close>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
      </RD.Content>
    </RD.Portal>
  );
}
