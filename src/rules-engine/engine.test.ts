import { describe, expect, it } from "vitest";
import { computeFeasibility, resolveFsi, worstStatus, getRuleset } from "./engine";
import type { Assumptions, PropertyInputs, TaggedValue } from "./types";

const v = <T>(value: T, status = "verified" as const): TaggedValue<T> => ({
  value,
  status,
});

/** Test plot: 2,000 sq m redevelopment plot on a 12 m road in a non-congested area. */
const inputs: PropertyInputs = {
  jurisdiction: "mh-udcpr",
  plotAreaSqm: v(2000),
  roadWidthM: v(12),
  zoneType: v("residential"),
  existingBuaSqm: v(1500),
  numExistingMembers: v(40),
};

const assumptions: Assumptions = {
  constructionCostPerSqm: v(30000), // ≈ ₹2,800/sq ft all-in construction
  salePricePerSqm: v(150000), // ≈ ₹14,000/sq ft sale rate
  otherCostsPct: v(0.25), // approvals, finance, marketing
};

describe("resolveFsi", () => {
  it("picks the right road-width band", () => {
    const rs = getRuleset("mh-udcpr-0.1");
    // 12 m road falls in the 12–15 band (bands are [prev, max))
    const ent = resolveFsi(inputs, rs);
    expect(ent.premium).toBe(0.3);
    expect(ent.tdr).toBe(1.1);
  });

  it("applies the large-plot basic FSI for plots >= 1000 sq m", () => {
    const rs = getRuleset("mh-udcpr-0.1");
    const ent = resolveFsi(inputs, rs);
    expect(ent.basic).toBe(1.25); // not 1.1 — 2000 sq m plot
    expect(ent.ruleIds).toContain("large_plot_basic_fsi");
  });

  it("uses the standard basic FSI for small plots", () => {
    const rs = getRuleset("mh-udcpr-0.1");
    const small = { ...inputs, plotAreaSqm: v(500) };
    expect(resolveFsi(small, rs).basic).toBe(1.1);
  });
});

describe("computeFeasibility", () => {
  const result = computeFeasibility(inputs, assumptions, "mh-udcpr-0.1");

  it("stacks the three scenarios correctly", () => {
    const { conservative, base, optimised } = result.scenarios;
    expect(conservative.permissibleFsi.value).toBe(1.25); // basic only
    expect(base.permissibleFsi.value).toBe(1.55); // + premium 0.3
    expect(optimised.permissibleFsi.value).toBe(2.65); // + TDR 1.1
  });

  it("computes buildable area = FSI × plot area", () => {
    expect(result.scenarios.base.buildableBuaSqm.value).toBe(3100); // 1.55 × 2000
  });

  it("deducts rehab before saleable area", () => {
    const base = result.scenarios.base;
    expect(base.rehabAreaSqm?.value).toBe(1800); // 1500 × 1.2
    // (3100 − 1800) × 0.75 = 975
    expect(base.saleableAreaSqm.value).toBe(975);
  });

  it("computes money and viability", () => {
    const base = result.scenarios.base;
    expect(base.totalCostInr.value).toBe(Math.round(3100 * 30000 * 1.25));
    expect(base.totalRevenueInr.value).toBe(Math.round(975 * 150000));
    expect(base.surplusInr.value).toBe(
      base.totalRevenueInr.value - base.totalCostInr.value,
    );
    expect(base.viable).toBe(base.surplusInr.value > 0);
  });

  it("is deterministic: same inputs → same numbers", () => {
    const again = computeFeasibility(inputs, assumptions, "mh-udcpr-0.1");
    const strip = (r: typeof result) => ({ ...r, computedAt: "x" });
    expect(strip(again)).toEqual(strip(result));
  });

  it("every number carries a trace with rule ids and a data status", () => {
    for (const s of Object.values(result.scenarios)) {
      for (const n of [s.permissibleFsi, s.buildableBuaSqm, s.saleableAreaSqm, s.totalCostInr, s.totalRevenueInr, s.surplusInr]) {
        expect(n.ruleIds.length).toBeGreaterThan(0);
        expect(n.worstStatus).toBeDefined();
      }
    }
  });

  it("regulatory numbers are flagged as requiring professional verification", () => {
    // The FSI table is unverified, so FSI-derived numbers must carry that flag.
    expect(result.scenarios.base.permissibleFsi.worstStatus).toBe(
      "requires_professional_verification",
    );
  });

  it("rejects invalid inputs", () => {
    expect(() =>
      computeFeasibility(
        { ...inputs, plotAreaSqm: v(0) },
        assumptions,
        "mh-udcpr-0.1",
      ),
    ).toThrow();
    expect(() => computeFeasibility(inputs, assumptions, "nope")).toThrow();
  });
});
