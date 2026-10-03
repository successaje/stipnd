import { describe, expect, it } from "vitest";
import { MerchantMode } from "@stipnd/protocol";
import {
  defaultPolicyForm,
  parsePolicyForm,
  policyToForm,
} from "../components/stipend/policy-form";

const DEC = 6;

describe("parsePolicyForm", () => {
  it("parses the defaults into a valid policy", () => {
    const { policy, errors } = parsePolicyForm(defaultPolicyForm, DEC);
    expect(errors).toEqual({});
    expect(policy.periodBudget).toBe(60_000_000n);
    expect(policy.perCallCap).toBe(500_000n);
    expect(policy.periodLength).toBe(2_592_000);
    expect(policy.maxCallsPerWindow).toBe(120);
    expect(policy.maxSameResource).toBe(3);
    expect(policy.merchantMode).toBe(MerchantMode.Any);
    expect(policy.expiresAt).toBe(0);
  });

  it("rejects a per-call cap above the budget", () => {
    const { errors } = parsePolicyForm({ ...defaultPolicyForm, budget: "1", perCall: "2" }, DEC);
    expect(errors.perCall).toMatch(/exceed/);
  });

  it("requires an allowlist in allowlist mode and validates addresses", () => {
    const empty = parsePolicyForm(
      { ...defaultPolicyForm, merchantMode: MerchantMode.Allowlist },
      DEC,
    );
    expect(empty.errors.allowlist).toMatch(/at least one/);
    const bad = parsePolicyForm(
      { ...defaultPolicyForm, merchantMode: MerchantMode.Allowlist, allowlist: "0x123" },
      DEC,
    );
    expect(bad.errors.allowlist).toMatch(/Not an address/);
    const good = parsePolicyForm(
      {
        ...defaultPolicyForm,
        merchantMode: MerchantMode.Allowlist,
        allowlist:
          "0x000000000000000000000000000000000000dEaD,\n0x000000000000000000000000000000000000bEEF",
      },
      DEC,
    );
    expect(good.errors).toEqual({});
    expect(good.allowlist).toHaveLength(2);
  });

  it("disables guards when toggled off", () => {
    const { policy } = parsePolicyForm({ ...defaultPolicyForm, rateOn: false, dupOn: false }, DEC);
    expect(policy.maxCallsPerWindow).toBe(0);
    expect(policy.rateWindow).toBe(0);
    expect(policy.maxSameResource).toBe(0);
    expect(policy.duplicateWindow).toBe(0);
  });

  it("sets an expiry in the future when days are chosen", () => {
    const before = Math.floor(Date.now() / 1000);
    const { policy } = parsePolicyForm({ ...defaultPolicyForm, expiryDays: "30" }, DEC);
    expect(policy.expiresAt).toBeGreaterThanOrEqual(before + 30 * 86400 - 2);
  });
});

describe("policyToForm", () => {
  it("round-trips a policy through the form", () => {
    const { policy } = parsePolicyForm(defaultPolicyForm, DEC);
    const form = policyToForm(policy, DEC, []);
    const again = parsePolicyForm(form, DEC);
    expect(again.policy.periodBudget).toBe(policy.periodBudget);
    expect(again.policy.perCallCap).toBe(policy.perCallCap);
    expect(again.policy.maxCallsPerWindow).toBe(policy.maxCallsPerWindow);
    expect(again.policy.maxSameResource).toBe(policy.maxSameResource);
    expect(again.policy.merchantMode).toBe(policy.merchantMode);
  });
});
