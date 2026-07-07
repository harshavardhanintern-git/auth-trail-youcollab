// Mirrors Backend/src/utils/credits.js — keep both in sync.
export const TIER_COST = { NANO: 100, MICRO: 300 } as const;
export type Tier = "NANO" | "MICRO" | "MID";

export function getTier(followerCount = 0): Tier {
  if (followerCount > 10000) return "MID";
  if (followerCount >= 1000) return "MICRO";
  return "NANO";
}
