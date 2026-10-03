# Stipnd

Budgets for AI agents that the chain enforces.

An agent gets a **stipend**: a fixed sum of USDC, for a stated purpose, refilled on a schedule, with a per-call cap, a rate limit, a duplicate-purchase guard, and a merchant policy. The agent decides when to pay. The chain decides whether it may. Every attempt, paid or refused, is a receipt the owner can read.

Built on Arbitrum with ZeroDev smart accounts, x402-style HTTP payments, and ERC-8004 merchant identity.

> Status: under active development for Arbitrum Open House Singapore. See [docs/BUILD_LOG.md](docs/BUILD_LOG.md).

## Repository

| Path                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `packages/contracts` | `StipendHub` and `MerchantRegistry` (Foundry)        |
| `packages/protocol`  | Shared types, ABIs, chain config                     |
| `packages/sdk`       | Agent-side client: handles `402`, pays within policy |
| `apps/web`           | Owner app, merchant console, landing                 |
| `apps/merchant`      | Reference paid API with settlement verification      |
| `apps/agent`         | Reference agent used for demos and e2e tests         |
| `docs`               | Product model, architecture, research                |

## Local development

```bash
pnpm install
pnpm test:contracts
```

Copy `.env.example` to `.env` and fill in the values described there.

Full setup, architecture, and deployment notes live in [docs/](docs/).

## License

MIT
