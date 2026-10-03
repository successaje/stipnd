# @stipnd/contracts

Foundry package for the Stipnd onchain layer.

## Contracts

### `StipendHub`

Holds stipends and enforces their policy on every `pay` call.

| Function                                                          | Who           | What                                                                                                                                                |
| ----------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create(token, name, purpose, policy, allowlist, initialFunding)` | anyone        | Creates a stipend owned by `msg.sender` and optionally funds it                                                                                     |
| `fund(id, amount)`                                                | anyone        | Tops up a stipend (pull via `transferFrom`)                                                                                                         |
| `pay(id, merchant, amount, resourceHash, memo)`                   | owner account | Pays a merchant if policy allows. Policy failures **emit `PaymentRejected` and return `false`** instead of reverting, so every attempt is a receipt |
| `setFrozen(id, bool)`                                             | owner         | Kill switch                                                                                                                                         |
| `updatePolicy(id, policy)`                                        | owner         | Replaces policy and starts a fresh period                                                                                                           |
| `setAllowlist(id, merchants, allowed)`                            | owner         | Edits the per-stipend allowlist                                                                                                                     |
| `withdraw(id, amount, to)`                                        | owner         | Returns funds                                                                                                                                       |
| `preview(id, merchant, amount, resourceHash)`                     | view          | Tells a client what `pay` would do right now, including simulated period roll-over                                                                  |

The owner is expected to be a smart account (ZeroDev Kernel). The agent holds a session key that the account restricts to `pay` for one stipend id with a per-call parameter cap and a rate limit. The hub does not distinguish keys; it enforces the stipend's rules for every call. Two independent layers bound exposure.

#### Policy

| Field                                | Meaning                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `periodBudget`, `periodLength`       | Max spend per period. `periodLength = 0` means a single period that never refills |
| `perCallCap`                         | Max per payment                                                                   |
| `maxCallsPerWindow`, `rateWindow`    | Fixed-window rate limit. `0` disables                                             |
| `maxSameResource`, `duplicateWindow` | Max payments for the same `resourceHash` per window. Stops loops. `0` disables    |
| `merchantMode`                       | `Any`, `Allowlist`, `Verified`, `VerifiedOrAllowlist`                             |
| `minMerchantSettlements`             | In verified modes, the merchant must have at least this many recorded settlements |
| `expiresAt`                          | Hard expiry. `0` means never                                                      |

#### Rejection reasons

`Frozen`, `Expired`, `PerCallCap`, `PeriodBudget`, `InsufficientBalance`, `RateLimit`, `DuplicateResource`, `MerchantNotAllowed`, `MerchantNotVerified`, `MerchantTooNew`.

### `MerchantRegistry`

Public directory of merchants. Merchants self-register with a name, URL and tags, and may link an ERC-8004 agent identity they own. The hub records every settlement so stipends can require a track record. A merchant is **verified** when registered and, if an ERC-8004 `IdentityRegistry` is configured, holds an identity NFT.

## Commands

```bash
forge build
forge test -vv
forge fmt
```

Local chain:

```bash
anvil
pnpm deploy:local          # deploys MockUSD, mock ERC-8004 registry, MerchantRegistry, StipendHub
```

Arbitrum Sepolia:

```bash
DEPLOYER_PRIVATE_KEY=... RPC_URL_ARBITRUM_SEPOLIA=... ARBISCAN_API_KEY=... \
IDENTITY_REGISTRY=0x... pnpm deploy:arbitrum-sepolia
```

Deployment addresses are written to `deployments/<chainId>.json`.

## Security notes

- `pay` follows checks-effects-interactions and is `nonReentrant`.
- Fee-on-transfer tokens are tolerated on funding (balance credited is what arrived) but not recommended.
- Timestamps are stored as `uint40`; windows use fixed, not sliding, boundaries by design (cheap and predictable).
- There is no admin on `StipendHub`. `MerchantRegistry` has an owner only to set the hub address and the identity registry.
