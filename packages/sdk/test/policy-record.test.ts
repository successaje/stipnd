import { describe, expect, it } from "vitest";
import { buildSessionPolicies, policiesFromSerialized, serializePolicyParams } from "../src/owner";
import { HUB } from "./helpers";

describe("policy record round trip", () => {
  it("serializes installed policies (bigints included) and rebuilds identical policy data", () => {
    const original = buildSessionPolicies({
      hub: HUB,
      stipendId: 7n,
      perCallCap: 500_000n,
      expiresAt: 2_000_000_000,
    });
    const serialized = serializePolicyParams(original);
    expect(serialized).toContain("$bigint");

    const rebuilt = policiesFromSerialized(serialized);
    expect(rebuilt).toHaveLength(original.length);
    rebuilt.forEach((p, i) => {
      expect(p.getPolicyData()).toBe(original[i]!.getPolicyData());
      expect(p.getPolicyInfoInBytes()).toBe(original[i]!.getPolicyInfoInBytes());
    });
  });

  it("rejects unknown policy types", () => {
    expect(() => policiesFromSerialized('[{"type":"mystery"}]')).toThrow(/Unknown policy type/);
  });
});
