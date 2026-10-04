"use client";

import { useAccount } from "@/lib/account/provider";
import { useMounted } from "@/lib/use-mounted";
import { AppShell } from "./app-shell";
import { SignIn } from "./sign-in";
import { Unconfigured } from "./unconfigured";
import { Skeleton } from "@/components/ui/skeleton";

function RestoringSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6" aria-busy>
      <Skeleton className="mb-8 h-8 w-40" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

/** Decides what the /app tree renders: config notice, restoring, sign-in, or the shell. */
export function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useAccount();
  const mounted = useMounted();
  // Server and first client paint always agree on this skeleton; session state is only
  // known in the browser.
  if (!mounted || status === "restoring") return <RestoringSkeleton />;
  if (status === "unconfigured") return <Unconfigured />;
  if (status === "signed-out" || status === "connecting") return <SignIn />;
  return <AppShell>{children}</AppShell>;
}
