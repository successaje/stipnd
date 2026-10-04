import { describe, expect, it } from "vitest";
import { buildSessionPolicies, SESSION_GAS_ALLOWANCE } from "../src/owner";
import { HUB } from "./helpers";

describe("buildSessionPolicies", () => {
  it("always includes a call policy and a bounded gas policy", () => {
    const policies = buildSessionPolicies({ hub: HUB, stipendId: 7n, perCallCap: 1_000_000n });
    expect(policies).toHaveLength(2);
    for (const p of policies) {
      expect(p.getPolicyData()).toMatch(/^0x/);
      expect(p.getPolicyInfoInBytes()).toMatch(/^0x/);
    }
    expect(SESSION_GAS_ALLOWANCE).toBeGreaterThan(0n);
  });

  it("adds an expiry policy when configured and never a rate-limit policy", () => {
    const policies = buildSessionPolicies({
      hub: HUB,
      stipendId: 7n,
      perCallCap: 1_000_000n,
      maxCallsPerWindow: 10,
      rateWindow: 3600,
      expiresAt: 2_000_000_000,
      now: 1_900_000_000,
    });
    expect(policies).toHaveLength(3);
  });
});
