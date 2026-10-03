# Agent Allowance — Full Deep Dive

Working name: **Agent Allowance** (alternatives: Leash, Pocket Money, Spendlock). Target: Arbitrum Open House Singapore, Promising Products track (AI agents, new financial primitives) and General track. Prepared 2026-10-03.

---

## 1. Product thesis

AI agents are now spending real money and nobody is enforcing limits where it matters. In 2026 alone: a Codex job spawned 826 child agents and burned $78,000; a LangChain loop ran 11 days and cost $47,000; an agent registering for a hobbyist network ran up $6,531 on AWS by retrying CloudFormation stacks. IDC found 96% of enterprises deploying agents overshot their AI cost estimates. Every post-mortem says the same thing: there was no per-agent budget ceiling and no enforcement point that could stop the next call.

Meanwhile the payment rails for agents have arrived on Arbitrum: Coinbase's x402 facilitator settles on Arbitrum, Offchain Labs published `arbitrum-mpp`, Stripe/Tempo's MPP added streaming sessions, ERC-8004 identity and reputation registries are live on Arbitrum mainnet, and ZeroDev's Kernel accounts give composable permissions (call policies, rate limits, gas policies) with passkeys and sponsored gas.

Everyone is building the agent's **wallet**. Nobody is building the **allowance**: a human-owned, policy-enforced pool of money that an agent can draw from only within rules the chain enforces, with a receipt for every cent, and a kill switch that works even if the agent is compromised.

The thesis in one line: **the agent decides when to pay; the chain decides whether it may.** Policy lives in a smart account, not in a prompt, a dashboard, or a vendor's database.

Why this is a _new financial primitive_ and not a wallet feature: an allowance is a three-party object (owner, delegate, merchant universe) with a budget curve over time, merchant eligibility rules tied to onchain identity, and a verifiable spend history that other parties (lenders, merchants, insurers) can read. That is closer to a corporate card program than a wallet, and it is composable in ways card programs are not.

## 2. Who it is for

**Primary (hackathon and first 12 months):** developers and small teams running autonomous agents (research agents, coding agents, data pipelines, procurement bots) that need to buy APIs, data, compute, and services from x402/MPP-enabled endpoints. They currently hand agents raw API keys and company cards and find out about problems from invoices.

**Secondary:** consumers connecting agents to money for the first time. Robinhood just launched Agentic Accounts and an Agentic Credit Card with spending limits; that is the market signal that ordinary people want "allowance"-shaped controls.

**Tertiary (platform):** agent frameworks and MCP servers that want a "connect money" button without becoming a payments company.

**Merchant side:** anyone selling to agents over HTTP (data vendors, inference providers, search APIs, scrapers, oracles) who wants to know the paying agent is identified, within budget, and will not charge back.

## 3. User story

Priya runs a competitive-intelligence agent for her three-person startup. It calls a news API, a company-filings API, and an LLM provider, all x402-enabled. Last month it looped on a parsing error and spent $900 in a night.

She opens Agent Allowance, signs in with a passkey, and creates an allowance called "Research bot":

- $60 per month, hard cap, refilled on the 1st
- Max $0.50 per call
- Max 120 calls per hour
- Only merchants tagged `data` or `inference` in the registry, plus two addresses she pastes in
- Expires in 90 days
- Notify me at 80% and freeze at 100%

She funds it with $60 USDC. The app gives her an environment variable and an MCP config block. She drops it into her agent. The agent now pays per request through x402/MPP with no gas, no approvals, no keys to leak that can move more than the policy allows.

At 3 a.m. the agent loops again. On the 121st call in that hour the chain rejects the payment. The agent gets a 402 it cannot satisfy, errors out, and Priya wakes up to a notification: "Research bot hit rate limit at 03:12, 118 calls, $41.20 spent, frozen until 04:00." She taps "Freeze all" anyway. Her total exposure was $60, and the receipts show exactly which merchant was hit in the loop.

Three weeks later, a data vendor she has never used accepts her agent's payment at a higher per-call limit because the agent's ERC-8004 identity shows 2,400 settled payments and zero disputes.

## 4. Exact UX flow

**Onboarding (60 seconds)**

