import { findingKey } from '../keys.js';
import type { Advisory, AiVerdict, Enrichment, Finding, Package, Severity, Tier } from '../types.js';

export const TIER_ORDER: Tier[] = ['FIX_NOW', 'FIX_SPRINT', 'PLAN', 'MONITOR'];

// UNKNOWN is tiered like MODERATE.
const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, UNKNOWN: 2, LOW: 1 };
const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MODERATE: 'Medium',
  LOW: 'Low',
  UNKNOWN: 'Unknown',
};

export const DEFAULT_EPSS_THRESHOLD = 0.1;

export function formatEpss(p: number): string {
  const pct = p * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1).replace(/\.0$/, '')}%`;
  if (pct >= 0.1) return `${pct.toFixed(1)}%`;
  return '<0.1%';
}

// AI can only raise a tier (USES_VULNERABLE_API); NO_VULNERABLE_USAGE_FOUND / UNCERTAIN are ignored here.
function tierFor(pkg: Package, advisory: Advisory, e: Enrichment, ai: AiVerdict | undefined, threshold: number): Tier {
  const sev = advisory.severity;
  const highOrCritical = sev === 'HIGH' || sev === 'CRITICAL';
  const moderateLike = sev === 'MODERATE' || sev === 'UNKNOWN';
  const prod = !pkg.dev;
  const epssHigh = e.epss !== null && e.epss >= threshold;

  if (e.kev === true) return 'FIX_NOW';
  if (highOrCritical && prod && (epssHigh || ai?.verdict === 'USES_VULNERABLE_API')) return 'FIX_NOW';
  if (prod && (highOrCritical || (moderateLike && epssHigh))) return 'FIX_SPRINT';
  if (prod) return 'PLAN';
  return 'MONITOR';
}

// The verdict carries no function name, so label the first citation by the call in its quoted line.
function citedSymbol(quote: string): string {
  const m = quote.match(/([A-Za-z_$][\w$.]*)\s*\(/);
  return m ? m[1]! : quote.trim().slice(0, 40);
}

function reasonsFor(pkg: Package, advisory: Advisory, e: Enrichment, ai: AiVerdict | undefined): string[] {
  const reasons: string[] = [];
  if (e.kev === true) reasons.push('On CISA KEV (exploited in the wild)');
  reasons.push(e.epss === null ? 'EPSS: no data' : `EPSS ${formatEpss(e.epss)}`);
  reasons.push(`Severity: ${SEVERITY_LABEL[advisory.severity]}`);
  reasons.push(pkg.dev ? 'Dev-only' : 'Production dependency');
  if (pkg.direct) reasons.push('Direct dependency');
  else {
    const chain = pkg.path.length > 1 ? pkg.path.slice(0, -1) : pkg.path;
    reasons.push(chain.length ? `Via ${chain.join(' → ')}` : 'Transitive dependency');
  }
  if (ai?.verdict === 'USES_VULNERABLE_API') {
    const c = ai.citations[0];
    reasons.push(c ? `Your code calls \`${citedSymbol(c.quote)}\` (${c.file}:${c.line})` : 'AI: your code uses the vulnerable API');
  } else if (ai?.verdict === 'NO_VULNERABLE_USAGE_FOUND') {
    reasons.push('AI: no vulnerable usage found — needs review');
  } else if (ai?.verdict === 'UNCERTAIN') {
    reasons.push('AI: uncertain');
  }
  return reasons;
}

export function scoreFindings(
  matches: { pkg: Package; advisory: Advisory }[],
  enrichments: Map<string, Enrichment>,
  aiVerdicts?: Map<string, AiVerdict>,
  opts?: { epssThreshold?: number },
): Finding[] {
  const threshold = opts?.epssThreshold ?? DEFAULT_EPSS_THRESHOLD;
  const findings: Finding[] = matches.map(({ pkg, advisory }) => {
    const enrichment = enrichments.get(advisory.id) ?? { epss: null, kev: null };
    const ai = aiVerdicts?.get(findingKey(pkg, advisory));
    const finding: Finding = {
      pkg,
      advisory,
      enrichment,
      tier: tierFor(pkg, advisory, enrichment, ai, threshold),
      reasons: reasonsFor(pkg, advisory, enrichment, ai),
    };
    if (ai) finding.ai = ai;
    return finding;
  });

  return findings.sort(
    (a, b) =>
      TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
      (b.enrichment.epss ?? -1) - (a.enrichment.epss ?? -1) ||
      SEVERITY_RANK[b.advisory.severity] - SEVERITY_RANK[a.advisory.severity] ||
      a.pkg.name.localeCompare(b.pkg.name) ||
      a.advisory.id.localeCompare(b.advisory.id),
  );
}

export function funnel(findings: Finding[]) {
  return {
    total: findings.length,
    production: findings.filter((f) => !f.pkg.dev).length,
    aiConfirmed: findings.filter((f) => f.ai?.verdict === 'USES_VULNERABLE_API').length,
    fixNow: findings.filter((f) => f.tier === 'FIX_NOW').length,
  };
}
