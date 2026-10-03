# Arbitrum Open House Singapore — Novelty Engine Report

Prepared 2026-10-03. Buildathon submission deadline is **October 4, 2026, 15:59 SGT** (tomorrow). Founder House Singapore runs October 23–25 and takes existing products/prototypes.

Sources consulted: openhouse.arbitrum.io, Arbitrum Foundation blog (Singapore applications post, Founder House Singapore post, Builder's Block #021 and #026, NYC/London/India recaps, ERC-8004 post), Offchain Labs blog (ArbOS Dia, dynamic pricing, Timeboost/PGA, x402 + MPP), Robinhood Chain developer docs (Stock Tokens, oracles, Building with Stock Tokens), Robinhood newsroom (mainnet launch, "Open to Agents"), QuickNode Robinhood Chain guide, Paxos/USDG reports, arXiv Timeboost study, Fhenix announcements, Singapore MAS coverage, and public hackathon entries (e.g. Kajota Mesh, Xero Protocol on GitHub).

---

## 1. Hackathon thesis

This is not a generic "build on Arbitrum" hackathon. It is the fourth stop of a founder-funnel program (Bengaluru → NYC → London → Singapore) co-sponsored by **Robinhood Chain**, where the real prize is not the $115K but a seat at Founder House and milestone-based grants. Every prize is paid in **USDG** (Paxos' Singapore-regulated stablecoin), and the Foundation explicitly reserves podium spots for Robinhood Chain projects.

The thesis: **Arbitrum wants to be the chain where tokenized traditional finance (stocks, bonds, dollars) becomes programmable and composable, and it wants proof that ordinary builders can create products on top of institutional rails like Robinhood Chain that Robinhood itself would never build.** The secondary thesis is that AI agents are the new "users" of these rails, and Arbitrum wants to be the settlement layer for agent commerce (x402, MPP, ERC-8004 are all live here).

Judging criteria (stated, consistent across all Open Houses): smart contract quality, product-market fit, innovation and creativity, and whether the project solves a real problem. Founder House selection: product quality, execution potential, ecosystem alignment. The Foundation's own guidance in Builder's Block #026: "Does this solve a real, painful problem? Have I validated that people need it? Can I find users before I build it?" They also say: use AI openly, don't hide it.

## 2. What the sponsor actually wants

Evidence-based reading:

- **Robinhood Chain usage.** Robinhood Chain went to mainnet July 1, 2026, has ~$800K/week revenue, nearly 2,000 Stock Tokens, Uniswap/Rialto/Lighter/Pleiades/1inch venues, USDG lending via Morpho, and a ZeroDev smart-wallet SDK. But it is an empty shopping mall: the anchor tenants are there, the independent shops are not. Reserved podium spots and $90K of Founder House money dedicated to Robinhood Chain say this plainly.
- **Stock Tokens used as more than tradeable things.** Robinhood's own docs enumerate what they hope you'll do: "Deposit NVDA as collateral and borrow USDG"; "any contract that accepts ERC-20s... an escrow, a vault... can hold it." They built ERC-8056 multipliers and Chainlink feeds so contracts can "read a current price directly instead of caring what time it is in New York." They want 24/7 composability demonstrated.
- **Agentic finance with real settlement.** Offchain Labs shipped `arbitrum-mpp`, Coinbase's x402 facilitator supports Arbitrum, ERC-8004 registries are live on Arbitrum, Robinhood opened MCP servers for Trading and Banking with "Agentic Accounts." The "Promising Products" track names "AI agents, new financial primitives" explicitly.
- **Stablecoin usefulness outside trading.** Prizes in USDG, Venmo PYUSD on Arbitrum, $5B+ stablecoin balances, Singapore's MAS stablecoin regime, 20,000 SMEs accepting stablecoins via HitPay/TripleA. Payments (payroll, cross-border, on/off-ramps) is a named vertical.
- **Rust/C/C++ (Stylus) is a stated bonus**, but note: on **October 2, 2026** the Security Council paused *new* Stylus activations on Arbitrum One and Nova for a liveness bug. Testnets and Robinhood Chain are unaffected per public reporting, but any mainnet Stylus deployment plan should be treated as a risk and stated honestly.
- **Winners that look like companies, not demos.** Past winners: Kustodia (escrow payments), Liquida (gilt collateral), Orbital AMM (stablecoin AMM in Stylus), AlphaGrid (AI prop trading on Robinhood Chain), Tilt (AI RWA management), EqualFi (RWA index baskets), Bond.Credit (agent underwriting). Pattern: financial infrastructure with a credible institutional or user wedge. Pure consumer toys have not won. Pure tooling has placed at best third.

## 3. Strategic ecosystem objectives

If this hackathon succeeds spectacularly, six months later Arbitrum wants people saying:

1. "Robinhood Chain has a real third-party app ecosystem; Stock Tokens are collateral/currency/inputs, not just a trading pair."
2. "Arbitrum is where agents actually settle money (x402/MPP/ERC-8004) and where they trade tokenized equities."
3. "Programmable dollars on Arbitrum do something a bank app can't."
4. "Arbitrum's chain stack (Orbit) is what serious institutions use, and builders follow institutions."
5. Quietly: "Base has consumer distribution, but Arbitrum has the *assets*: 7,000+ tokenized RWAs, $227M tokenized stocks, gilts, treasuries."

What would make judges say "this is exactly why this technology exists": a product where a tokenized stock, a regulated stablecoin, and a smart contract do something *together* that a brokerage account, a bank account, and a spreadsheet cannot do, and that a normal person in Lagos, Manila, or Jakarta would use on a Tuesday.

## 4. Competitive landscape

| Competitor / adjacent | What they do better | What Arbitrum + Robinhood Chain does better |
|---|---|---|
| **Base (Coinbase)** | Consumer distribution (120M Coinbase users), DAU leader, Farcaster/Zora culture, x402 origin | Depth of real financial assets; Robinhood's own chain; GMX/Pendle liquidity; Timeboost/PGA ordering |
| **Solana (xStocks via Backed, Jupiter)** | Faster retail UX, xStocks on many DEXs, memecoin culture | Issuer-native chain; Chainlink feeds + ERC-8056 multipliers standardized; Ethereum settlement for institutions |
| **Ondo Global Markets / Ondo Chain** | Institutional RWA distribution, broad asset list | Robinhood's retail brand; permissionless composability on an Orbit chain |
| **Kraken Ink / xStocks** | Exchange distribution | Same as above; Arbitrum stack maturity |
| **Converge (Ethena + Securitize)** | Institutional DeFi focus on Arbitrum stack | Shows the Orbit pattern; Robinhood Chain is the consumer version |
| **Interactive Brokers / eToro / Revolut** | Fractional stocks, DRIP, auto-invest, social copy trading, round-ups | None of these let a third party program the asset; none run 24/7; none composable with stablecoin lending |
| **Stripe/Bridge, Coinbase Commerce** | Merchant stablecoin acceptance | Arbitrum has MPP + x402 both; USDG regulated in SG and EU |
| **Polymarket / Kalshi** | Event contracts at scale | Robinhood is adding event contracts to agentic accounts; opportunity for stock-linked structured products |
| **Web2 agent platforms (OpenAI, Anthropic MCP ecosystem)** | Agent capability | No native money rail; x402/MPP on Arbitrum is the rail |

Where Web2 stays dramatically better: onboarding, recurring payments (subscriptions, auto-invest), notifications, customer support, tax reporting, and "it just works" without gas. Where crypto wins: 24/7, composability, non-US global access to US equities exposure, programmable escrow, agent-native settlement.

## 5. Ecosystem weaknesses

- **Consumer distribution gap vs Base.** Arbitrum has assets, not eyeballs.
- **Stock Tokens are legally debt instruments** (Robinhood Assets Jersey), no voting, no cash dividends (reinvested via multiplier). Not holdable in US, UK, Canada, Switzerland, UAE. Everything built must be designed for the 120+ eligible countries.
- **Robinhood Chain has anchor venues but almost no independent apps.** Also no proprietary SDK beyond standard ERC-20/Chainlink; developer docs are thin.
- **Timeboost** is centralized in practice (three entities win 99.7% of auctions) and is being replaced by Priority Gas Auctions; don't build on express-lane assumptions.
- **Stylus activation pause** (Oct 2, 2026) on Arbitrum One/Nova. Bonus points for Rust are now risky to collect on mainnet.
- **Agentic standards are young.** ERC-8004 reputation registries are mostly empty. x402 is Coinbase-flavored; MPP is Stripe-flavored; both are on Arbitrum but no killer app yet.
- **Seven-day withdrawal, centralized sequencer** are standard L2 caveats; irrelevant for hackathon.
- **Oracle pauses during corporate actions** (`oraclePaused()`), so any product using Stock Tokens as collateral must handle pause states.

## 6. Underused ecosystem strengths

- **ERC-8056 `uiMultiplier()`**: the dividend/split multiplier is an onchain, readable, event-emitting number. Nobody is using it as a *primitive* (e.g., yield-stripping, dividend-triggered actions). Xero Protocol on GitHub is the only visible attempt.
- **Chainlink feeds for ~2,000 equities on a permissionless chain.** This is effectively a free, 24/7, composable stock-price oracle set. Options, structured products, conditional payments, insurance, and games can all key off it.
- **USDG under MAS supervision + Morpho lending on Robinhood Chain.** A regulated yield-bearing dollar in the host country of the event.
- **ZeroDev wallet SDK on Robinhood Chain**: gas sponsorship, session keys, passkeys (secp256r1 now spec-aligned after ArbOS Dia). The "no wallet, no gas, no seed phrase" demo is fully available.
- **Robinhood MCP servers + Agentic Accounts.** An agent can hold a sandboxed brokerage balance *and* an onchain wallet. Hybrid off/on-chain agent strategies are possible today.
- **96 KB contract size limit** on Robinhood Chain (4x Ethereum). Complex logic in one contract.
- **MPP (`arbitrum-mpp`) settles with signed transfer authorizations**: the payer needs no gas, no prior approval. Agent-pays-for-API is a two-line integration.
- **Fee predictability after ArbOS Dia** makes micro-transaction products viable without retry logic.
- **Fhenix CoFHE mainnet launches October 21** on Arbitrum: confidential computation lands right before Founder House.

## 7. Obvious Idea Graveyard

| Category | Why people build it | Why it's crowded | Typical implementation | What would make it interesting again |
|---|---|---|---|---|
| AI trading agent for Stock Tokens | Both sponsors scream "agents" | AlphaGrid already won London with this; every LLM demo does it | Chat → "buy NVDA" → swap on Uniswap | Agents that *don't* trade: agents that hedge payroll, rebalance a family savings plan, or compete under verifiable constraints with ERC-8004 reputation |
| Lending market for Stock Tokens | Robinhood docs literally suggest it | Morpho already live; fork of Aave is trivial | Aave fork with NVDA collateral | Non-liquidation design (e.g., borrow against dividends only), or lending to *agents* with reputation-based LTV |
| Tokenized RWA index/basket | EqualFi won with it | Dozens of ETF-on-chain clones | Set Protocol clone | Baskets as social objects (follow a person's basket), or baskets as payment units |
| Stablecoin cross-border remittance app | Payments is a named track, EdenFi won | Hundreds submitted every Open House | Wallet + on/off ramp + "send" | Only if the money *does something* in transit (earns, escrows, converts to stock exposure) |
| Prediction market | Robinhood event contracts, Laytus won | Polymarket shadow | Binary market on stock price | Stock-conditioned payouts embedded in other products rather than a market UI |
| Portfolio dashboard / analytics | Dune sponsored before | Zero stickiness | Charts | Dashboards never win. Skip. |
| Escrow / agentic commerce settlement | Kustodia won NYC; Kajota submitted here | Growing fast | Multi-party split contract | Only with a real demand side already using it |
| Agent reputation / ERC-8004 registry tooling | Foundation blog asked for it | Infra, no demo moment | Registry + score | Reputation that gates *money* (LTV, credit lines) in a visible loop |
| Copy/social trading | "Consumer: social trading" is listed | eToro exists; many will submit | Leaderboard + copy button | Copying a *rule*, not a person, with the rule executed by contract 24/7 |
| Yield aggregator / ERC-4626 vault | Plexi won India | Infinite | Vault that farms Morpho USDG | No. |
| Privacy pools / shielded transfers | Shinobi won India, Fhenix sponsor | Hard, mature teams | ZK mixer | Only with Fhenix confidential tokens for a specific finance use (payroll privacy) |
| Options / perps on Stock Tokens | Lighter has perps; obvious derivative | Many | Oracle-settled binary options | Options packaged as consumer "protection" rather than trading |

## 8. Gap Map

### Missing (exists elsewhere, barely exists here)
- **Auto-invest / round-ups / DRIP-style recurring buying** of equities exposure, in stablecoins, for non-US users. Revolut and Acorns do this; nothing on Robinhood Chain does.
- **Payroll in dollars with a slice in stocks** (employee stock purchase plans for the gig/remote economy).
- **Gifting and allowances** denominated in Stock Tokens (buy a kid "one Apple").
- **Merchant acceptance** of USDG with instant settlement in Singapore/SEA (HitPay exists for SGD; nothing onchain-native with programmable terms).
- **Subscription/standing-order primitives** for stablecoins (the "Web2 is better" cliff).

### Broken (exists, but UX/economics poor)
- Stock Token trading needs a wallet, gas, bridging, and venue selection. ZeroDev fixes the first two but no one has built the "one tap" product.
- Agent commerce demos require the agent to hold ETH for gas; MPP's signed-authorization flow fixes it but nobody has shown a consumer-visible result.
- Lending against Stock Tokens exposes users to liquidation on 24/7 price; no "soft" credit products.
- Reputation (ERC-8004) exists with no money attached to it.

### Newly Possible (recent primitive → new product)
- **Onchain corporate-action multiplier (ERC-8056)** → dividend-triggered programmable actions; principal/yield splitting; "dividend streams" as payment sources.
- **Chainlink feeds on 2,000 equities, 24/7, permissionless** → conditional payments, parametric products, stock-indexed contracts, games, and agreements keyed to real stock prices without a broker.
- **MPP/x402 on Arbitrum with no-gas signed authorizations** → agents and humans paying per request; APIs that sell themselves.
- **Robinhood MCP Trading/Banking servers + onchain wallet** → hybrid agents that move between a brokerage sandbox and DeFi.
- **secp256r1 spec alignment + ZeroDev session keys** → passkey-native finance apps, delegated spending limits to agents.
- **Fhenix CoFHE (Oct 21)** → confidential payroll, sealed-bid anything, private portfolio allocation with public settlement.
- **Elara: Stylus contracts up to 96 KB** → full pricing engines (options, insurance) onchain (subject to the activation pause on One/Nova; Robinhood Chain and testnets fine).

### Misunderstood (powerful capability used boringly)
- **Stock Tokens are being treated as things to trade.** They are *ERC-20s with a live price feed and a corporate action multiplier*. That makes them (a) collateral, (b) a unit of account for agreements, (c) a gift/payment object, (d) a programmable savings target, (e) an input to any conditional contract.
- **Agents are being treated as traders.** The more valuable agent is a *payer*: an agent that buys data, compute, or services on your behalf with capped MPP spend, or an agent that enforces a financial rule for a household or small business.
- **USDG is being treated as "the prize currency."** It is a MAS-regulated dollar with 7% Morpho yield on Robinhood Chain. That is a *savings account anyone in SEA can open with a passkey*.
- **ERC-8004 is treated as a registry.** It is a credit bureau for agents if you attach money to it.

## 9. Important primitives

1. **Stock Token ERC-20 + Chainlink `latestRoundData()` + `uiMultiplier()` + `oraclePaused()`** — 24/7 composable equities exposure with onchain corporate actions. *Stop thinking like a blockchain dev:* "a stock that can sit inside any contract and always knows its own price." *Human behavior it improves:* saving toward goals, gifting, paying people partly in equity, settling bets and agreements. *Hides the chain:* yes, with ZeroDev.
2. **USDG + Morpho lending on Robinhood Chain** — regulated yield dollar. *Human behavior:* "put money aside." *Hides chain:* yes.
3. **MPP / x402 signed-authorization payments** — pay-per-call without gas or approvals. *Human behavior:* buying small things from software. *Hides chain:* completely.
4. **ZeroDev smart accounts** (passkeys, session keys, gas sponsorship) — *Human behavior:* "log in with Face ID, let my agent spend up to $20." 
5. **ERC-8004 identity/reputation/validation registries** — *Human behavior:* "is this agent trustworthy enough to lend to?"
6. **Robinhood MCP Trading/Banking + Agentic Accounts** — brokerage sandbox for agents. *Hides chain:* the chain becomes the agent's 24/7 overflow venue.
7. **Predictable fees post-Dia** — micro-transactions and many small scheduled txs.
8. **Fhenix CoFHE** — compute on encrypted amounts. *Human behavior:* "pay people without everyone seeing salaries."
9. **Stylus (96 KB)** — heavy math onchain: options pricing, actuarial tables, portfolio optimizers. Use on Robinhood Chain/testnet.
10. **Orbit chain stack** — Robinhood Chain is itself the demo that "serious institutions pick Arbitrum"; building there is ecosystem alignment by construction.

## 10. Interesting user behaviors worth targeting

- **Saving toward a specific goal with a specific asset** ("I want to own 10 NVDA by December").
- **Giving equity instead of cash**: birthdays, weddings, red packets (ang bao in Singapore, lì xì in Vietnam, hongbao across SEA). Stock gifting is culturally huge in Asia and legally impossible for most of the world's brokers to do cross-border.
- **Remote workers in SEA/Africa paid in USD stablecoins** who want part of their pay to become US-equity exposure automatically.
- **Small merchants** wanting to park float in yield without "investing."
- **Friends pooling money** on a thesis (group chat → shared basket).
- **Hedging a real-life exposure**: a Filipino freelancer paid by a US startup cares about USD/PHP and tech stocks; a Vietnamese Grab driver cares about fuel prices.
- **Agents buying things for people**: data, API calls, flight checks, with hard spending caps.
- **People who distrust "investing" but trust "rules"**: "If Apple drops 10%, buy $50" is a rule, not a trade.

## 11. Concept portfolio (16 concepts)

### C1. Ang Bao — stock gifting in a link
- **One line:** Send anyone a fraction of a real stock through a link or QR; they claim it with Face ID, no app, no wallet, no bank.
- **Insight:** Gifting equity is a strong cultural behavior in Asia (red packets) and in the West (gift a share), but cross-border it is nearly impossible. Stock Tokens + ZeroDev passkeys make it a 10-second flow.
- **User:** Relatives abroad, employers giving bonuses, creators rewarding fans.
- **Current behavior:** Cash transfers, gift cards, Stockpile (US-only).
- **Experience:** Pick AAPL, amount in USDG, add a note → link/QR → recipient taps, passkey created, token lands in a sponsored smart account. Unclaimed after 30 days returns to sender.
- **Why here:** Stock Tokens are ERC-20s on a permissionless chain with gas sponsorship; eligible in 120+ countries.
- **Novelty:** Equity as a social object; claim-with-passkey escrow; the gift grows via `uiMultiplier` (dividends reinvested) so the gift is "alive."
- **Loop:** Every gift creates a new wallet holder who can gift onward. Receiver → sender.
- **Demo:** Judge receives an ang bao on their phone during the pitch and owns 0.01 NVDA within 15 seconds.
- **Buildability:** High. Escrow contract + ZeroDev + Chainlink display. 
- **Risks:** Legal eligibility by jurisdiction; "gift card" comparisons; need to show it's not just a wallet.

### C2. Stock Sprint — rule-based auto-invest for stablecoin earners
- **One line:** Set a rule like "every Friday, move $20 of my USDG into AAPL, and double it if AAPL is down 5% that week," and a contract runs it forever.
- **Insight:** DRIP/round-ups are the stickiest retail finance features, and there is no such thing for non-US users with stablecoins. Chainlink feeds make conditional rules trivial.
- **User:** Remote workers and freelancers in SEA/LatAm/Africa paid in stablecoins.
- **Current behavior:** Manually converting to local fiat, then (maybe) a local broker with no US equities.
- **Experience:** Deposit USDG (earning on Morpho while idle) → compose rules in plain language → view progress toward goals.
- **Why here:** USDG yield + Stock Tokens + price feeds all on one chain; a keeper/agent executes via session keys.
- **Novelty:** Idle cash earns yield until the rule fires; conditional rules reference live oracle prices; no custodian.
- **Loop:** Shareable rule templates ("copy this rule"), weekly executions bring users back.
- **Demo:** Simulate a price drop on testnet → rule fires → balance moves.
- **Buildability:** High.
- **Risks:** "Just a DCA bot"; must emphasize goal/rule UX and yield-while-waiting.

### C3. PaySlice — payroll with an equity slice
- **One line:** Employers pay global contractors in USDG and let each worker auto-convert a chosen percentage into Stock Tokens, like an ESPP for the remote economy.
- **Insight:** Remote workforces want wealth-building, not just pay; employers want retention tools; Stock Tokens make "pay in Apple" legal-light and instant.
- **User:** Startups paying contractors in SEA/Africa/LatAm; the contractors.
- **Current behavior:** Deel/Remote pay in fiat; equity for contractors is rare.
- **Experience:** Employer uploads payroll CSV → one tx streams USDG → each worker's allocation rule converts a slice; worker sees "you own 2.3 MSFT from salary."
- **Why here:** Batch settlement is cheap; Stock Tokens; Fhenix later for private salaries.
- **Novelty:** Equity slice at payroll level; privacy upgrade path via CoFHE.
- **Loop:** Employer integrates → workers onboard → workers refer employers.
- **Demo:** Run payroll for 10 workers in one click; balances update live.
- **Buildability:** High.
- **Risks:** B2B sales cycle; needs a live employer at Founder House.

### C4. Collateral Card — borrow against stocks for everyday spending (with soft liquidation)
- **One line:** Spend USDG against your Stock Tokens with a conservative LTV and a "grace repair" period instead of instant liquidation.
- **Insight:** Lending markets on Robinhood Chain are built for traders. Consumers want a Lombard loan with safety rails.
- **Why here:** 24/7 feeds, `oraclePaused()` handling, Morpho liquidity.
- **Novelty:** Non-instant liquidation via time-weighted price + auto-top-up from USDG yield.
- **Risks:** Lending is crowded; must differentiate on consumer safety.

### C5. Agent Allowance — session-keyed spending caps for AI agents
- **One line:** Give any AI agent a passkey-approved wallet with a budget, allowed merchants, and per-call limits; it pays via MPP/x402 and you watch every receipt.
- **Insight:** The scary part of agents is money. ZeroDev session keys + MPP signed authorizations = a parental-controls layer for agents.
- **User:** Anyone running Claude/ChatGPT agents that need to buy data/compute; developers.
- **Current behavior:** Prepaid API keys and credit cards given to agents.
- **Why here:** `arbitrum-mpp`, x402 facilitator, ZeroDev, ERC-8004 identity in one place.
- **Novelty:** Policies enforced onchain, not by the agent's good behavior.
- **Loop:** Agents expose a QR "fund me"; merchants accept MPP; each agent integration brings its merchants.
- **Demo:** Agent tries to overspend → blocked onchain; tries allowed purchase → settles, receipt appears.
- **Buildability:** High.
- **Risks:** Looks like a wallet; must lead with policy + receipts.

### C6. Oracle Promises — conditional payments keyed to real stock prices
- **One line:** Write a payment that only happens if a market condition is true: "Pay my cofounder $5K if TSLA is above $X on Oct 31," settled by Chainlink feeds.
- **Insight:** Stock-conditioned agreements (earn-outs, bonuses, bets, hedges) are everywhere in business and impossible to self-execute today.
- **Why here:** 2,000 feeds, 24/7, cheap.
- **Novelty:** A "promise" primitive rather than a market.
- **Risks:** Prediction-market adjacency; stay on agreements, not trading.

### C7. Dividend Faucet — stream the growth, keep the stock
- **One line:** Deposit Stock Tokens; the `uiMultiplier` growth (reinvested dividends) is tokenized separately and can be streamed to someone else.
- **Insight:** ERC-8056 multiplier is an onchain dividend ledger nobody uses. Xero Protocol attempted principal/yield split; the consumer version is "give my parents the dividends, keep the shares."
- **Risks:** Xero exists (GitHub); differentiate with streaming to recipients and gifting.

### C8. Basket Chat — group-chat investing
- **One line:** A group of friends creates a shared basket of Stock Tokens; contributions and rebalances happen through chat commands; everyone holds a proportional ERC-20.
- **Insight:** Investing is social in SEA (Telegram/Discord groups); baskets are already a proven winner (EqualFi) but not social.
- **Risks:** Marketplace/social gravity; keep it to one basket per group.

### C9. Hedge Me — one-tap life hedges
- **One line:** "I'm paid in USD, live in the Philippines, and work for a tech startup" → a personal hedge made from Stock Tokens, USDG, and simple options settled on feeds.
- **Novelty:** Hedging as a consumer product; Stylus for pricing on Robinhood Chain.
- **Risks:** Complex; may be a 2-minute demo rather than 30 seconds.

### C10. Agent Credit Bureau — ERC-8004 reputation that gates money
- **One line:** Agents earn onchain credit limits from verified performance; lenders fund agent working capital against reputation.
- **Insight:** Foundation asked for reputation layers; Bond.Credit won on agent underwriting. The gap is a visible loop where reputation changes credit in real time.
- **Risks:** Infra-shaped; needs demo of money moving on a reputation event.

### C11. Merchant Float — USDG acceptance that earns until you need it
- **One line:** Singapore/SEA merchants accept USDG at the counter; float automatically earns on Morpho and auto-pays suppliers on invoice due dates.
- **Why here:** USDG is MAS-regulated; Robinhood Earn rails.
- **Risks:** Payments graveyard; must lead with the treasury automation.

### C12. StockQuest — a game where the pieces are real stocks
- **One line:** A fantasy-league style game where each pick locks a tiny real Stock Token position and the leaderboard is settled by Chainlink feeds, 24/7.
- **Insight:** Fantasy finance apps are sticky; using real tokens means winners actually own something.
- **Risks:** Gambling optics; keep stakes tiny and educational.

### C13. Receipt Rail — agent-to-business invoices via MPP
- **One line:** Any API or SaaS can add one header and get paid per request in USDG by agents, with a human-readable receipt ledger.
- **Insight:** Offchain Labs published the code; nobody has made the merchant side delightful.
- **Risks:** Developer-tool gravity; needs a consumer-visible moment.

### C14. Night Shift — 24/7 price protection for the Robinhood-eligible world
- **One line:** Buy overnight "insurance" on your Stock Tokens (a put) for the hours US markets are closed, priced by a Stylus engine on Robinhood Chain.
- **Insight:** 24/7 trading creates a new risk window nobody hedges.
- **Risks:** Derivatives complexity; liquidity for the other side.

### C15. Private Payroll (Fhenix)
- **One line:** Salaries settle in USDG with encrypted amounts; auditors get selective disclosure.
- **Risks:** Fhenix mainnet lands Oct 21 (after the Buildathon). Good Founder House story, hard Buildathon demo.

### C16. Family Office in a Chat
- **One line:** A household finance agent that holds an Agentic Account on Robinhood and a wallet on Robinhood Chain and enforces house rules ("never more than 30% in one stock; keep 3 months of USDG").
- **Risks:** Agent-trader gravity; must demo rule enforcement, not trading.

## 12. Combination-engine concepts

- **Stock Tokens (primitive) + red-packet culture (human behavior) + cross-border gifting pain (painful workflow)** → **C1 Ang Bao**. Strongest combination found.
- **Session keys + MPP + the "agents are scary with money" fear** → **C5 Agent Allowance**.
- **Chainlink equity feeds + contracts/earn-outs + escrow winners (Kustodia)** → **C6 Oracle Promises**: escrow that releases on market conditions.
- **USDG yield + DCA behavior + oracle conditions** → **C2 Stock Sprint**.
- **ESPP (successful Web2 product) − the employer's legal overhead + Stock Tokens** → **C3 PaySlice**.
- **Boring infra (ERC-8056 multiplier) + beautiful UX (streams to grandma)** → **C7 Dividend Faucet**.
- **Ang Bao + Stock Sprint** → gifts that keep buying: a gift that also sets up a weekly $5 rule for the recipient. A single product could do both.

## 13. Five deep dives

### Deep dive 1 — Ang Bao (stock gifting via claimable links)

1. **Thesis:** Equity is the best gift nobody can give across borders. Robinhood Chain makes a fraction of a US stock a bearer-claimable object that works in 120+ countries with no account.
2. **User story:** Mei in Singapore sends her nephew in Manila 0.05 AAPL for his graduation. He taps the link, uses Face ID, and sees "You own a piece of Apple. It's grown 0.3% since Mei sent it."
3. **UX flow:** Sender: choose stock → amount in USDG → message → pay with USDG (ZeroDev sponsored gas; or on-ramp) → link + QR. Recipient: open link → passkey creation → claim → portfolio page with price from Chainlink and multiplier growth. Unclaimed gifts auto-refund after 30 days.
4. **Screens:** Send (3 fields), Link/QR, Claim, "My gifts" portfolio, Regift.
5. **Architecture:** `GiftEscrow` contract on Robinhood Chain holding Stock Tokens keyed to a claim hash (link secret); swap USDG → Stock Token via Uniswap/Rialto router at send time; ZeroDev account factory for recipients with passkey signer; paymaster for gas; Chainlink feed + `uiMultiplier()` for display; Robinhood REST (`/rhj/`) for metadata.
6. **Integrations:** Robinhood Chain, ZeroDev, Uniswap, Chainlink, USDG.
7. **Why judges notice:** Visible, emotional, on Robinhood Chain, uses Stock Tokens as *objects* not trades, creates new wallet holders (growth metric Robinhood cares about).
8. **Business model:** Small spread on the USDG→stock swap; premium gift cards/corporate bulk gifting.
9. **Path to product:** Corporate gifting (employee bonuses in stock), creator tipping in stock, holiday campaigns (Lunar New Year 2027 is Feb 17).
10. **Distribution:** Every gift is an acquisition; links spread through WhatsApp/Telegram/LINE.
11. **30-second demo:** Pick NVDA, $10, "Congrats", tap send; judge scans QR; Face ID; "You own 0.00X NVDA." Done.
12. **2-minute demo:** Add: regift to another judge; show escrow refund timer; show multiplier growth from a dividend event on testnet; show corporate bulk send CSV.
13. **Don't build:** On-ramp integrations, multiple chains, social feed, NFT wrappers.
14. **Biggest weakness:** "Is this just a wallet with a link?" and jurisdiction eligibility.
15. **Strengthen:** Position as *gift escrow with lifecycle* (expiry, refund, regift, bulk); show a geo-eligibility check at claim time using Robinhood's eligible-country list; show that sending to someone with no crypto takes under 15 seconds.

### Deep dive 2 — Stock Sprint (conditional auto-invest with yield while waiting)

1. **Thesis:** The stickiest investing behavior is rules, not trades. Nobody offers rule-based US-equity accumulation to stablecoin earners outside the US.
2. **User story:** Dinh, a freelancer in Hanoi paid in USDG, sets "$25 into MSFT every Monday, 2x if MSFT is 5% below its 30-day high." His idle USDG earns ~7% on Morpho until each rule fires.
3. **UX flow:** Deposit → "Create a rule" (template picker + plain-language editor) → goal tracker → weekly digest.
4. **Screens:** Deposit, Rules, Goals, Activity.
5. **Architecture:** `RuleVault` (ERC-4626-like for USDG → Morpho) + `RuleEngine` storing rules (asset, cadence, condition on Chainlink feed, size); executor keeper or agent holding a ZeroDev session key scoped to "execute rule"; swap via Uniswap router; `oraclePaused()` guard. Optional Stylus module for 30-day-high computation on Robinhood Chain.
6. **Integrations:** USDG, Morpho, Chainlink, Uniswap, ZeroDev, Robinhood REST.
7. **Why judges notice:** Shows USDG + Stock Tokens + feeds in one loop; recurring activity; clearly a product.
8. **Business model:** 0.25% on executions or a monthly fee.
9. **Path:** Payroll partners (ties to PaySlice), employer-sponsored plans.
10. **Distribution:** Shareable rule templates; "copy my rule" links.
11. **30-second demo:** Rule exists; push a testnet price drop; rule fires; AAPL balance increases; USDG yield still accruing.
12. **2-minute demo:** Create rule from natural language; show session-key permission scope; show goal completion.
13. **Don't build:** Multi-chain, token launch, social feed, 50 rule types (ship 3).
14. **Weakness:** "DCA bot" perception.
15. **Strengthen:** Make rules *conditional and goal-bound* (not just periodic), and show the yield-while-waiting delta explicitly in dollars.

### Deep dive 3 — Agent Allowance (policy-enforced money for AI agents)

1. **Thesis:** Agents need money the way teenagers do: with limits, approved merchants, and receipts. Enforce it onchain, not in the prompt.
2. **User story:** A developer gives their research agent $50/month, allowed to pay any MPP/x402 endpoint tagged "data," max $2 per call, with a kill switch.
3. **UX flow:** Create allowance (passkey) → policy builder → QR/API key for agent → live receipts feed → one-tap freeze.
4. **Screens:** Allowances, Policy, Receipts, Merchants.
5. **Architecture:** ZeroDev smart account per agent with session key encoding policy (spend cap, allowlist, per-call max, expiry); `arbitrum-mpp` client wrapper so the agent's HTTP client auto-pays; x402 facilitator fallback; ERC-8004 identity for the agent (and reputation attestations from merchants); receipts indexed from events.
6. **Integrations:** ZeroDev, arbitrum-mpp, x402, ERC-8004, USDG/USDC.
7. **Why judges notice:** Directly uses three sponsor-published primitives in a way that answers the top fear about agents.
8. **Business model:** Per-allowance fee, merchant-side take.
9. **Path:** SDK for agent frameworks; "Agent Allowance" as a login-with-money for any MCP server.
10. **Distribution:** Each agent framework integration brings its users; merchants list themselves to get paid.
11. **30-second demo:** Agent requests a $5 dataset → blocked (over cap) → requests $1.50 → paid → receipt appears with merchant and agent identity.
12. **2-minute demo:** Show session-key policy onchain, revoke live, reputation attestation after the purchase.
13. **Don't build:** Your own agent, your own marketplace, token.
14. **Weakness:** Wallet-shaped; crowded "agentic payments" space.
15. **Strengthen:** Make the *policy* and *receipts* the product; demo with a real external MPP merchant.

### Deep dive 4 — Oracle Promises (market-conditioned agreements)

1. **Thesis:** Thousands of real agreements (earn-outs, bonuses, hedges between friends, vendor incentives) depend on public stock prices and are enforced by trust and lawyers. Chainlink equity feeds on a permissionless chain turn them into self-executing promises.
2. **User story:** A startup promises a contractor a $3K bonus if its public competitor's stock falls below $X (a proxy milestone) by year end; funds are escrowed in USDG; it pays or refunds automatically.
3. **UX flow:** Create promise (counterparty, condition on a feed, deadline, amount) → both sign with passkeys → funds escrowed (USDG earns on Morpho until resolution) → auto-settle.
4. **Screens:** New promise, Promise page (live condition status), My promises.
5. **Architecture:** `PromiseEscrow` with condition types (above/below/between at deadline; touched during window), Chainlink feed reads with `oraclePaused()` fallback and dispute window, ERC-8004 optional for agent counterparties.
6. **Integrations:** Chainlink, USDG, Morpho, ZeroDev.
7. **Why judges notice:** New financial primitive (the Promising Products track), not a market.
8. **Model:** Fee on escrow; template library.
9. **Path:** Earn-outs for M&A, sales commissions tied to KPIs via oracles, agent-to-agent SLAs.
10. **Distribution:** Each promise has two parties; the counterparty becomes a user.
11. **30-second demo:** Two phones sign; price crosses; money moves.
12. **2-minute demo:** Show earned yield during escrow; show pause handling; show agent counterparty.
13. **Don't build:** An order book, tokens, generic prediction markets.
14. **Weakness:** Gambling/prediction-market optics.
15. **Strengthen:** Require a named counterparty and a stated purpose; no public pools.

### Deep dive 5 — PaySlice (payroll with an equity slice, Singapore-anchored)

1. **Thesis:** The remote-work economy pays in dollars and offers no wealth-building. Stock Tokens + USDG make "part of your salary becomes Apple" a one-line config for employers.
2. **User story:** A Singapore startup pays 12 contractors across SEA; each sets an equity slice; payroll runs in one transaction.
3. **UX flow:** Employer: upload CSV, fund USDG, run. Worker: set slice %, pick assets, see holdings and payslips.
4. **Screens:** Employer dashboard, Run payroll, Worker allocation, Payslip.
5. **Architecture:** `PayrollBatch` contract (USDG transfers + per-worker swap routing), worker preference registry, ZeroDev worker accounts, Chainlink display, Fhenix upgrade path for confidential amounts after Oct 21.
6. **Integrations:** USDG, Uniswap/Rialto, ZeroDev, Chainlink, Fhenix (roadmap).
7. **Why judges notice:** Payments track + tokenization + Singapore relevance + Robinhood Chain.
8. **Model:** Per-seat fee.
9. **Path:** Partner with a Deel-like or local payroll provider; Founder House GTM.
10. **Distribution:** Employer → workers → their next employer.
11. **30-second demo:** Run payroll; 12 balances update; one worker's slice becomes MSFT.
12. **2-minute demo:** Worker changes allocation; payslip export; privacy roadmap.
13. **Don't build:** Tax engines, fiat off-ramps, HR features.
14. **Weakness:** B2B; needs a real employer.
15. **Strengthen:** Sign one design partner before Founder House; show their logo and a real payroll run on testnet.

## 14. Adversarial judge review

**Ang Bao.** *Seen it?* Gift links yes; stock gift links to no-wallet recipients, no. *Novel?* Equity as a claimable social object with escrow lifecycle. *Why this sponsor?* Only works because Stock Tokens are permissionless ERC-20s on Robinhood Chain. *Product or demo?* Product. *Would anyone use it?* Lunar New Year alone. *Prove it works?* Live claim on judge's phone. *Remember tomorrow?* Yes, if a judge owns stock from it. *Magic moment:* claiming with Face ID. **Modification:** Add corporate bulk send so it's not "just consumer," and show the eligibility gate so the compliance-aware judge relaxes.

**Stock Sprint.** *Seen it?* DCA bots, yes. *Novel?* Conditional rules on real equity feeds with yield while waiting. *Sponsor?* USDG + Stock Tokens + Morpho. *Product?* Yes. *Use?* Freelancers. *Prove?* Rule firing live. *Remember?* Medium. **Modification:** Lead with goals and conditions, show the dollars earned while waiting, and ship "copy this rule" links to make it spread.

**Agent Allowance.** *Seen it?* Agent wallets, yes. *Novel?* Onchain policy via session keys + MPP receipts + ERC-8004 identity. *Sponsor?* Uses three Arbitrum-published primitives. *Product?* Developer product with consumer-readable receipts. *Prove?* Overspend blocked live. *Remember?* Yes, the "blocked" moment. **Modification:** Demo against an external MPP merchant, not your own mock, and add a one-tap freeze.

**Oracle Promises.** *Seen it?* Prediction markets, yes. *Novel?* Named-counterparty agreements, not markets. *Sponsor?* Needs equity feeds on a permissionless chain. *Product?* Yes, templates. *Use?* Startups, sales teams. *Prove?* Live settlement. *Remember?* Yes if the use case is relatable. **Modification:** Lead with earn-out/bonus templates and ban public pools in the demo.

**PaySlice.** *Seen it?* Payroll in stablecoins, yes. *Novel?* Equity slice + privacy roadmap. *Sponsor?* Yes. *Product?* Yes. *Use?* If an employer is onstage. *Prove?* Batch run. *Remember?* Only with a design partner. **Modification:** Bring a real employer or merge into Stock Sprint as the "employer" tier.

**Portfolio-level verdict for the Buildathon (deadline tomorrow):** Build **Ang Bao** as the submission with a Stock Sprint "gift that keeps buying" option only if time allows. It is the shortest path to a memorable demo on Robinhood Chain and lands on a reserved podium lane. **Agent Allowance** is the strongest Promising Products entry if you prefer the agent track. For **Founder House**, Ang Bao + PaySlice as a two-sided "equity for the remote world" company is a coherent pitch.

## 15. Three wildcard concepts

**W1. Dead Man's Portfolio — inheritance that executes itself.**
Stock Tokens and USDG in a smart account with a liveness check (passkey ping every N days); on silence, holdings split to named heirs' claim links (Ang Bao escrow), with a dispute window. Inheritance of brokerage accounts across borders is a nightmare; here it is a contract. Demo: miss a ping on testnet, heirs receive links. Most participants would never build this.

**W2. Quiet Hands — confidential allocation with public settlement (Fhenix).**
A fund manager (or an agent) sets encrypted target weights over Stock Tokens with Fhenix CoFHE; rebalances settle publicly on Robinhood Chain, but the strategy stays private. Solves "copy trading leaks alpha." Risky for the Buildathon (mainnet Oct 21), ideal for Founder House.

**W3. Street Oracle — real-world prices priced in stock.**
A merchant QR that prices goods in a Stock Token ("this coffee is 0.001 NVDA") and settles in USDG using Chainlink feeds at scan time. It's a playful, viral way to make tokenized equities feel like money, and it demonstrates feeds + USDG + Robinhood Chain in a 10-second physical-world moment at a Singapore café.

## 16. Final synthesis

**Unusually promising:** Products that treat Stock Tokens as *objects* (gifts, salary slices, promises, collateral with soft rails) rather than trading pairs; products that put onchain policy around agents' money; anything where USDG earns while it waits for a rule to fire. These align with reserved Robinhood Chain podium spots, the Promising Products track, and the Foundation's "real problem, validated users" filter.

**Overcrowded:** AI trading agents, Stock Token lending forks, RWA baskets, generic remittance apps, dashboards, prediction markets, yield vaults, generic escrow.

**Surprises from research:** (1) Stylus activation was paused on Arbitrum One/Nova on October 2, the day before submissions close, so the "Rust bonus" is a trap unless you deploy on Robinhood Chain or testnet and say so. (2) ERC-8056 `uiMultiplier()` is a live onchain dividend ledger that almost nobody uses. (3) Timeboost is being replaced by Priority Gas Auctions; don't build on express-lane assumptions. (4) Robinhood opened MCP Trading/Banking servers with sandboxed Agentic Accounts, which makes hybrid agents plausible. (5) The hackathon's host city is where USDG is regulated and where 20,000 SMEs already accept stablecoins.

**Most underexploited capability:** Permissionless, 24/7 Chainlink price feeds for ~2,000 equities paired with gas-sponsored passkey accounts on Robinhood Chain. Everyone sees "tradeable stocks." Almost nobody sees "a stock that any contract can hold, price, and act on, claimable by anyone with a face."
