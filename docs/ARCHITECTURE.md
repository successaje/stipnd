# Stipnd — Architecture

## Overview

```
 Owner (passkey)                                   Merchant HTTP API
   │ ZeroDev Kernel account                           │  x402-style 402 challenge
   │                                                  │  verifies settlement onchain
   ▼                                                  ▼
 apps/web  ──────── reads events / calls ────▶  StipendHub.sol  ◀──── pay() via UserOp ──── Agent
   │                                             │   │                                   (packages/sdk,
   │ creates stipend, funds, freezes,            │   └── MerchantRegistry.sol             session key +
   │ issues session credential                   │                                       serialized permission)
   ▼                                             ▼
 Session credential                        ERC-8004 IdentityRegistry (optional signal)
```

Two enforcement layers, on purpose:

1. **Kernel permission (off the hub's control).** The agent's session key may only call `StipendHub.pay` for its own stipend id with `amount <= perCallCap`, under a rate-limit policy, a timestamp policy, and a gas policy. It cannot call `freeze`, `withdraw`, `updatePolicy`, or anything else.
2. **StipendHub (onchain, per stipend).** Cumulative budget per period, duplicate-resource guard, merchant policy, frozen flag, expiry. These apply regardless of which key submitted the call.

If either layer has a bug, the other still bounds exposure.

## Packages

| Path | What | Stack |
|---|---|---|
| `packages/contracts` | `StipendHub`, `MerchantRegistry`, interfaces, deploy scripts, tests | Foundry |
| `packages/sdk` | Agent-side client: holds the credential, handles `402` challenges, submits `pay()` UserOps, verifies receipts | TypeScript, viem, ZeroDev SDK |
| `packages/protocol` | Shared types: challenge/receipt schema, policy encoding, chain config, ABIs | TypeScript |
| `apps/web` | Owner app + merchant console + landing | Next.js (App Router), Tailwind v4, Motion, wagmi/viem, ZeroDev |
| `apps/merchant` | Reference merchant: paid endpoints with `402` challenges, settlement verification middleware | Hono |
| `apps/agent` | Reference agent runner used for demos and e2e tests (normal mode and loop mode) | Node |

## Settlement flow (Stipnd scheme)

1. Agent `GET /reports/42` → merchant replies `402` with JSON challenge: `{ scheme: "stipnd", chainId, hub, merchant, token, amount, resource, resourceHash, expires }`.
2. SDK checks remaining budget locally (read call), builds a UserOp calling `hub.pay(stipendId, merchant, amount, resourceHash, memo)` and sends it via the bundler with sponsored gas.
3. Hub validates policy, transfers tokens from the stipend balance to the merchant, emits `Paid(stipendId, merchant, amount, resourceHash, remaining)`. On failure it reverts with a typed error; the SDK maps it to a human reason and records a local rejection.
4. SDK retries the request with `Authorization: Payment stipnd <txHash>:<logIndex>`.
5. Merchant middleware fetches the receipt, checks the `Paid` log matches (hub, merchant, amount, resourceHash, unexpired) and that it has not been redeemed before, then serves the resource.

Why not plain EIP-3009 like x402 `exact`? Because then the budget would live in the signature policy, not in a contract the owner can inspect and freeze. The Stipnd scheme keeps enforcement in the hub. x402/MPP compatibility is handled by the merchant adapter accepting both.

## Data

There is no application database in v1. Stipend metadata (name, purpose) is stored onchain as short strings; receipts are events; merchant metadata lives in `MerchantRegistry`. The web app indexes events with viem `getLogs` and caches with TanStack Query. This keeps the owner app stateless and verifiable.

## Chains

- Local: Anvil + mock USD + local bundler (for contract and SDK tests).
- Testnet: Arbitrum Sepolia (chain id 421614), Circle test USDC.
- Target: Arbitrum One, Robinhood Chain (USDG).

## Repository conventions

- Conventional commits (`feat:`, `fix:`, `ui:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Feature branches + PRs into `main`; `main` always builds.
- No secrets in the repo; `.env.example` documents every variable.
