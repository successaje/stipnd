# @stipnd/web

Owner app, merchant directory, and landing page. Next.js 16 (App Router, Turbopack), Tailwind v4, Motion, TanStack Query, viem, ZeroDev.

## Routes

| Route                      | What                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `/`                        | Landing page with a scripted receipt replay                                            |
| `/app`                     | Stipend list (requires sign-in)                                                        |
| `/app/new`                 | Create a stipend                                                                       |
| `/app/s/[id]`              | Stipend detail: receipts, connect, rules; freeze, fund, withdraw. Tabs live in `?tab=` |
| `/app/merchants`           | Merchant directory                                                                     |
| `/app/merchants/[address]` | Merchant track record and recent payments                                              |
| `/app/account`             | Owner account, balance, faucets, sign out                                              |

## Structure

```
app/                 routes (server components where possible, client where state lives)
components/ui/       design system primitives
components/shell/    app shell, gate, sign-in, unconfigured notice
components/stipend/  stipend rows, policy form + fields, detail tabs and controls
components/landing/  landing-only pieces
lib/config.ts        NEXT_PUBLIC_* → appConfig, with known deployments as fallback
lib/clients.ts       public client, Kernel account + sponsored client
lib/account/         passkey / dev signers and the AccountProvider
lib/hub/             typed reads, hooks, calldata builders, useUserOp, receipts
lib/policy-text.ts   plain-English policy sentences
test/                vitest unit tests
```

## Configuration

See the root `.env.example`. Against Arbitrum Sepolia only `NEXT_PUBLIC_ZERODEV_PROJECT_ID` is required; contract addresses fall back to `@stipnd/protocol`'s `DEPLOYMENTS`. Set `NEXT_PUBLIC_ENABLE_DEV_SIGNER=true` for a browser-generated owner key during development.

## Conventions

- No application database: stipend metadata is onchain, receipts are events, merchant data is in the registry. Only session and credential bookkeeping live in `localStorage`, namespaced per chain.
- Every write goes through `useUserOp`, which batches calls into one sponsored user operation and exposes a stage for `TxStages`.
- Errors shown to people go through `lib/errors.ts`. Raw errors go to the console.
- Form validation errors appear after the first submit attempt.
