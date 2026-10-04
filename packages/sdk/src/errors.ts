import { REJECT_COPY, type Receipt, type RejectReason } from "@stipnd/protocol";

export class StipndError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StipndError";
    this.code = code;
  }
}

/**
 * The stipend refused the payment. When `receipt` is present the attempt was recorded onchain;
 * otherwise the client stopped it before sending (the hub's preview said it would be refused,
 * or the session key's own policy would have blocked it).
 */
export class StipndRejectedError extends StipndError {
  readonly reason: RejectReason;
  readonly receipt?: Receipt;
  readonly onchain: boolean;
  constructor(reason: RejectReason, receipt?: Receipt) {
    const copy = REJECT_COPY[reason];
    super("REJECTED", `${copy.title}. ${copy.detail}`);
    this.name = "StipndRejectedError";
    this.reason = reason;
    this.receipt = receipt;
    this.onchain = !!receipt;
  }
}

/** The session key's own permission refused the call before it reached the hub. */
export class StipndSessionPolicyError extends StipndError {
  constructor(detail: string) {
    super(
      "SESSION_POLICY",
      `The credential's session key refused this call before it reached the chain: ${detail}`,
    );
    this.name = "StipndSessionPolicyError";
  }
}

/** The client stopped itself after repeated rejections. Call `reset()` to continue. */
export class StipndHaltedError extends StipndError {
  readonly consecutiveRejections: number;
  constructor(n: number) {
    super(
      "HALTED",
      `Stopped after ${n} rejected payments in a row. The owner can see every attempt; fix the cause, then call reset().`,
    );
    this.name = "StipndHaltedError";
    this.consecutiveRejections = n;
  }
}

/** The merchant's challenge cannot be paid from this credential. */
export class StipndChallengeError extends StipndError {
  constructor(message: string) {
    super("CHALLENGE", message);
    this.name = "StipndChallengeError";
  }
}
