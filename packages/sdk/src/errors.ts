import { REJECT_COPY, type Receipt, type RejectReason } from "@stipnd/protocol";

export class StipndError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StipndError";
    this.code = code;
  }
}

/** The hub refused the payment. The attempt is recorded onchain as a receipt. */
export class StipndRejectedError extends StipndError {
  readonly reason: RejectReason;
  readonly receipt: Receipt;
  constructor(reason: RejectReason, receipt: Receipt) {
    const copy = REJECT_COPY[reason];
    super("REJECTED", `${copy.title}. ${copy.detail}`);
    this.name = "StipndRejectedError";
    this.reason = reason;
    this.receipt = receipt;
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
