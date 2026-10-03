# Stipnd

**Budgets for AI agents that the chain enforces.**

An agent gets a _stipend_: a fixed sum of USDC, for a stated purpose, refilled on a schedule, with a per-call cap, a rate limit, a loop guard, and a merchant policy. The agent decides when to pay. The chain decides whether it may. Every attempt, paid or refused, is a receipt the owner can read.

Built for Arbitrum Open House Singapore on Arbitrum Sepolia with ZeroDev smart accounts, HTTP 402 payments, and the Stipnd merchant registry (ERC-8004 ready).

- Live contracts: see [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md)
- Product model: [docs/PRODUCT.md](docs/PRODUCT.md) · Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Build log: [docs/BUILD_LOG.md](docs/BUILD_LOG.md)

## The problem

Agents buy APIs, data and compute over HTTP, and they retry, fork and loop. The 2026 post-mortems read the same: a Codex job spawned 826 child agents and burned $78,000; a LangChain loop ran for 11 days and cost $47,000. In every case there was no per-agent ceiling and no enforcement point that could stop the next call. The only thing between a looping agent and a bank account was a sentence in a prompt.

## What Stipnd does

1. **The owner creates a stipend** with a passkey: name, purpose, budget per period, per-call cap, rate limit, loop guard, merchant policy, expiry. Funds move into a contract the owner controls. One signature, sponsored gas.
2. **The agent gets a credential**, not a wallet: a session key that the owner's smart account restricts to one function, `StipendHub.pay(stipendId, …, amount ≤ cap, …)`, with sponsored gas only. The credential goes into the agent's environment and the SDK's `fetch` pays Stipnd `402` challenges automatically.
3. **The hub enforces the rules on every call**, independently of the key: period budget, per-call cap, rate window, duplicate-resource guard, merchant mode, expiry, freeze. A refused payment does not revert. It emits `PaymentRejected` with the reason, so the owner sees the loop being stopped.
4. **Merchants** answer `402` with a challenge and verify the `Paid` event onchain before serving. No account with Stipnd, no webhook, no database. Registered merchants build a settlement track record the hub maintains, and owners can require it.

## How a payment works

```
agent  ── GET /reports/42 ─────────────▶  merchant
agent  ◀── 402 {scheme: stipnd, amount, resourceHash, …} ──  merchant
agent  ── pay(stipendId, merchant, amount, resourceHash) via session key ──▶ StipendHub
                                                  │  checks policy, transfers, emits Paid
agent  ── GET /reports/42  Authorization: Payment stipnd <proof> ──▶ merchant
                                                  │  reads the Paid log, checks merchant/resource/amount/age/redeemed-once
agent  ◀── 200 the report ──────────────  merchant
```

Resource identity is `keccak256("METHOD origin+path+query")`, computed by both sides. Proofs are redeemed once.

## Two enforcement layers

| Layer                                | Where                         | What it bounds                                                                                            |
| ------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Kernel permission on the session key | Owner's ZeroDev smart account | Only `pay` on one stipend id with `amount ≤ cap`, only with sponsored gas, optional rate limit and expiry |
| `StipendHub` policy                  | Contract                      | Period budget, per-call cap, rate window, duplicate guard, merchant policy, expiry, freeze                |

If either has a bug, the other still bounds exposure. The owner's freeze stops every credential at once; revoking removes one key for good.

## Repository

