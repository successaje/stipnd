# Build Log

Milestones, in order. Checked when merged to `main`.

- [x] Product model written (`docs/PRODUCT.md`)
- [x] Architecture established (`docs/ARCHITECTURE.md`)
- [x] Repository initialized (workspace, tooling, CI) — PR #1
- [x] Contracts implemented (`StipendHub`, `MerchantRegistry`) — PR #1
- [x] Contracts tested (policy invariants, failure states, fuzz) — PR #1
- [x] Protocol package (types, ABIs, chain config, formats) — PR #2
- [x] SDK: credential, 402 handling, pay, receipt verification — PR #2
- [x] Reference merchant with settlement verification — PR #2
- [x] Reference agent (normal, over-cap, loop, status) — PR #2
- [x] Design system (tokens, primitives, motion) — PR #3
- [x] Web shell: landing, app layout, navigation — PR #3
- [x] Onboarding: passkey account, session restore, dev signer — PR #3
- [x] Primary workflow: create stipend (approve + create in one op) — PR #3
- [x] Testnet deployment (Arbitrum Sepolia) and defaults — PR #3
- [x] Stipend detail: receipts, connect/issue/revoke, freeze, fund, withdraw, rules — PR #4
- [x] Merchant directory, merchant detail, registration script — PR #5
- [x] Web unit tests — PR #5
- [x] Documentation pass (README, deployments)
- [x] End-to-end run on Arbitrum Sepolia with a ZeroDev project: create → issue → agent pays → over-cap refused → loop refused onchain ×3 and agent halts → freeze refused onchain → merchant registered (2026-10-04, stipend #1, fixes in PR #8)
- [ ] Loading / error / empty state audit
- [ ] Responsive and motion audit
- [ ] Accessibility pass (focus order, labels, contrast)
- [ ] Production web deployment
- [ ] Demo narrative and recording notes
