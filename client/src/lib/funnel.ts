import type { Finding } from '../types'
import { effectiveTier, findingKey, type ReviewState } from './review'

export interface FunnelCounts {
  total: number
  production: number
  usesApi: number
  fixNow: number
}

export function computeFunnel(findings: Finding[], review: ReviewState): FunnelCounts {
  return {
    total: findings.length,
    production: findings.filter((f) => !f.pkg.dev).length,
    usesApi: findings.filter((f) => f.ai?.verdict === 'USES_VULNERABLE_API').length,
    fixNow: findings.filter((f) => effectiveTier(f, review[findingKey(f)]) === 'FIX_NOW').length,
  }
}