| Path                 | What                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/contracts` | `StipendHub`, `MerchantRegistry`, mocks, deploy scripts, 28 Foundry tests                               |
| `packages/protocol`  | Shared types, ABIs, chain and deployment registry, challenge/proof/credential formats                   |
| `packages/sdk`       | Agent client (`createStipndClient`), Kernel submitter, receipt decoding, owner-side credential issuance |
| `apps/web`           | Owner app (passkeys, stipends, receipts, credentials, controls), merchant directory, landing            |
| `apps/merchant`      | Reference paid API (Hono) with `stipndPaywall` middleware and a registration script                     |
| `apps/agent`         | Demo agent: normal, over-cap, loop and status modes                                                     |
| `docs`               | Product, architecture, deployments, research                                                            |

## Sponsor technology, exactly

- **Arbitrum Sepolia**: all contracts and every payment. Predictable, cheap fees make per-call enforcement affordable. `packages/protocol/src/deployments.ts` holds the addresses.
- **ZeroDev Kernel v3.1**: owner accounts with passkey validators (`apps/web/lib/account/signers.ts`), sponsored gas through the ZeroDev paymaster (`apps/web/lib/clients.ts`), session keys built from call, gas, rate-limit and timestamp policies (`packages/sdk/src/owner/policies.ts`), serialized permission accounts as credentials (`packages/sdk/src/owner/issue.ts`), revocation by `uninstallPlugin` (`apps/web/components/stipend/detail/connect-tab.tsx`).
- **HTTP 402**: x402-style challenge in a `stipnd` scheme (`packages/protocol/src/challenge.ts`) that keeps enforcement in the contract rather than a signature. Merchant middleware in `apps/merchant/src/middleware.ts`.
- **ERC-8004**: `MerchantRegistry` accepts an IdentityRegistry address and treats a merchant as verified only when it holds an agent identity (`packages/contracts/src/MerchantRegistry.sol`). The Sepolia deployment currently runs with the identity requirement disabled; enabling it is a one-call owner setting.

## Running it locally

Prerequisites: Node 22+, pnpm 12, Foundry.

```bash
pnpm install
pnpm test:contracts     # Foundry
pnpm test               # protocol, sdk, merchant, web unit tests
```

Copy `.env.example` to `.env` (merchant and agent) and `apps/web/.env.local` (web). Against Arbitrum Sepolia the only required value for the web app is a ZeroDev project id:

```
NEXT_PUBLIC_ZERODEV_PROJECT_ID=...
```

Contract addresses default to the known deployment. Then:

```bash
pnpm dev                # owner app on http://localhost:3000
pnpm dev:merchant       # reference merchant on http://localhost:4020 (needs MERCHANT_ADDRESS)
```

Create a stipend in the app, open its **Connect** tab, issue a credential, and run the demo agent:

```bash
STIPND_CREDENTIAL=stipnd_v1_... pnpm agent normal    # buys a few reports
STIPND_CREDENTIAL=stipnd_v1_... pnpm agent overcap   # tries the $5 dataset, gets refused
STIPND_CREDENTIAL=stipnd_v1_... pnpm agent loop      # same report until the loop guard stops it
```

Watch the receipts tab while the loop runs.

## Environment variables

See [.env.example](.env.example). Summary:

| Variable                                                                                                | Used by       | Purpose                                                 |
| ------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_CHAIN_ID`                                                                                  | web, merchant | Defaults to 421614                                      |
| `NEXT_PUBLIC_ZERODEV_PROJECT_ID`                                                                        | web           | Bundler, paymaster and passkey server                   |
| `NEXT_PUBLIC_STIPEND_HUB_ADDRESS`, `NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS`, `NEXT_PUBLIC_TOKEN_ADDRESS` | web, merchant | Override the known deployment                           |
| `NEXT_PUBLIC_ENABLE_DEV_SIGNER`                                                                         | web           | Browser-generated owner key for local work              |
| `MERCHANT_ADDRESS`, `MERCHANT_PRIVATE_KEY`, `MERCHANT_PUBLIC_URL`                                       | merchant      | Payee, registration key, origin used in resource hashes |
| `STIPND_CREDENTIAL`, `STIPND_MERCHANT_URL`                                                              | agent         | Issued by the owner app                                 |
| `DEPLOYER_PRIVATE_KEY`, `RPC_URL_ARBITRUM_SEPOLIA`, `ARBISCAN_API_KEY`                                  | contracts     | Deployment                                              |

## Deploying

- **Contracts**: `pnpm --filter @stipnd/contracts deploy:arbitrum-sepolia`. Writes `deployments/<chainId>.json`; mirror it into `packages/protocol/src/deployments.ts`.
- **Web**: a standard Next.js app. On Vercel, set the root directory to `apps/web` and add `NEXT_PUBLIC_ZERODEV_PROJECT_ID`. The ZeroDev project's passkey server must list the deployed origin.
- **Merchant**: any Node host. Set `MERCHANT_PUBLIC_URL` to the public origin so resource hashes match.

## Testing

| Suite          | Command                               | Covers                                                                                                                            |
| -------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Contracts (28) | `pnpm test:contracts`                 | Every rejection reason, period refill, policy updates, allowlist/verified modes, merchant maturation, fuzzed balance conservation |
| Protocol (11)  | `pnpm --filter @stipnd/protocol test` | Resource hashing, challenge and proof round trips, credential envelope, formatting                                                |
| SDK (9)        | `pnpm --filter @stipnd/sdk test`      | Receipt decoding, `pay` encoding, rejection and halt behaviour, challenge validation, `402` fetch flow, policy construction       |
| Merchant (5)   | `pnpm --filter @stipnd/merchant test` | Challenge shape, proof verification paths, single redemption                                                                      |
| Web (8)        | `pnpm --filter @stipnd/web test`      | Policy form parsing and plain-English policy text                                                                                 |

CI runs all of the above on every pull request.

## Status and honest limitations

- The identity registry is not configured on the Sepolia deployment, so "verified" means "registered" there.
- The merchant keeps redemptions in memory; a real deployment should persist them.
- Receipts are read from events on each page load with short polling; an indexer would be the next step at scale.
- Credentials issued in one browser are listed only in that browser.

## License

MIT
