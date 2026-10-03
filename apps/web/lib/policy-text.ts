import { formatAmount, formatDuration, MerchantMode, type Policy } from "@stipnd/protocol";
import { appConfig } from "./config";

const sym = () => appConfig.token.symbol;
const dec = () => appConfig.token.decimals;

/** One plain-English sentence per rule. Used in the creation form and the policy tab. */
export function policySentences(p: Policy): string[] {
  const out: string[] = [];
  out.push(
    p.periodLength === 0
      ? `Up to ${formatAmount(p.periodBudget, dec())} ${sym()} in total, no refill.`
      : `Up to ${formatAmount(p.periodBudget, dec())} ${sym()} every ${formatDuration(p.periodLength)}.`,
  );
  out.push(`No single payment above ${formatAmount(p.perCallCap, dec())} ${sym()}.`);
  if (p.maxCallsPerWindow > 0) {
    out.push(`At most ${p.maxCallsPerWindow} payments per ${formatDuration(p.rateWindow)}.`);
  }
  if (p.maxSameResource > 0) {
    out.push(
      `The same resource at most ${p.maxSameResource} times per ${formatDuration(p.duplicateWindow)}.`,
    );
  }
  switch (p.merchantMode) {
    case MerchantMode.Any:
      out.push("Any merchant.");
      break;
    case MerchantMode.Allowlist:
      out.push("Only merchants on the allowlist.");
      break;
    case MerchantMode.Verified:
      out.push(
        p.minMerchantSettlements > 0
          ? `Only verified merchants with at least ${p.minMerchantSettlements} settled payments.`
          : "Only verified merchants.",
      );
      break;
    case MerchantMode.VerifiedOrAllowlist:
      out.push(
        p.minMerchantSettlements > 0
          ? `Verified merchants with ${p.minMerchantSettlements}+ settlements, or the allowlist.`
          : "Verified merchants, or the allowlist.",
      );
      break;
  }
  if (p.expiresAt > 0) {
    out.push(
      `Expires ${new Date(p.expiresAt * 1000).toLocaleDateString(undefined, { dateStyle: "medium" })}.`,
    );
  }
  return out;
}

export function merchantModeLabel(m: MerchantMode): string {
  return (
    {
      [MerchantMode.Any]: "Any merchant",
      [MerchantMode.Allowlist]: "Allowlist only",
      [MerchantMode.Verified]: "Verified only",
      [MerchantMode.VerifiedOrAllowlist]: "Verified or allowlist",
    } as Record<MerchantMode, string>
  )[m];
}
