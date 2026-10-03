# Stipnd — Product Model

This document is the north star for implementation. Every screen, contract function, and SDK call should trace back to something here.

## Thesis

AI agents now spend real money, and the only thing stopping a looping agent from draining a budget is a sentence in a prompt. Stipnd gives an agent a **stipend**: a fixed sum, for a stated purpose, refilled on a schedule, with rules the chain enforces. The agent decides when to pay. The chain decides whether it may.

## Core user

A developer or small team running autonomous agents that buy APIs, data, and compute over HTTP (x402 / MPP style endpoints). They have been burned, or fear being burned, by an agent loop. They want to connect money in under ten minutes and sleep.

Secondary: merchants selling to agents who want identified, budget-bounded payers.

## Core action

**Create a stipend and connect it to an agent.** Everything else (receipts, freeze, merchants) exists to make that action safe and repeatable.

## Product loop

1. Developer creates a stipend and drops one environment variable into their agent.
2. Every agent purchase produces a receipt in the owner's feed.
3. Rejections (over cap, rate limit, duplicate loop, unverified merchant) are visible and explain themselves.
4. Owner adjusts policy or refills. The stipend refills itself every period, so the owner returns to check receipts, not to babysit.
5. Merchants that receive Stipnd payments see payer identity and can register to be "verified", which lets more owners route to them.

## Magical interaction

The agent fires thirty identical requests in a loop at 3 a.m. On the sixth, the chain refuses. The agent gets a 402 it cannot satisfy and stops. The owner wakes up to a receipt that says exactly what happened and a total exposure that matches the stipend, not the bank account.

Second moment: the owner taps **Freeze** and the agent's next call fails within a block.

## Sponsor relevance

- **Arbitrum One / Arbitrum Sepolia**: cheap, predictable fees (post ArbOS Dia) make per-call enforcement affordable. x402 (Coinbase facilitator) and MPP (`arbitrum-mpp`) both settle here.
- **ERC-8004** identity registries are live on Arbitrum; Stipnd uses agent identity as a merchant-verification signal.
- **ZeroDev Kernel** (live on Arbitrum and Robinhood Chain): passkey owners, session keys with call/rate/time/gas policies, sponsored gas. The agent never holds the owner key.
- **Robinhood Chain**: same contracts, USDG as the stipend asset. Second deployment target.

## Essential flows

| Flow           | What happens                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First visit    | Landing page shows a live-looking receipt feed with one rejection; headline explains the product in one sentence; primary CTA "Create a stipend".                        |
| Onboarding     | Passkey sign-in creates a smart account. No seed phrases, no network switching, gas sponsored.                                                                           |
| Primary action | New stipend: name and purpose, budget and period, per-call cap, rate limit, duplicate guard, merchant policy, expiry. Plain-English summary updates live. One signature. |
| Confirmation   | Staged status: Preparing → Waiting for passkey → Submitted → Confirming → Created.                                                                                       |
| Connect        | Generate a session credential scoped to this stipend. Show as env var / MCP block / SDK snippet. Shown once; regenerate revokes the previous.                            |
| Result         | Stipend page: remaining budget ring, next refill, policy summary, receipts feed (live), Freeze button always visible.                                                    |
| History        | Receipts with merchant identity, resource, amount, status (paid / rejected with reason), time, tx link under "details".                                                  |
| Error recovery | Passkey cancelled, insufficient balance, wrong network (handled by SDK), reverted payment with human reason, RPC down (retry with cached state), expired credential.     |
| Returning user | `/app` lists stipends with status and last activity; anomaly chips surface what changed since last visit.                                                                |
| Merchant       | `/merchants` directory and `/merchant` console: register, add tags, see payer stats.                                                                                     |

## Vocabulary

- **Stipend**: the budgeted pool with policy. Never "wallet".
- **Credential**: what the agent holds. Never "private key" in UI.
- **Receipt**: one payment attempt, paid or rejected.
- **Freeze / Unfreeze**: owner kill switch.
- **Verified merchant**: registered in the merchant registry and (where available) holding an ERC-8004 identity.

## Non-goals for v1

Card rails, fiat on-ramp, KYC, mobile apps, multi-chain beyond Arbitrum Sepolia (+ local Anvil), streaming MPP sessions, disputes, tokens, governance.
