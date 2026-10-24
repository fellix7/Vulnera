import type { Severity, Tier } from '../types'

export const TIER_ORDER: Tier[] = ['FIX_NOW', 'FIX_SPRINT', 'PLAN', 'MONITOR']

export const TIER_LABEL: Record<Tier, string> = {
  FIX_NOW: 'Fix now',
  FIX_SPRINT: 'Fix this sprint',
  PLAN: 'Plan',
  MONITOR: 'Monitor',
}

export const TIER_BLURB: Record<Tier, string> = {
  FIX_NOW: 'Known exploited, or high risk and your code uses it',
  FIX_SPRINT: 'High or critical severity in production code',
  PLAN: 'Lower-risk production findings',
  MONITOR: 'Development-only packages',
}

export const TIER_CLASS: Record<Tier, string> = {
  FIX_NOW: 't-now',
  FIX_SPRINT: 't-sprint',
  PLAN: 't-plan',
  MONITOR: 't-monitor',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MODERATE: 'Moderate',
  LOW: 'Low',
  UNKNOWN: 'Unknown',
}

/** The tier one step lower in priority, or null when already at the bottom. */
export function nextTierDown(tier: Tier): Tier | null {
  const i = TIER_ORDER.indexOf(tier)
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null
}
