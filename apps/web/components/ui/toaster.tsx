"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      offset={20}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm text-ink shadow-pop",
          title: "font-medium",
          description: "text-ink-3 mt-0.5",
          success: "border-money/30",
          error: "border-refuse/30",
          actionButton: "ml-auto rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-paper",
        },
      }}
    />
  );
}
