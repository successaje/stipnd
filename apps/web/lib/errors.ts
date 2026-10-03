/**
 * Turns wallet, bundler, RPC and contract errors into one sentence a person can act on.
 * Never shows a stack trace. The raw error stays available in the console.
 */
export function humanizeError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)) || "";
  const name = e instanceof Error ? e.name : "";
  const lower = msg.toLowerCase();

  if (
    name === "NotAllowedError" ||
    lower.includes("operation either timed out or was not allowed")
  ) {
    return "The passkey prompt was cancelled. Nothing was sent.";
  }
  if (lower.includes("user rejected") || lower.includes("rejected the request")) {
    return "You cancelled the signature. Nothing was sent.";
  }
  if (lower.includes("passkey") && lower.includes("not found")) {
    return "No passkey found for this site on this device. Create one instead.";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("timeout")
  ) {
    return "Network problem talking to the RPC or bundler. Nothing was sent; try again.";
  }
  if (lower.includes("aa21") || lower.includes("prefund")) {
    return "Gas sponsorship was not applied. Check the ZeroDev project's paymaster policy.";
  }
  if (lower.includes("paymaster") || lower.includes("sponsor")) {
    return "Gas sponsorship was declined by the paymaster. Check the ZeroDev project policies.";
  }
  if (lower.includes("insufficient") && lower.includes("balance")) {
    return "Not enough tokens in the account for this amount.";
  }
  if (
    lower.includes("transfer amount exceeds balance") ||
    lower.includes("erc20insufficientbalance")
  ) {
    return "The account does not hold enough tokens. Fund it first.";
  }
  if (lower.includes("notowner")) return "Only the stipend owner can do that.";
  if (lower.includes("invalidpolicy"))
    return "That policy is not valid. Check the caps and windows.";
  if (lower.includes("useroperation reverted") || lower.includes("execution reverted")) {
    return "The transaction reverted onchain. Your funds are unchanged.";
  }
  if (lower.includes("chain") && lower.includes("mismatch")) {
    return "Wrong network. This app is configured for a different chain.";
  }
  if (msg.length > 0 && msg.length < 140) return msg;
  return "Something went wrong. Nothing was sent; try again.";
}
