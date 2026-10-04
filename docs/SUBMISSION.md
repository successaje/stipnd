# Submission copy

Ready to paste into the Buildathon form. Replace the bracketed items.

## One-liner

Stipnd gives AI agents a budget the chain enforces: caps, rate limits, loop guards and merchant policy on Arbitrum, with every attempt, paid or refused, recorded as a receipt.

## Description

Agents buy APIs, data and compute over HTTP, and they retry, fork and loop. In 2026 a single Codex job spawned 826 child agents and burned $78,000; a LangChain loop ran for 11 days and cost $47,000. The post-mortems agree: no per-agent ceiling, no enforcement point that could stop the next call. The only thing between a looping agent and a bank account is a sentence in a prompt.

Stipnd moves the ceiling into a contract. An owner creates a **stipend** with a passkey: a fixed sum of USDC, for a stated purpose, refilled on a schedule, with a per-call cap, a rate limit, a duplicate-purchase guard, a merchant policy and an expiry. The agent receives a **credential**, not a wallet: a ZeroDev session key that the owner's smart account restricts to one function on one stipend with a parameter cap and sponsored gas only. The agent's `fetch` pays Stipnd `402` challenges automatically.

`StipendHub` enforces the rules on every payment, independently of the key. A refused payment does not revert; it emits a receipt with the reason, so the owner watches the loop being stopped. Freeze is one tap. Merchants verify the `Paid` event onchain before serving, with no account, webhook or database, and registered merchants build a settlement track record that owners can require.

Live on Arbitrum Sepolia with passkey accounts, sponsored gas, a reference merchant, a demo agent that shows the happy path, the over-cap refusal and the loop being stopped, and 61 tests across contracts, protocol, SDK, merchant and web.

## Tracks

- Promising Products: AI agents, new financial primitive (a budgeted, policy-enforced spending pool with onchain receipts for refusals).
- General.

## Arbitrum technology used

- Arbitrum Sepolia for all contracts and payments; predictable fees make per-call enforcement affordable.
- ZeroDev Kernel v3.1 on Arbitrum: passkey owners, session keys with call, gas, rate-limit and timestamp policies, paymaster sponsorship, revocation.
- HTTP 402 (x402-style) challenges with enforcement kept in the contract.
- ERC-8004-ready merchant registry.

## Links

- Repository: https://github.com/successaje/stipnd
- Live app: [Vercel URL]
- Contracts: https://sepolia.arbiscan.io/address/0xb4e1602533425E670E0FA286FA87FeFF27Bd3197 (StipendHub), https://sepolia.arbiscan.io/address/0x3C0c5EDCb291374F8895FA4b0cC21c8D557aF97E (MerchantRegistry)
- Demo video: [URL]

## Team

[Name], [role], [contact]
