import type { Address, Hex } from "viem";
import { KEYS, readJson, writeJson } from "./storage";

/**
 * Bookkeeping for credentials this browser issued. The credential string itself is never
 * stored; only what is needed to show history and to revoke the session key later.
 */
export interface IssuedRecord {
  stipendId: string;
  label: string;
  sessionKeyAddress: Address;
  permissionId: Hex;
  issuedAt: number;
  revokedAt?: number;
  /** Policy parameters used at issuance; needed to rebuild the permission for revocation. */
  policy: {
    perCallCap: string;
    maxCallsPerWindow: number;
    rateWindow: number;
    expiresAt: number;
    now: number;
  };
}

export function listIssued(stipendId?: string): IssuedRecord[] {
  const all = readJson<IssuedRecord[]>(KEYS.issued) ?? [];
  return stipendId ? all.filter((r) => r.stipendId === stipendId) : all;
}

export function recordIssued(r: IssuedRecord) {
  const all = readJson<IssuedRecord[]>(KEYS.issued) ?? [];
  writeJson(KEYS.issued, [r, ...all]);
}

export function markRevoked(permissionId: Hex) {
  const all = readJson<IssuedRecord[]>(KEYS.issued) ?? [];
  writeJson(
    KEYS.issued,
    all.map((r) => (r.permissionId === permissionId ? { ...r, revokedAt: Date.now() } : r)),
  );
}
