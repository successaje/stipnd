import { keccak256, stringToBytes, type Hex } from "viem";

/**
 * Canonical identity of a purchasable resource. The merchant and the agent must
 * compute the same hash, so the rule is deliberately simple:
 *
 *   keccak256( UPPER(method) + " " + origin + pathname + search )
 *
 * Fragments are dropped. Trailing slashes are kept as sent. Query order matters.
 */
export function canonicalResource(method: string, url: string | URL): string {
  const u = typeof url === "string" ? new URL(url) : url;
  return `${method.toUpperCase()} ${u.origin}${u.pathname}${u.search}`;
}

export function resourceHash(method: string, url: string | URL): Hex {
  return keccak256(stringToBytes(canonicalResource(method, url)));
}
