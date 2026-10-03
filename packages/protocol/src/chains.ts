import { defineChain, type Chain } from "viem";
import { arbitrum, arbitrumSepolia, foundry } from "viem/chains";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const robinhoodChainTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
});

export interface ChainInfo {
  chain: Chain;
  label: string;
  explorer: string;
  testnet: boolean;
  /** Well-known USD stablecoin for stipends on this chain, if any. */
  defaultToken?: { address: `0x${string}`; symbol: string; decimals: number };
}

export const CHAINS: Record<number, ChainInfo> = {
  [arbitrumSepolia.id]: {
    chain: arbitrumSepolia,
    label: "Arbitrum Sepolia",
    explorer: "https://sepolia.arbiscan.io",
    testnet: true,
    defaultToken: {
      address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      symbol: "USDC",
      decimals: 6,
    },
  },
  [arbitrum.id]: {
    chain: arbitrum,
    label: "Arbitrum One",
    explorer: "https://arbiscan.io",
    testnet: false,
    defaultToken: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      decimals: 6,
    },
  },
  [robinhoodChain.id]: {
    chain: robinhoodChain,
    label: "Robinhood Chain",
    explorer: "https://robinhoodchain.blockscout.com",
    testnet: false,
  },
  [robinhoodChainTestnet.id]: {
    chain: robinhoodChainTestnet,
    label: "Robinhood Chain Testnet",
    explorer: "https://explorer.testnet.chain.robinhood.com",
    testnet: true,
  },
  [foundry.id]: {
    chain: foundry,
    label: "Local Anvil",
    explorer: "",
    testnet: true,
  },
};

export function getChainInfo(chainId: number): ChainInfo {
  const info = CHAINS[chainId];
  if (!info) throw new Error(`Unsupported chain id ${chainId}`);
  return info;
}

export function explorerTxUrl(chainId: number, txHash: string): string | null {
  const info = CHAINS[chainId];
  if (!info || !info.explorer) return null;
  return `${info.explorer}/tx/${txHash}`;
}

export function explorerAddressUrl(chainId: number, address: string): string | null {
  const info = CHAINS[chainId];
  if (!info || !info.explorer) return null;
  return `${info.explorer}/address/${address}`;
}

/** ZeroDev v3 RPC for a project. Serves bundler and paymaster on one URL. */
export function zeroDevRpc(projectId: string, chainId: number): string {
  return `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chainId}`;
}
