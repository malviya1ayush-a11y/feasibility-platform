/**
 * DEV ONLY: until real sign-in lands (Day 9), every row is written to this
 * temporary development organisation. The dev_* database policies scope the
 * public key to exactly this org and nothing else.
 */
export const DEV_ORG_ID = "00000000-0000-0000-0000-000000000001";

export const DATA_STATUSES = [
  "verified",
  "extracted",
  "assumed",
  "estimated",
  "requires_professional_verification",
] as const;

export const INPUT_KEYS = {
  plot_area_sqm: "Plot area (sq m)",
  road_width_m: "Front road width (m)",
  zone_type: "Zone type",
  existing_bua_sqm: "Existing built-up area (sq m)",
  num_existing_members: "Existing members / tenements",
  ready_reckoner_rate: "Ready-reckoner land rate (INR/sq m)",
} as const;
