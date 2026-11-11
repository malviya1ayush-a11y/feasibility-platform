/**
 * Feasibility engine — Day 2: the deterministic calculation pipeline.
 *
 * Pipeline: PropertyInputs + Assumptions + Ruleset
 *   → permissible FSI per scenario (basic / +premium / +TDR)
 *   → buildable BUA → rehab (redevelopment) → saleable area
 *   → costs & revenue → surplus → viability
 *
 * Deterministic and pure: same inputs + same ruleset ⇒ same result, always.
 * AI never calculates. Nothing outside this module may compute a
 * regulatory or financial number.
 */

import type {
  Assumptions,
  DataStatus,
  FeasibilityResult,
  PropertyInputs,
  RuleParam,
  Ruleset,
  ScenarioKind,
  ScenarioResult,
  TracedNumber,
} from "./types";

import mhUdcpr01 from "./rulesets/mh-udcpr-0.1.json";

const RULESETS: Record<string, Ruleset> = {
  "mh-udcpr-0.1": mhUdcpr01 as unknown as Ruleset,
};

export function getRuleset(id: string): Ruleset {
  const rs = RULESETS[id];
  if (!rs) throw new Error(`Unknown ruleset: ${id}`);
  return rs;
}

export const SCENARIOS: ScenarioKind[] = ["conservative", "base", "optimised"];

// ── data-status helpers ─────────────────────────────────────────────

const STATUS_RANK: Record<DataStatus, number> = {
  verified: 0,
  extracted: 1,
  assumed: 2,
  estimated: 3,
  requires_professional_verification: 4,
};

/** The weakest status among contributors — a number is only as good as its shakiest input. */
export function worstStatus(statuses: DataStatus[]): DataStatus {
  return statuses.reduce(
    (w, s) => (STATUS_RANK[s] > STATUS_RANK[w] ? s : w),
    "verified" as DataStatus,
  );
}

function param(rs: Ruleset, id: string): RuleParam {
  const p = rs.params.find((p) => p.id === id);
  if (!p) throw new Error(`Ruleset ${rs.id} missing param: ${id}`);
  return p;
}

// ── FSI resolution ──────────────────────────────────────────────────

interface FsiRow {
  maxRoadWidthM: number | null;
  basicFsi: number;
  premiumFsi: number;
  tdrFsi: number;
}

interface FsiEntitlement {
  basic: number;
  premium: number;
  tdr: number;
  ruleIds: string[];
  statuses: DataStatus[];
}

/** Resolve the FSI entitlement for a plot from the ruleset tables. */
export function resolveFsi(
  inputs: PropertyInputs,
  rs: Ruleset,
): FsiEntitlement {
  const tableParam = param(rs, "fsi_table_residential_noncongested");
  const table = tableParam.value as unknown as FsiRow[];
  const road = inputs.roadWidthM.value;

  const row =
    table.find((r) => r.maxRoadWidthM !== null && road < r.maxRoadWidthM) ??
    table[table.length - 1];

  const ruleIds = [tableParam.id];
  const statuses: DataStatus[] = [tableParam.status, inputs.roadWidthM.status];
  let basic = row.basicFsi;

  // Large-plot override: plots ≥ threshold get a higher basic FSI.
  const largePlot = param(rs, "large_plot_basic_fsi");
  const lp = largePlot.value as unknown as {
    minPlotAreaSqm: number;
    basicFsi: number;
  };
  if (inputs.plotAreaSqm.value >= lp.minPlotAreaSqm && lp.basicFsi > basic) {
    basic = lp.basicFsi;
    ruleIds.push(largePlot.id);
    statuses.push(largePlot.status, inputs.plotAreaSqm.status);
  }

  return { basic, premium: row.premiumFsi, tdr: row.tdrFsi, ruleIds, statuses };
}

// ── the pipeline ────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;

