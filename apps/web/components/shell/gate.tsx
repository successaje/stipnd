"use client";

import { useAccount } from "@/lib/account/provider";
import { AppShell } from "./app-shell";
import { SignIn } from "./sign-in";
import { Unconfigured } from "./unconfigured";
import { Skeleton } from "@/components/ui/skeleton";

/** Decides what the /app tree renders: config notice, restoring, sign-in, or the shell. */
export function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useAccount();
  if (status === "unconfigured") return <Unconfigured />;
  if (status === "restoring") {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6" aria-busy>
        <Skeleton className="mb-8 h-8 w-40" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (status === "signed-out" || status === "connecting") return <SignIn />;
  return <AppShell>{children}</AppShell>;
}