1. Open app → "Continue with passkey" (ZeroDev passkey signer; no seed phrase).
2. Owner smart account is deployed lazily on first allowance creation (sponsored gas).
3. Fund: paste from an existing wallet, or pay USDC/USDG from any chain via a bridge widget. For the hackathon, testnet faucet.

**Create allowance (90 seconds)**

1. Name + purpose (free text; stored as metadata, shown on receipts).
2. Budget: amount, period (daily/weekly/monthly/one-shot), refill behavior, hard expiry.
3. Per-call cap. Rate limit (calls per window).
4. Merchant policy: (a) any x402/MPP merchant, (b) merchants with ERC-8004 identity and at least N settled payments, (c) merchants with specific tags, (d) explicit allowlist. Default is (b) + optional allowlist.
5. Alerts: thresholds and channels (email/Telegram/webhook).
6. Review → sign with passkey → allowance deployed.

**Connect an agent (30 seconds)**

1. Choose integration: environment variable (`AGENT_ALLOWANCE_URL` + session credential), MCP server block, LangChain/OpenAI Agents SDK tool, or raw HTTP proxy.
2. Copy. Done. The agent's HTTP client now auto-handles 402 challenges within policy.

**Watch (ongoing)**

- Live receipts feed: time, merchant (ERC-8004 name if registered), amount, what was purchased (from the challenge metadata), status, tx hash.
- Budget ring with projected exhaustion date.
- Anomaly chips: "spend rate 4x normal," "new merchant," "repeat purchase of same resource 30 times."

**Intervene (5 seconds)**

- Freeze allowance (revokes session key onchain in one sponsored tx).
- Freeze all.
- Raise or lower limits (new permission, old one revoked).
- Withdraw remainder.

**Merchant side**

- "Accept Agent Allowance payments": one line in their x402/MPP server config pointing at our facilitator, or nothing at all if they already use the Coinbase facilitator (see architecture path A).
- Merchant console: register ERC-8004 identity, set tags, see payer reputation, export receipts.

## 5. Main screens

1. **Allowances** — cards with name, agent, remaining budget ring, status (active / paused / frozen / expired), last activity.
2. **New allowance** — the policy builder with a live plain-English summary ("Up to $60/month, $0.50/call, 120 calls/hour, verified data and inference merchants only, expires Jan 1").
3. **Allowance detail** — receipts feed, spend chart, policy, agent identity, "Freeze" button always visible.
4. **Receipt** — single payment: merchant identity, resource description, amount, timestamps, tx hash, the policy checks that passed.
5. **Connect** — integration snippets per framework.
6. **Merchants** — directory of ERC-8004-registered merchants with tags and track record; add to allowlist.
7. **Merchant console** (separate route) — identity registration, tags, payer stats, settlement export.

## 6. Core technical architecture

### 6.1 Components

```
Owner (passkey) ──owns──> Owner Kernel account (ZeroDev)
                                │
                                ├── AllowanceVault (per allowance) holds USDC/USDG
                                │       enforces: budget per window, per-call cap,
                                │       rate limit, expiry, merchant policy, freeze
                                │
                                └── Session key (agent) with Kernel permission:
                                        CallPolicy: only AllowanceVault.pay(...)
                                        RateLimitPolicy, TimestampPolicy, GasPolicy

Agent HTTP client ── 402 challenge ──> Merchant (x402 or MPP server)
        │                                   ▲
        └── Allowance Payer SDK ──> Facilitator / Settler ── settles via vault.pay ──┘

ERC-8004 Identity + Reputation registries (Arbitrum mainnet, Robinhood Chain)
        ├── agent identity (NFT) bound to the session key
        └── merchant identity + feedback written after each settlement
```

### 6.2 Policy enforcement: two layers, on purpose

**Layer 1: Kernel permissions (ZeroDev).** The agent never holds the owner key. It holds a session key whose permission is `1 signer + policies + action`:

- Call policy: target = this allowance's vault, selector = `pay(address merchant, uint256 amount, bytes32 resourceHash, bytes merchantProof)`, parameter condition `amount <= perCallCap`.
- Rate limit policy: N UserOps per window.
- Timestamp policy: expiry.
- Gas policy: cap sponsored gas so a looping agent cannot drain the paymaster.

**Layer 2: AllowanceVault contract.** Kernel's built-in policies do per-call and per-window _counts_, not cumulative _token amounts_ across calls. The vault adds what Kernel lacks:

