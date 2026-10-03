import type { Address } from "viem";

export interface Deployment {
  chainId: number;
  stipendHub: Address;
  merchantRegistry: Address;
  /** ERC-8004 IdentityRegistry wired into the merchant registry; zero when disabled. */
  identityRegistry: Address;
  /** Block the hub was deployed in. Event indexing starts here. */
  deployBlock: bigint;
  /** Stipend token used by the reference deployment. */
  token: { address: Address; symbol: string; decimals: number };
}

/**
 * Known public deployments. Apps fall back to these when NEXT_PUBLIC_* addresses are not set,
 * so a fresh checkout works against the testnet with only an account-abstraction project id.
 */
export const DEPLOYMENTS: Record<number, Deployment> = {
  421614: {
    chainId: 421614,
    stipendHub: "0xb4e1602533425E670E0FA286FA87FeFF27Bd3197",
    merchantRegistry: "0x3C0c5EDCb291374F8895FA4b0cC21c8D557aF97E",
    identityRegistry: "0x0000000000000000000000000000000000000000",
    deployBlock: 315441522n,
    token: { address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", symbol: "USDC", decimals: 6 },
  },
};

export function getDeployment(chainId: number): Deployment | undefined {
  return DEPLOYMENTS[chainId];
}
