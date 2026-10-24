import type { Finding, Tier } from '../types'
import { nextTierDown } from './tiers'

export type AiDecision = 'confirmed' | 'disputed'

export interface Review {
  ai?: AiDecision
  lowered?: boolean
}

export type ReviewState = Record<string, Review>

export function findingKey(f: Finding): string {
  return `${f.pkg.name}@${f.pkg.version}#${f.advisory.id}`
}

/** KEV findings can never be lowered; the bottom tier cannot go lower. */
export function canLower(f: Finding, review: Review | undefined): boolean {
  if (f.enrichment.kev === true) return false
  return !review?.lowered && nextTierDown(f.tier) !== null
}

export function effectiveTier(f: Finding, review: Review | undefined): Tier {
  if (review?.lowered && f.enrichment.kev !== true) return nextTierDown(f.tier) ?? f.tier
  return f.tier
}

export function isLowered(f: Finding, review: Review | undefined): boolean {
  return effectiveTier(f, review) !== f.tier
}
