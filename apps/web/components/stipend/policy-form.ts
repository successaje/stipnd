import { isAddress, type Address } from "viem";
import { formatUnits } from "viem";
import { MerchantMode, parseAmount, type Policy } from "@stipnd/protocol";

/** Form state for the policy editor, shared by creation and editing. */
export interface PolicyForm {
  budget: string;
  period: string;
  perCall: string;
  rateOn: boolean;
  rateCount: string;
  rateWindow: string;
  dupOn: boolean;
  dupCount: string;
  dupWindow: string;
  merchantMode: MerchantMode;
  allowlist: string;
  minSettlements: string;
  expiryDays: string;
}

export const PERIODS = [
  { value: "86400", label: "day" },
  { value: "604800", label: "week" },
  { value: "2592000", label: "30 days" },
  { value: "0", label: "one-time" },
];
export const WINDOWS = [
  { value: "3600", label: "hour" },
  { value: "86400", label: "day" },
];
export const EXPIRIES = [
  { value: "0", label: "Never" },
  { value: "30", label: "In 30 days" },
  { value: "90", label: "In 90 days" },
  { value: "365", label: "In a year" },
];

export const defaultPolicyForm: PolicyForm = {
  budget: "60",
  period: "2592000",
  perCall: "0.50",
  rateOn: true,
  rateCount: "120",
  rateWindow: "3600",
  dupOn: true,
  dupCount: "3",
  dupWindow: "3600",
  merchantMode: MerchantMode.Any,
  allowlist: "",
  minSettlements: "0",
  expiryDays: "0",
};

/** Pre-fills the editor from an existing policy. Expiry becomes "keep current" semantics via days left. */
export function policyToForm(p: Policy, decimals: number, allowlist: Address[] = []): PolicyForm {
  const daysLeft =
    p.expiresAt > 0 ? Math.max(1, Math.ceil((p.expiresAt - Date.now() / 1000) / 86400)) : 0;
  const nearest = EXPIRIES.map((e) => Number(e.value)).reduce(
    (best, v) => (Math.abs(v - daysLeft) < Math.abs(best - daysLeft) ? v : best),
    0,
  );
  return {
    budget: formatUnits(p.periodBudget, decimals),
    period: String(p.periodLength),
    perCall: formatUnits(p.perCallCap, decimals),
    rateOn: p.maxCallsPerWindow > 0,
    rateCount: String(p.maxCallsPerWindow || 120),
    rateWindow: String(p.rateWindow || 3600),
    dupOn: p.maxSameResource > 0,
    dupCount: String(p.maxSameResource || 3),
    dupWindow: String(p.duplicateWindow || 3600),
    merchantMode: p.merchantMode,
    allowlist: allowlist.join("\n"),
    minSettlements: String(p.minMerchantSettlements),
    expiryDays: String(daysLeft > 0 ? nearest || 30 : 0),
  };
}

export type PolicyErrors = Partial<Record<keyof PolicyForm, string>>;

export function parsePolicyForm(
  f: PolicyForm,
  decimals: number,
): { policy: Policy; allowlist: Address[]; errors: PolicyErrors } {
  const errors: PolicyErrors = {};
  const num = (v: string, key: keyof PolicyForm) => {
    try {
      const n = parseAmount(v, decimals);
      if (n <= 0n) errors[key] = "Must be greater than zero";
      return n;
    } catch (e) {
      errors[key] = (e as Error).message;
      return 0n;
    }
  };

  const periodBudget = num(f.budget, "budget");
  const perCallCap = num(f.perCall, "perCall");
  if (!errors.perCall && !errors.budget && perCallCap > periodBudget) {
    errors.perCall = "Cap can't exceed the budget";
  }

  const rateCount = f.rateOn ? Number(f.rateCount) : 0;
  if (f.rateOn && (!Number.isInteger(rateCount) || rateCount <= 0))
    errors.rateCount = "Whole number above zero";
  const dupCount = f.dupOn ? Number(f.dupCount) : 0;
  if (f.dupOn && (!Number.isInteger(dupCount) || dupCount <= 0 || dupCount > 65535)) {
    errors.dupCount = "Whole number above zero";
  }

  const allowlist = f.allowlist
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = allowlist.find((a) => !isAddress(a));
  if (bad) errors.allowlist = `Not an address: ${bad.slice(0, 12)}…`;
  if (f.merchantMode === MerchantMode.Allowlist && allowlist.length === 0) {
    errors.allowlist = "Add at least one merchant address";
  }

  const minSettlements = Number(f.minSettlements || 0);
  if (!Number.isInteger(minSettlements) || minSettlements < 0)
    errors.minSettlements = "Whole number";

  const expiryDays = Number(f.expiryDays);
  const expiresAt = expiryDays > 0 ? Math.floor(Date.now() / 1000) + expiryDays * 86400 : 0;

  return {
    policy: {
      periodBudget,
      periodLength: Number(f.period),
      perCallCap,
      maxCallsPerWindow: rateCount,
      rateWindow: f.rateOn ? Number(f.rateWindow) : 0,
      maxSameResource: dupCount,
      duplicateWindow: f.dupOn ? Number(f.dupWindow) : 0,
      minMerchantSettlements: minSettlements,
      merchantMode: f.merchantMode,
      expiresAt,
    },
    allowlist: allowlist as Address[],
    errors,
  };
}