function computeScenario(
  kind: ScenarioKind,
  inputs: PropertyInputs,
  assumptions: Assumptions,
  rs: Ruleset,
): ScenarioResult {
  const ent = resolveFsi(inputs, rs);

  const fsiValue =
    kind === "conservative"
      ? ent.basic
      : kind === "base"
        ? ent.basic + ent.premium
        : ent.basic + ent.premium + ent.tdr;

  const permissibleFsi: TracedNumber = {
    value: r2(fsiValue),
    unit: "FSI",
    ruleIds: ent.ruleIds,
    inputKeys: ["roadWidthM", "plotAreaSqm"],
    worstStatus: worstStatus(ent.statuses),
  };

  // Buildable built-up area = FSI × plot area
  const buildableBuaSqm: TracedNumber = {
    value: r2(fsiValue * inputs.plotAreaSqm.value),
    unit: "sq m",
    ruleIds: ent.ruleIds,
    inputKeys: ["plotAreaSqm", "roadWidthM"],
    worstStatus: worstStatus([...ent.statuses, inputs.plotAreaSqm.status]),
  };

  // Redevelopment rehab: area owed to existing members (0 for greenfield).
  let rehabAreaSqm: TracedNumber | undefined;
  if (inputs.existingBuaSqm && inputs.existingBuaSqm.value > 0) {
    const rehabFactor = param(rs, "rehab_bua_factor");
    rehabAreaSqm = {
      value: r2(inputs.existingBuaSqm.value * (rehabFactor.value as number)),
      unit: "sq m",
      ruleIds: [rehabFactor.id],
      inputKeys: ["existingBuaSqm"],
      worstStatus: worstStatus([
        rehabFactor.status,
        inputs.existingBuaSqm.status,
      ]),
    };
  }

  // Saleable area = (buildable − rehab) × efficiency, never negative.
  const eff = param(rs, "saleable_efficiency");
  const sellableBua = Math.max(
    0,
    buildableBuaSqm.value - (rehabAreaSqm?.value ?? 0),
  );
  const saleableAreaSqm: TracedNumber = {
    value: r2(sellableBua * (eff.value as number)),
    unit: "sq m",
    ruleIds: [...ent.ruleIds, eff.id],
    inputKeys: ["plotAreaSqm", "roadWidthM", "existingBuaSqm"],
    worstStatus: worstStatus([
      buildableBuaSqm.worstStatus,
      rehabAreaSqm?.worstStatus ?? "verified",
      eff.status,
    ]),
  };

  // Cost: construct EVERYTHING built (incl. rehab), plus other costs %.
  const otherPct = assumptions.otherCostsPct?.value ?? 0;
  const totalCostInr: TracedNumber = {
    value: Math.round(
      buildableBuaSqm.value *
        assumptions.constructionCostPerSqm.value *
        (1 + otherPct),
    ),
    unit: "INR",
    ruleIds: ent.ruleIds,
    inputKeys: ["constructionCostPerSqm", "otherCostsPct"],
    worstStatus: worstStatus([
      buildableBuaSqm.worstStatus,
      assumptions.constructionCostPerSqm.status,
      assumptions.otherCostsPct?.status ?? "verified",
    ]),
  };

  // Revenue: sell the saleable area at the assumed rate.
  const totalRevenueInr: TracedNumber = {
    value: Math.round(saleableAreaSqm.value * assumptions.salePricePerSqm.value),
    unit: "INR",
    ruleIds: saleableAreaSqm.ruleIds,
    inputKeys: ["salePricePerSqm"],
    worstStatus: worstStatus([
      saleableAreaSqm.worstStatus,
      assumptions.salePricePerSqm.status,
    ]),
  };

  const surplusInr: TracedNumber = {
    value: totalRevenueInr.value - totalCostInr.value,
    unit: "INR",
    ruleIds: Array.from(
      new Set([...totalCostInr.ruleIds, ...totalRevenueInr.ruleIds]),
    ),
    inputKeys: Array.from(
      new Set([...totalCostInr.inputKeys, ...totalRevenueInr.inputKeys]),
    ),
    worstStatus: worstStatus([
      totalCostInr.worstStatus,
      totalRevenueInr.worstStatus,
    ]),
  };

  return {
    kind,
    permissibleFsi,
    buildableBuaSqm,
    saleableAreaSqm,
    rehabAreaSqm,
    totalCostInr,
    totalRevenueInr,
    surplusInr,
    viable: surplusInr.value > 0,
  };
}

export function computeFeasibility(
  inputs: PropertyInputs,
  assumptions: Assumptions,
  rulesetId: string,
): FeasibilityResult {
  const rs = getRuleset(rulesetId);

  if (inputs.plotAreaSqm.value <= 0) {
    throw new Error("plotAreaSqm must be positive");
  }
  if (inputs.roadWidthM.value <= 0) {
    throw new Error("roadWidthM must be positive");
  }

  return {
    rulesetId: rs.id,
    computedAt: new Date().toISOString(),
    scenarios: {
      conservative: computeScenario("conservative", inputs, assumptions, rs),
      base: computeScenario("base", inputs, assumptions, rs),
      optimised: computeScenario("optimised", inputs, assumptions, rs),
    },
  };
}
