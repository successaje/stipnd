import { formatUnits, parseUnits } from "viem";

/** "12.50" style, trimming useless zeros but keeping at least two decimals for money. */
export function formatAmount(amount: bigint, decimals: number, maxFraction = 2): string {
  const raw = formatUnits(amount, decimals);
  const [whole = "0", frac = ""] = raw.split(".");
  const trimmed = frac.replace(/0+$/, "");
  const shown = trimmed.length > maxFraction ? trimmed.slice(0, maxFraction) : trimmed;
  const fraction = shown.padEnd(Math.min(2, maxFraction), "0");
  const wholeWithSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${wholeWithSep}.${fraction}` : wholeWithSep;
}

export function formatMoney(amount: bigint, decimals: number, symbol: string): string {
  return `${formatAmount(amount, decimals)} ${symbol}`;
}

export function parseAmount(input: string, decimals: number): bigint {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d*(\.\d*)?$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    throw new Error("Enter a number like 25 or 0.50");
  }
  return parseUnits(cleaned, decimals);
}

export function shortAddress(address: string, chars = 4): string {
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

const UNITS: Array<[number, string]> = [
  [86400 * 30, "month"],
  [86400 * 7, "week"],
  [86400, "day"],
  [3600, "hour"],
  [60, "minute"],
  [1, "second"],
];

/** "1 hour", "2 days", "30 days" */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "never";
  for (const [size, label] of UNITS) {
    if (seconds % size === 0) {
      const n = seconds / size;
      return `${n} ${label}${n === 1 ? "" : "s"}`;
    }
  }
  return `${seconds} seconds`;
}

export function timeUntil(unixSeconds: number, now = Math.floor(Date.now() / 1000)): string {
  const diff = unixSeconds - now;
  if (diff <= 0) return "now";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.ceil(diff / 60)}m`;
  if (diff < 86400) return `${Math.ceil(diff / 3600)}h`;
  return `${Math.ceil(diff / 86400)}d`;
}
