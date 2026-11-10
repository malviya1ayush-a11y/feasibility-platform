/**
 * Rules engine — core types (Day 1 skeleton).
 *
 * HARD RULE: all regulatory & numerical calculation lives in this module.
 * Deterministic, versioned, pure. AI never calculates.
 */

export type DataStatus =
  | "verified"
  | "extracted"
  | "assumed"
  | "estimated"
  | "requires_professional_verification";

/** A single input value with its provenance tag. */
export interface TaggedValue<T = number> {
  value: T;
  status: DataStatus;
  sourceNote?: string;
}

export type Jurisdiction = "mh-udcpr" | "mum-dcpr2034";

/** Everything the engine needs about a plot. All areas in sq m. */
export interface PropertyInputs {
  jurisdiction: Jurisdiction;
  plotAreaSqm: TaggedValue;
  roadWidthM: TaggedValue;
  zoneType: TaggedValue<string>; // e.g. "residential", "commercial"
  existingBuaSqm?: TaggedValue; // built-up area of existing structure
  numExistingMembers?: TaggedValue; // for redevelopment rehab sizing
  readyReckonerRate?: TaggedValue; // INR per sq m, for premium calculations
}

/** User-editable financial assumptions. */
export interface Assumptions {
  constructionCostPerSqm: TaggedValue;
  salePricePerSqm: TaggedValue;
  rehabCarpetPerMemberSqm?: TaggedValue;
  otherCostsPct?: TaggedValue; // approvals, finance, marketing as % of construction
}

/** One rule parameter inside a ruleset JSON file. */
export interface RuleParam {
  id: string; // e.g. "base_fsi_residential"
  description: string;
  value: number | string | Record<string, number>;
  unit?: string;
  status: DataStatus; // regulatory values start as requires_professional_verification
  source: string; // e.g. "UDCPR 2020, Reg 6.1 — TO BE VERIFIED"
}

export interface Ruleset {
  id: string; // "mh-udcpr-0.1"
  jurisdiction: Jurisdiction;
  version: string;
  status: "draft" | "published" | "superseded";
  params: RuleParam[];
}

export type ScenarioKind = "conservative" | "base" | "optimised";

/** A computed number plus the trail that produced it. */
export interface TracedNumber {
  value: number;
  unit: string;
  ruleIds: string[]; // which ruleset params produced it
  inputKeys: string[]; // which inputs fed it
  worstStatus: DataStatus; // weakest data status among contributors
}

export interface ScenarioResult {
  kind: ScenarioKind;
  permissibleFsi: TracedNumber;
  buildableBuaSqm: TracedNumber;
  saleableAreaSqm: TracedNumber;
  rehabAreaSqm?: TracedNumber;
  totalCostInr: TracedNumber;
  totalRevenueInr: TracedNumber;
  surplusInr: TracedNumber;
  viable: boolean;
}

export interface FeasibilityResult {
  rulesetId: string;
  computedAt: string; // ISO timestamp
  scenarios: Record<ScenarioKind, ScenarioResult>;
}
