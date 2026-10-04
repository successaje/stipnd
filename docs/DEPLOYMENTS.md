# Deployments

## Web

Production: https://stipnd.vercel.app (Vercel project `stipnd`, root directory `apps/web`, env `NEXT_PUBLIC_ZERODEV_PROJECT_ID`). Deployed 2026-10-04 from `main`.

## Arbitrum Sepolia (chain id 421614)

| Contract                         | Address                                                                                                                        | Deployed at block |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `StipendHub`                     | [`0xb4e1602533425E670E0FA286FA87FeFF27Bd3197`](https://sepolia.arbiscan.io/address/0xb4e1602533425E670E0FA286FA87FeFF27Bd3197) | 315441522         |
| `MerchantRegistry`               | [`0x3C0c5EDCb291374F8895FA4b0cC21c8D557aF97E`](https://sepolia.arbiscan.io/address/0x3C0c5EDCb291374F8895FA4b0cC21c8D557aF97E) | 315441513         |
| Stipend token (Circle test USDC) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`                                                                                   | –                 |
| ERC-8004 IdentityRegistry        | not configured (zero address); verified mode requires registration only                                                        | –                 |

Deployed 2026-10-03 with `script/Deploy.s.sol`. Sources submitted to Sourcify. The raw record lives in `packages/contracts/deployments/421614.json` and is mirrored in `@stipnd/protocol`'s `DEPLOYMENTS` map, which the web app and merchant use as defaults.

The registry owner (able to set the hub address and the identity registry) is the throwaway deployer `0xe078d09e0a28973Dd8ea3Ea3e49DF60eFD746a83`. The hub has no owner.
