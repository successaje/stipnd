import { describe, expect, it } from "vitest";
import { buildSessionPolicies, RATE_LIMIT_HEADROOM } from "../src/owner";
import { HUB } from "./helpers";

describe("buildSessionPolicies", () => {
  it("always includes a call policy and a paymaster-enforcing gas policy", () => {
    const policies = buildSessionPolicies({ hub: HUB, stipendId: 7n, perCallCap: 1_000_000n });
    expect(policies).toHaveLength(2);
    for (const p of policies) {
      expect(p.getPolicyData()).toMatch(/^0x/);
      expect(p.getPolicyInfoInBytes()).toMatch(/^0x/);
    }
  });

  it("adds rate-limit and timestamp policies when configured", () => {
    const policies = buildSessionPolicies({
      hub: HUB,
      stipendId: 7n,
      perCallCap: 1_000_000n,
      maxCallsPerWindow: 10,
      rateWindow: 3600,
      expiresAt: 2_000_000_000,
      now: 1_900_000_000,
    });
    expect(policies).toHaveLength(4);
    expect(RATE_LIMIT_HEADROOM).toBeGreaterThan(0);
  });
});