- Cumulative budget per period with rollover rules.
- Merchant policy evaluation: explicit allowlist, or `IdentityRegistry.ownerOf(agentId) == merchant` plus a minimum reputation score read from `ReputationRegistry`, plus optional tag match stored in our merchant metadata.
- Duplicate-resource guard: same `resourceHash` more than K times in a window is rejected (this is what catches the "re-bought the same dataset 30 times" loop).
- Frozen flag settable only by owner.
- Events: `Paid(allowanceId, merchant, amount, resourceHash, remaining)`, `Rejected(reason)`.

Both layers matter. If the vault has a bug, Kernel still caps calls and gas. If someone bypasses the session key (owner key compromise), the vault's per-period budget still holds for that allowance.

### 6.3 Settlement paths

**Path A: standard x402 merchants (no merchant changes).** Most x402 merchants use the Coinbase facilitator with the `exact` scheme, which expects an EIP-3009 `transferWithAuthorization` signed by the payer. A smart account can satisfy this via ERC-1271 (USDC v2.2+ supports contract signatures), but then enforcement would depend on the signature policy rather than the vault. Solution: the Allowance Payer runs a _micro-float_ model. The vault streams tiny prepaid tranches (for example $2 at a time, within policy) to a per-allowance EOA-like "spend key" account that signs EIP-3009 authorizations. Exposure is bounded by the tranche, the vault still enforces the cumulative budget on each refill, and every refill plus every settlement is in the receipts. This gets day-one compatibility with every existing x402 merchant on Arbitrum.

**Path B: Allowance-native (strong guarantees).** Our own facilitator accepts a signed payment intent from the agent's session key, submits a UserOp calling `vault.pay`, and the merchant receives USDC directly from the vault. Merchants opt in by pointing their x402/MPP server at our facilitator (one config line). This path gives true per-call onchain enforcement and lets us attach ERC-8004 feedback to the settlement.

**Path C: MPP via `arbitrum-mpp`.** MPP defines charge methods; we implement an `allowance` charge method on top of Offchain's reference server/client so MPP merchants get the same two options. MPP sessions (deposit then cumulative vouchers) map cleanly onto a vault sub-balance and are the right fit for streaming inference.

Build order for the hackathon: Path B first (it is the demo), Path A second (it is the distribution), Path C if time permits.

### 6.4 Identity and reputation (ERC-8004)

