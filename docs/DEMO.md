# Demo script

Two cuts: 30 seconds for the pitch, 2 minutes for judging. Both use the same setup.

## Setup (before recording)

1. Owner app open on `/app`, signed in with a passkey, one stipend already created:
   - Name: **Research bot**. Purpose: "Buys filings, quotes and news for the weekly competitor brief."
   - Budget 20 USDC / 30 days, per-call cap 0.50, rate limit 120/hour, loop guard 3 per hour, any merchant.
   - Funded with 20 USDC.
2. Reference merchant running (`pnpm dev:merchant`) and registered in the directory.
3. A credential issued from the Connect tab and exported as `STIPND_CREDENTIAL` in a terminal.
4. Split screen: terminal left, owner app on the stipend's **Receipts** tab right.

## 30 seconds

| t    | Say                                                                                                             | Show                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0:00 | "This research agent has a 20 dollar stipend. Fifty cents per call. Same resource at most three times an hour." | Overview strip on the stipend page                                                                    |
| 0:05 | "It buys a report."                                                                                             | `pnpm agent normal`. Green receipts appear on the right.                                              |
| 0:12 | "It tries a five dollar dataset."                                                                               | `pnpm agent overcap`. Red receipt: _Over the per-call cap_.                                           |
| 0:18 | "Now it loops."                                                                                                 | `pnpm agent loop`. Three green, then red: _Repeat purchase blocked_. Terminal: "agent halted itself". |
| 0:26 | "Total exposure: twenty dollars. The chain enforced that, not the prompt."                                      | Point at the balance.                                                                                 |

## 2 minutes

0:00–0:30 as above.

0:30–0:50 **Open the Rules tab.** "Two layers. The agent's key is restricted by the smart account to this one function with this cap. The contract checks the budget, the rate, duplicates, the merchant, and the freeze on every call. A refused payment doesn't revert. It's a receipt."

0:50–1:10 **Expand a rejected receipt.** Reason in plain words, merchant, resource hash, transaction link. Click the merchant to show the track record page. "Merchants register once and build a settlement history the hub maintains. Owners can require it."

1:10–1:30 **Connect tab.** "The agent holds this, not a wallet. Scoped to one stipend, sponsored gas only. Shown once." Then **Freeze** in the header. Run `pnpm agent normal` again: red receipt, _Stipend frozen_. Unfreeze.

1:30–1:50 **Create a new stipend** quickly to show the form's plain-English summary and the one-passkey confirmation.

1:50–2:00 Close on the landing page hero: "Give your agent a budget it can't argue with. Arbitrum, ZeroDev passkeys and session keys, HTTP 402, merchant identity."

## If something goes wrong

- Bundler slow: receipts arrive within a few blocks; keep talking about the rules tab.
- Loop guard already tripped from a rehearsal: it resets after an hour, or use a different report id (`--count` and the resource change the hash). Easiest: create a fresh stipend before recording.
- Passkey prompt cancelled: the app says so and nothing was sent. Retry.
