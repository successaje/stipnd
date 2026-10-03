import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-ink" aria-label="Stipnd home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex" aria-label="Primary">
          <a href="#how" className="hover:text-ink">
            How it works
          </a>
          <a href="#policy" className="hover:text-ink">
            What the chain enforces
          </a>
          <a href="#merchants" className="hover:text-ink">
            For merchants
          </a>
          <a
            href={site.repo}
            className="inline-flex items-center gap-1 hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight className="size-3.5" />
          </a>
        </nav>
        <Link href="/app">
          <Button size="sm">Open app</Button>
        </Link>
      </div>
    </header>
  );
}