- Each allowance mints an agent identity in the `IdentityRegistry` (Arbitrum mainnet addresses: Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`; deploy equivalents on Robinhood Chain and testnets as needed). The identity's metadata points to the allowance's public policy summary and the owner's chosen disclosure level.
- After each settlement, the facilitator writes reputation feedback for the merchant (delivered / failed / disputed) and the merchant can write feedback for the agent (paid / stale). This is the first ERC-8004 use where the reputation changes what money can do: merchants can set higher per-call acceptance for agents above a score, and owners can restrict agents to merchants above a score.
- Validation registry hook: a third-party validator can attest "this allowance's policy matches its published summary," so a merchant can trust the budget claim without reading contracts.

### 6.5 Off-chain services (thin by design)

- Facilitator/settler (Node, uses viem + ZeroDev SDK + arbitrum-mpp): verifies challenges, builds UserOps, submits through the bundler, confirms settlement, writes receipts and reputation.
- Indexer: subscribes to vault events, serves the receipts feed.
- Alerts: threshold watcher, Telegram/email/webhook.
- Payer SDK: TypeScript first (fetch wrapper that handles 402 and `Payment` auth scheme), plus an MCP server that exposes `pay_for(url)` and `remaining_budget()` tools.

### 6.6 Chains

- Primary: **Arbitrum One** (USDC, ERC-8004 live, Coinbase facilitator live, arbitrum-mpp live).
- Also deploy on **Robinhood Chain** with USDG as the budget asset. This hits the reserved podium lane and demonstrates something Robinhood's own Agentic Accounts cannot: an onchain allowance that any third-party agent can use with any merchant.
- Testnet: Arbitrum Sepolia and Robinhood Chain testnet for the demo.

### 6.7 Security notes

- Session keys are scoped to one vault and one selector. A leaked session key can only call `pay` within policy.
- Freeze is a single owner UserOp that sets the vault flag and revokes the permission; both are idempotent.
- Oracle-free. The product has no price dependency, which removes a whole class of risk.
- Paymaster abuse is bounded by the Kernel gas policy per session key.
- The micro-float spend key in Path A is the weakest point; keep tranches small and make the tranche size part of the visible policy.

## 7. Ecosystem integrations

| Integration                           | Role                                                                               | Status                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| ZeroDev Kernel + passkeys + paymaster | Owner account, session keys, policies, sponsored gas                               | Live on Arbitrum One and Robinhood Chain |
| Coinbase x402 facilitator             | Day-one merchant compatibility (Path A)                                            | Live on Arbitrum                         |
| `arbitrum-mpp` (Offchain Labs)        | MPP charge method and reference server                                             | Live, open source                        |
| ERC-8004 registries                   | Agent and merchant identity, reputation, validation                                | Live on Arbitrum mainnet                 |
| USDC (EIP-3009, Permit2) and USDG     | Budget assets                                                                      | Live                                     |
| Robinhood Chain                       | Second deployment, USDG allowances                                                 | Live                                     |
| Alchemy AA infra                      | Alternative bundler/paymaster on Robinhood Chain                                   | Live                                     |
| Fhenix CoFHE (post Oct 21)            | Confidential budgets: hide remaining balance from merchants while proving solvency | Roadmap                                  |

## 8. Why judges may find it notable

- It answers the question every judge has personally felt in 2026: "what stops my agent from spending everything?"
- It is built almost entirely from primitives Arbitrum and Offchain Labs published this year, used together for the first time. That is the "we didn't realize our tech could be used like this" reaction.
- It makes ERC-8004 reputation _do_ something with money, which the Foundation's own ERC-8004 post asked for and nobody has shown.
- It has a visible failure demo. A blocked payment onstage is more memorable than a successful one.
- It fits the Promising Products definition exactly: AI agents plus a new financial primitive.
- Deploying on Robinhood Chain with USDG shows the sponsor's chain doing something Robinhood's own agentic product does not.

## 9. Business model

- **Per-allowance subscription** for teams (for example $9/month per active allowance above a free tier of one).
- **Settlement fee** on Path B/C volume (10 to 25 bps, below card interchange, above facilitator cost of ~$0.001/tx).
- **Merchant tier**: payer reputation data, higher-limit acceptance tooling, receipts export, dispute tooling.
- **Later**: float yield on idle allowance balances (USDG on Morpho on Robinhood Chain) shared with owners; underwriting data for agent credit (allowances become credit lines backed by reputation, which is where Bond.Credit-style lenders plug in).

## 10. Path from prototype to product

**Hackathon (now):** Path B end to end on Arbitrum Sepolia and Robinhood testnet, one demo merchant, one external x402 merchant via Path A, receipts, freeze, ERC-8004 feedback.

**Founder House (Oct 23–25):** mainnet on Arbitrum One with real USDC; TypeScript SDK and MCP server published; three design-partner teams running agents with allowances; a merchant directory seeded with 20 x402 endpoints.

**0–3 months:** Python SDK, LangChain/OpenAI Agents/Anthropic MCP integrations, Telegram alerts, team roles (finance sets budgets, engineers connect agents), CSV/accounting export. MPP sessions for inference streaming.

**3–9 months:** merchant acceptance program (reputation-gated limits), Robinhood Chain USDG allowances with yield on idle balances, Fhenix confidential budgets, policy templates marketplace (free, not a token).

**9–18 months:** allowance-backed credit (owners can request a line against reputation; lenders fund vaults), enterprise SSO and audit, card-rail bridge via MPP's multi-method support so the same policy governs stablecoin and card spend.

## 11. Acquisition and distribution mechanism

The loop has three legs and each one feeds the next:

1. **Developer installs** because they got burned or fear it. The install is an environment variable, so friction is near zero.
2. **Every payment touches a merchant.** The receipt shows the merchant whether the payer used Agent Allowance and offers "accept allowances natively for higher limits and reputation data." Merchants opt in to Path B.
3. **Merchants publish "Agent Allowance accepted"** which makes their endpoints discoverable in the directory, which brings more developers.

Side channels: a public post-mortem generator ("paste your runaway-agent bill, here is the policy that would have stopped it"), MCP server listing in agent registries, and the ERC-8004 directory itself as a discovery surface. Framework partnerships (one PR to an agent framework's examples repo is worth more than any ad).

How to reach 1,000 users without manual onboarding: publish the SDK and MCP server, get listed in two agent-framework docs, and let the receipts do the merchant marketing.

## 12. 30-second demo

Screen split: left is the agent's terminal, right is the Allowance app.

1. "This research agent has a $20 allowance, 50 cents per call, verified data merchants only." (3s)
2. Agent requests a $5 dataset. Terminal shows 402 → payment attempt → **REJECTED: exceeds per-call cap**. Right pane flashes a red rejected receipt. (8s)
3. Agent requests a $0.40 report. 402 → paid → content returned. Right pane shows a green receipt with merchant's ERC-8004 name, resource, amount, tx hash. (8s)
4. Simulated loop: agent fires 30 identical requests. Receipts scroll, then stop: **frozen: duplicate resource limit**. (7s)
5. Presenter taps "Freeze all." Agent's next call fails. "Total exposure: $20. Policy enforced by the chain, not the prompt." (4s)

## 13. 2-minute demo

0:00–0:30 as above.

0:30–0:50 Open the policy. Show the plain-English summary and the onchain permission (Kernel call policy) and vault parameters side by side. "The agent holds a key that can only call this function with this cap."

0:50–1:10 Switch to a merchant who did nothing special: a public x402 endpoint on Arbitrum using Coinbase's facilitator. The agent pays it through Path A. Show the micro-float tranche in the receipts. "Works with every x402 merchant today."

1:10–1:30 Merchant console: this merchant sees the agent's ERC-8004 identity, 212 settled payments, zero disputes, and raises its per-call acceptance for this agent. Agent buys a $1.50 item that a new agent could not. "Reputation changes what money can do."

1:30–1:50 Robinhood Chain: same product, USDG allowance, idle balance earning on Morpho. "Same policy, regulated dollar, the sponsor's chain."

1:50–2:00 Roadmap slide: MPP sessions for streaming inference, Fhenix confidential budgets, allowance-backed credit. Close on the exposure number.

## 14. What NOT to build during the hackathon

- Your own agent or any "AI" feature beyond a 20-line demo script.
- A marketplace or merchant discovery with search and ratings. A static directory is enough.
- A token, points, or governance.
- Multi-chain beyond Arbitrum One/Sepolia and Robinhood Chain.
- Card rails, fiat on-ramp, KYC.
- Full MPP sessions (streaming). Mention it, do not build it.
- Mobile apps. One responsive web app.
- Dispute resolution flows. Receipts and reputation feedback are enough.
- Fhenix integration (mainnet is Oct 21). Slide only.

## 15. Biggest weakness

**Crowding and platform risk from Coinbase.** Coinbase Agentic Wallets (February 2026) already offer per-session caps, per-transaction limits, gasless settlement on Base, and native x402. Skyfire, Crossmint, Payman, Nevermined, Locus, and Stripe's MPP all touch spend controls. A judge will ask: "Why not just use Coinbase's wallet?" and an investor will ask: "What stops Coinbase from adding merchant policies next quarter?"

Second weakness: the enforcement story is only fully true on Path B. On Path A (standard x402 merchants) exposure is bounded by the micro-float tranche, not per call. If the demo blurs this, a sharp judge will catch it.

## 16. How to strengthen that weakness

**Position as the allowance layer, not a wallet.** Agent Allowance is explicitly multi-wallet and multi-rail: the owner's money can sit in a ZeroDev account today and in other smart accounts tomorrow, and the policy object is portable. Coinbase's product is a wallet for Coinbase's ecosystem on Base; ours is a policy primitive on Arbitrum that any wallet, agent framework, or merchant can adopt. Say this in the first 20 seconds.

**Own three things competitors do not do:**

1. **Merchant-side policy via onchain identity.** Nobody gates agent spend by ERC-8004 identity and reputation. Make this the headline differentiator and demo it.
2. **Duplicate-resource and anomaly guards onchain.** Caps stop big mistakes; loops are made of small ones. Showing the loop being stopped is the moment.
3. **Reputation that changes limits.** The two-sided reputation loop (owner gates merchants, merchants gate agents) is a network effect Coinbase's single-wallet model does not have.

**Be honest about Path A onstage.** Say "bounded by a $2 tranche" out loud. Judges reward candor and the number is still impressive versus a company card.

**Pick Arbitrum-specific advantages and name them:** x402 and MPP both live, ERC-8004 registries live, Robinhood Chain with regulated USDG and a brokerage that just opened to agents, predictable fees after ArbOS Dia for sub-cent payments, and a Foundation that asked for exactly this in its ERC-8004 post.

**Convert platform risk into a partnership story.** If Coinbase adds merchant policies, their wallet becomes another account type our allowance can govern. Design the vault interface so it can be attached to any ERC-4337 account, and say so.

## 17. Adversarial judge pass (tired, 150 submissions in)

- _Have I seen this?_ Agent wallets, yes, five today. An allowance with onchain merchant policy and a loop-stopper, no.
- _What is actually novel?_ Policy enforced by Kernel permissions plus a vault, merchant eligibility from ERC-8004 reputation, duplicate-resource guard, and reputation that raises limits. Four concrete things.
- _Why does this require this sponsor?_ It is assembled from x402-on-Arbitrum, arbitrum-mpp, ERC-8004-on-Arbitrum, and ZeroDev-on-Robinhood-Chain. Move it elsewhere and two of four pieces vanish.
- _Product or demo?_ Product: install is an env var, there is a merchant side, there is a subscription.
- _Would anyone use it?_ Anyone who has read a $47,000 invoice. The demand is documented.
- _Can they prove it works?_ Yes, live, with a visible rejection.
- _What will I remember tomorrow?_ The red "REJECTED" receipt and "total exposure: $20."
- _Where is the magical moment?_ The loop stopping by itself at 3 a.m. without anyone awake.

**Modifications from this pass:** lead the pitch with the rejection, not the architecture; put the merchant-reputation gating in the first minute; state the Path A caveat before a judge finds it; show Robinhood Chain for 15 seconds, not two minutes.

## 18. Build plan (for a team of two to three, roughly 10 days of focused work)

| Day | Deliverable                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | AllowanceVault contract: budgets, caps, rate windows, allowlist, freeze, duplicate guard, events. Foundry tests.                                  |
| 2   | Kernel integration: owner passkey account, session key with call/rate/timestamp/gas policies scoped to `pay`. Deploy on Arbitrum Sepolia.         |
| 3   | Facilitator (Path B): verify intent, build UserOp, submit via bundler, confirm, write receipt. Demo merchant (x402 server using our facilitator). |
| 4   | Payer SDK (TypeScript fetch wrapper) + MCP server with `pay_for` and `remaining_budget`. Demo agent script including the loop.                    |
| 5   | Web app: passkey login, create allowance, connect snippets, receipts feed, freeze.                                                                |
| 6   | ERC-8004: mint agent identity per allowance, merchant identity registration, feedback writes, merchant-policy checks in vault.                    |
| 7   | Path A: micro-float spend key, tranche refills, EIP-3009 signing, test against a public x402 endpoint on Arbitrum via Coinbase facilitator.       |
| 8   | Robinhood Chain testnet deployment with USDG; alerts (Telegram); anomaly chips.                                                                   |
| 9   | Merchant console (minimal), reputation-gated limit demo, polish, metrics.                                                                         |
| 10  | Demo rehearsal, video, README with architecture diagram, honest limitations section.                                                              |

Stretch: MPP `allowance` charge method on `arbitrum-mpp`; Morpho yield on idle USDG; validation-registry attestation of policy summary.

## 19. Metrics to show at Founder House

- Allowances created, agents connected, merchants accepting (Path A vs B).
- Payments settled, rejections by reason (this chart is the product).
- Dollars of exposure prevented (sum of rejected amounts plus estimated loop damage).
- Median time from install to first payment (target under 10 minutes).
- Reputation events written to ERC-8004.

## 20. One-paragraph pitch

Agents are spending real money and the only thing standing between a looping agent and a $47,000 invoice is a prompt. Agent Allowance gives any AI agent a budget the chain enforces: caps, rate limits, verified merchants, loop detection, receipts for every cent, and a kill switch that works even if the agent is compromised. It is built on Arbitrum from x402, MPP, ERC-8004, and ZeroDev, works today with every x402 merchant, and is the first product where an agent's onchain reputation changes how much it is allowed to spend. The agent decides when to pay. The chain decides whether it may.
