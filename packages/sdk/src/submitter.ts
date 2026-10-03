import type { Address, Hex, Log } from "viem";

export interface SubmitCall {
  to: Address;
  data: Hex;
}

export interface SubmitResult {
  txHash: Hex;
  /** Whether the user operation itself succeeded (not whether the hub accepted the payment). */
  success: boolean;
  logs: readonly Log[];
}

/**
 * Anything that can execute a call from the stipend owner's account. The default
 * implementation sends a sponsored user operation through ZeroDev with the session key.
 * Tests inject a fake.
 */
export interface Submitter {
  readonly account: Address;
  submit(call: SubmitCall): Promise<SubmitResult>;
}
