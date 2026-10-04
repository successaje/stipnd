import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/landing/code-block";
import { ReceiptDemo } from "@/components/landing/receipt-demo";
import { SiteHeader } from "@/components/landing/site-header";
import { Wordmark } from "@/components/ui/wordmark";
import { site } from "@/lib/site";

const AGENT_SNIPPET = `
import { createStipndClient } from "@stipnd/sdk";

const stipnd = createStipndClient({
  credential: process.env.STIPND_CREDENTIAL,
});

// Any 402 from a Stipnd merchant is paid from the stipend,
// within policy, and retried with proof. Nothing else changes.
const res = await stipnd.fetch("https://filings.example/reports/42");
`;

const MERCHANT_SNIPPET = `
app.get(
  "/reports/:id",
  stipndPaywall(deps, { price: usd("0.40"), description: "Report" }),
  (c) => c.json(report(c.req.param("id"))),
);
`;

const POLICY = [
  ["Period budget", "$60 every 30 days, refills itself"],
  ["Per-call cap", "No single payment above $0.50"],
  ["Rate limit", "At most 120 payments per hour"],
  ["Loop guard", "Same resource at most 3 times per hour"],
  ["Merchant policy", "Any, an allowlist, or verified merchants with a track record"],
  ["Expiry and freeze", "Hard end date; the owner can freeze in one tap"],
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="animate-rise">
            <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">
              Budgets for AI agents
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[56px]">
              Give your agent a budget it can&apos;t argue with.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-7 text-ink-2">
              A stipend is a fixed sum, for a stated purpose, with caps, a rate limit and a loop
              guard. The agent decides when to pay. The chain decides whether it may. Every attempt,
              paid or refused, is a receipt you can read.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/app/new">
                <Button size="lg" trailing={<ArrowRight className="size-4" />}>
                  Create a stipend
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="secondary">
                  See how it works
                </Button>
              </a>
            </div>
            <p className="mt-5 text-sm text-ink-3">
              Arbitrum · sponsored gas · no seed phrase. Sign in with a passkey.
            </p>
          </div>
          <div className="animate-rise [animation-delay:120ms]">
            <ReceiptDemo />
          </div>
        </section>

        {/* The problem, briefly */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The only thing between a looping agent and your bank account is a sentence in a
              prompt.
            </h2>
            <div className="space-y-4 text-[15px] leading-7 text-ink-2">
              <p>
                Agents buy APIs, data and compute over HTTP. They also retry, fork, and loop. The
                post-mortems from 2026 all say the same thing: there was no per-agent ceiling and no
                enforcement point that could stop the next call.
              </p>
              <p>
                Stipnd moves the ceiling out of the prompt and into a contract the agent cannot
                change. The owner holds the money. The agent holds a key that can do exactly one
                thing: ask the stipend to pay, within its rules.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Three steps. One line in the agent.
              </h2>
              <ol className="mt-8 space-y-7">
                {[
                  {
                    n: "1",
                    t: "Create a stipend",
                    d: "Name it, state its purpose, set the budget and the rules. Sign once with a passkey. Funds sit in a contract you own.",
                  },
                  {
                    n: "2",
                    t: "Connect the agent",
                    d: "Copy one credential into your agent's environment. It is a key scoped to a single function on a single stipend, not a wallet.",
                  },
                  {
                    n: "3",
                    t: "Read the receipts",
                    d: "Every purchase and every refusal shows up with the merchant, the resource, and the reason. Freeze in one tap.",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs text-ink-2">
                      {s.n}
                    </span>
                    <div>
                      <h3 className="font-semibold">{s.t}</h3>
                      <p className="mt-1 text-[15px] leading-6 text-ink-2">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-4">
              <CodeBlock title="agent.ts" code={AGENT_SNIPPET} />
              <p className="text-sm leading-6 text-ink-3">
                Works with any Stipnd merchant and any HTTP client that can wrap{" "}
                <code className="font-mono text-ink-2">fetch</code>. The SDK validates the
                merchant&apos;s challenge against the credential, pays through the stipend, and
                retries with proof. If the stipend refuses, the agent gets a typed error and stops
                after three refusals in a row.
              </p>
            </div>
          </div>
        </section>

        {/* Policy */}
        <section id="policy" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  What the chain enforces
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-ink-2">
                  Two layers, on purpose. The agent&apos;s key is restricted by the smart account to
                  one function with a parameter cap. The stipend contract independently checks
                  budget, rate, duplicates, merchant policy, expiry and freeze on every call. If
                  either has a bug, the other still bounds exposure.
                </p>
                <p className="mt-4 text-[15px] leading-7 text-ink-2">
                  A refused payment does not revert. It emits a receipt with the reason, so the
                  owner sees the loop being stopped, not an empty log.
                </p>
              </div>
              <dl className="divide-y divide-line rounded-lg border border-line">
                {POLICY.map(([k, v]) => (
                  <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
                    <dt className="text-sm font-medium text-ink">{k}</dt>
                    <dd className="text-sm text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Merchants */}
        <section id="merchants" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                For merchants: one middleware
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-ink-2">
                Answer <span className="font-mono text-ink">402</span> with a challenge; serve when
                the proof checks out. Verification reads the payment event from the chain: right
                merchant, right resource, enough money, recent, redeemed once. No account with us,
                no webhook, no database.
              </p>
              <p className="mt-4 text-[15px] leading-7 text-ink-2">
                Register in the merchant directory to become <em>verified</em>, and owners can route
                stipends to you with a required track record. Reputation changes what money can do.
              </p>
              <Link
                href="/app/merchants"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline"
              >
                Browse the merchant directory <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <CodeBlock title="merchant.ts" code={MERCHANT_SNIPPET} />
          </div>
        </section>

        {/* Built on */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-ink-3">Built on</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "Arbitrum",
                  "Predictable, cheap fees make per-call enforcement affordable. Deployed on Arbitrum Sepolia; Robinhood Chain next.",
                ],
                [
                  "ZeroDev Kernel",
                  "Passkey-owned smart accounts, session keys with call, gas and time policies, sponsored gas.",
                ],
                [
                  "HTTP 402",
                  "x402-style challenges in a Stipnd scheme that keeps enforcement in the contract, not in a signature.",
                ],
                [
                  "ERC-8004",
                  "Merchant identity. Verified merchants hold an agent identity; owners can require it.",
                ],
              ].map(([t, d]) => (
                <div key={t}>
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-2">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Wordmark className="text-ink" />
          <div className="flex items-center gap-5">
            <a href={site.repo} className="hover:text-ink" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <Link href="/app" className="hover:text-ink">
              App
            </Link>
            <Link href="/app/merchants" className="hover:text-ink">
              Merchants
            </Link>
          </div>
          <p>Built for Arbitrum Open House Singapore.</p>
        </div>
      </footer>
    </div>
  );
}
