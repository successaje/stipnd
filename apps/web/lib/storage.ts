/**
 * localStorage with the failure modes handled: private windows, blocked storage,
 * SSR. Values are JSON. Keys are namespaced per chain so a testnet session never
 * leaks into another deployment.
 */
import { appConfig } from "./config";

const NS = `stipnd:${appConfig.chainId}:`;

export function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage unavailable; the session simply will not persist */
  }
}

export function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  session: "session",
  devKey: "dev-key",
  issued: "issued-credentials",
  lastSeen: "last-seen",
} as const;
