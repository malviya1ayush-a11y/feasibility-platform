/**
 * Feasibility engine — Day 1 skeleton, Day 2 builds the real pipeline.
 *
 * Pipeline: PropertyInputs + Assumptions + Ruleset
 *   → permissible FSI (base + premium + TDR per scenario)
 *   → buildable BUA → saleable area (− rehab for redevelopment)
 *   → costs & revenue → surplus → viability
 *
 * Deterministic and pure: same inputs + same ruleset ⇒ same result, always.
 */

import type {
  Assumptions,
  FeasibilityResult,
  PropertyInputs,
  Ruleset,
  ScenarioKind,
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

/**
 * Day 2 implements this. The signature is the contract the app builds against:
 * nothing outside the engine may compute a regulatory or financial number.
 */
export function computeFeasibility(
  _inputs: PropertyInputs,
  _assumptions: Assumptions,
  rulesetId: string,
): FeasibilityResult {
  getRuleset(rulesetId); // validate early
  throw new Error("computeFeasibility: implemented on Day 2 (rules-engine core)");
}
