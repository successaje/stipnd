"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, Store, WalletCards } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { Pill } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { appConfig } from "@/lib/config";

const NAV = [
  {
    href: "/app",
    label: "Stipends",
    icon: WalletCards,
    match: (p: string) => p === "/app" || p.startsWith("/app/s") || p === "/app/new",
  },
  {
    href: "/app/merchants",
    label: "Merchants",
    icon: Store,
    match: (p: string) => p.startsWith("/app/merchants"),
  },
  {
    href: "/app/account",
    label: "Account",
    icon: CircleUserRound,
    match: (p: string) => p.startsWith("/app/account"),
  },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-ink" aria-label="Stipnd home">
              <Wordmark />
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="App">
              {NAV.map((n) => {
                const active = n.match(pathname);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                      active ? "text-ink" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    {n.label}
                    {active && (
                      <span
                        className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-ink"
                        aria-hidden
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Pill tone={appConfig.testnet ? "warn" : "neutral"} dot>
            {appConfig.chainLabel}
          </Pill>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-12">
        {children}
      </main>

      {/* Mobile navigation: thumb reach, 3 destinations. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur md:hidden"
        aria-label="App"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-3">
          {NAV.map((n) => {
            const active = n.match(pathname);
            const Icon = n.icon;
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    active ? "text-ink" : "text-ink-3",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: "/app" | "/app/merchants"; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-ink-3 hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3 sm:text-[15px]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
