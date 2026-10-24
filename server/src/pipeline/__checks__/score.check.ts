// Run: npx tsx server/src/pipeline/__checks__/score.check.ts
import assert from 'node:assert/strict';
import { findingKey } from '../../keys.js';
import type { Advisory, AiVerdict, Enrichment, Package, Severity, Tier } from '../../types.js';
import { formatEpss, funnel, scoreFindings } from '../score.js';

const pkg = (o: Partial<Package> = {}): Package => ({
  name: 'lodash', version: '4.17.20', direct: true, dev: false, path: ['lodash'], ...o,
});
const adv = (severity: Severity, id = 'GHSA-aaaa-bbbb-cccc'): Advisory => ({
  id, aliases: [], summary: '', details: '', severity, fixedVersions: [], references: [],
});
const verdict = (v: AiVerdict['verdict']): AiVerdict => ({
  verdict: v, reasoning: '',
  citations: v === 'USES_VULNERABLE_API' ? [{ file: 'src/routes/render.js', line: 42, quote: 'const out = _.template(str)' }] : [],
});
const enr = (epss: number | null, kev: boolean | null = false): Enrichment => ({ epss, kev });

interface Case {
  name: string; sev: Severity; dev?: boolean; e: Enrichment; ai?: AiVerdict['verdict']; expect: Tier; threshold?: number;
}
const cases: Case[] = [
  { name: 'KEV, prod low sev', sev: 'LOW', e: enr(null, true), expect: 'FIX_NOW' },
  { name: 'KEV, dev-only', sev: 'MODERATE', dev: true, e: enr(0.01, true), expect: 'FIX_NOW' },
  { name: 'KEV beats NO_VULNERABLE_USAGE_FOUND', sev: 'HIGH', e: enr(0.5, true), ai: 'NO_VULNERABLE_USAGE_FOUND', expect: 'FIX_NOW' },
  { name: 'HIGH prod EPSS >= 10%', sev: 'HIGH', e: enr(0.1), expect: 'FIX_NOW' },
  { name: 'CRITICAL prod EPSS 34%', sev: 'CRITICAL', e: enr(0.34), expect: 'FIX_NOW' },
  { name: 'HIGH prod EPSS just under', sev: 'HIGH', e: enr(0.0999), expect: 'FIX_SPRINT' },
  { name: 'HIGH prod, AI raises to FIX_NOW', sev: 'HIGH', e: enr(0.001), ai: 'USES_VULNERABLE_API', expect: 'FIX_NOW' },
  { name: 'HIGH prod, null EPSS + AI uses API', sev: 'HIGH', e: enr(null, null), ai: 'USES_VULNERABLE_API', expect: 'FIX_NOW' },
  { name: 'MODERATE prod, AI uses API does not reach FIX_NOW', sev: 'MODERATE', e: enr(0.001), ai: 'USES_VULNERABLE_API', expect: 'PLAN' },
  { name: 'HIGH dev, AI uses API stays MONITOR', sev: 'HIGH', dev: true, e: enr(0.9), ai: 'USES_VULNERABLE_API', expect: 'MONITOR' },
  { name: 'AI NO_VULNERABLE_USAGE does not lower FIX_NOW (EPSS)', sev: 'HIGH', e: enr(0.5), ai: 'NO_VULNERABLE_USAGE_FOUND', expect: 'FIX_NOW' },
  { name: 'AI UNCERTAIN does not lower FIX_NOW (EPSS)', sev: 'CRITICAL', e: enr(0.5), ai: 'UNCERTAIN', expect: 'FIX_NOW' },
  { name: 'AI NO_VULNERABLE_USAGE does not lower FIX_SPRINT', sev: 'HIGH', e: enr(0.01), ai: 'NO_VULNERABLE_USAGE_FOUND', expect: 'FIX_SPRINT' },
  { name: 'AI UNCERTAIN does not lower FIX_SPRINT', sev: 'HIGH', e: enr(null, null), ai: 'UNCERTAIN', expect: 'FIX_SPRINT' },
  { name: 'HIGH prod, null EPSS', sev: 'HIGH', e: enr(null, null), expect: 'FIX_SPRINT' },
  { name: 'MODERATE prod EPSS >= 10%', sev: 'MODERATE', e: enr(0.25), expect: 'FIX_SPRINT' },
  { name: 'MODERATE prod EPSS < 10%', sev: 'MODERATE', e: enr(0.05), expect: 'PLAN' },
  { name: 'MODERATE prod null EPSS', sev: 'MODERATE', e: enr(null, null), expect: 'PLAN' },
  { name: 'UNKNOWN treated as MODERATE (high EPSS)', sev: 'UNKNOWN', e: enr(0.5), expect: 'FIX_SPRINT' },
  { name: 'UNKNOWN treated as MODERATE (low EPSS)', sev: 'UNKNOWN', e: enr(0.01), expect: 'PLAN' },
  { name: 'LOW prod', sev: 'LOW', e: enr(0.9), expect: 'PLAN' },
  { name: 'dev-only HIGH high EPSS', sev: 'HIGH', dev: true, e: enr(0.9), expect: 'MONITOR' },
  { name: 'dev-only MODERATE', sev: 'MODERATE', dev: true, e: enr(0.9), expect: 'MONITOR' },
  { name: 'custom threshold 0.5 (0.3 -> sprint)', sev: 'HIGH', e: enr(0.3), threshold: 0.5, expect: 'FIX_SPRINT' },
  { name: 'custom threshold 0.05 (0.06 -> now)', sev: 'HIGH', e: enr(0.06), threshold: 0.05, expect: 'FIX_NOW' },
];

for (const c of cases) {
  const p = pkg({ dev: c.dev ?? false });
  const a = adv(c.sev);
  const verdicts = c.ai ? new Map([[findingKey(p, a), verdict(c.ai)]]) : undefined;
  const [f] = scoreFindings([{ pkg: p, advisory: a }], new Map([[a.id, c.e]]), verdicts, c.threshold ? { epssThreshold: c.threshold } : undefined);
  assert.equal(f!.tier, c.expect, c.name);
}
console.log(`ok  ${cases.length} tier cases`);

// Missing enrichment entry behaves like "no data".
{
  const [f] = scoreFindings([{ pkg: pkg(), advisory: adv('HIGH') }], new Map());
  assert.deepEqual(f!.enrichment, { epss: null, kev: null });
  assert.equal(f!.tier, 'FIX_SPRINT');
  assert.ok(f!.reasons.includes('EPSS: no data'));
  console.log('ok  missing enrichment -> no data');
}

// Reasons: content and order.
{
  const p = pkg({ direct: false, path: ['express', 'body-parser', 'qs'], name: 'qs' });
  const a = adv('HIGH');
  const [f] = scoreFindings([{ pkg: p, advisory: a }], new Map([[a.id, enr(0.344, true)]]),
    new Map([[findingKey(p, a), verdict('USES_VULNERABLE_API')]]));
  assert.deepEqual(f!.reasons, [
    'On CISA KEV (exploited in the wild)',
    'EPSS 34%',
    'Severity: High',
    'Production dependency',
    'Via express → body-parser',
    'Your code calls `_.template` (src/routes/render.js:42)',
  ]);
  const d = pkg({ dev: true });
  const [g] = scoreFindings([{ pkg: d, advisory: a }], new Map([[a.id, enr(0.004)]]),
    new Map([[findingKey(d, a), verdict('NO_VULNERABLE_USAGE_FOUND')]]));
  assert.deepEqual(g!.reasons, ['EPSS 0.4%', 'Severity: High', 'Dev-only', 'Direct dependency', 'AI: no vulnerable usage found — needs review']);
  const [h] = scoreFindings([{ pkg: d, advisory: adv('LOW') }], new Map(), new Map([[findingKey(d, adv('LOW')), verdict('UNCERTAIN')]]));
  assert.ok(h!.reasons.at(-1) === 'AI: uncertain');
  console.log('ok  reasons');
}

assert.equal(formatEpss(0.344), '34%');
assert.equal(formatEpss(0.999), '100%');
assert.equal(formatEpss(0.047), '4.7%');
assert.equal(formatEpss(0.04), '4%');
assert.equal(formatEpss(0.004), '0.4%');
assert.equal(formatEpss(0.00004), '<0.1%');
console.log('ok  formatEpss');

// Sort: tier, EPSS desc (null last), severity desc, name.
{
  const mk = (name: string, sev: Severity, e: Enrichment, dev = false, id = `GHSA-${name}`) =>
    ({ pkg: pkg({ name, dev }), advisory: adv(sev, id), e });
  const items = [
    mk('zeta-dev', 'CRITICAL', enr(0.9), true),
    mk('plan-mod', 'MODERATE', enr(0.01)),
    mk('sprint-null', 'HIGH', enr(null, null)),
    mk('sprint-low-epss', 'HIGH', enr(0.02)),
    mk('now-b', 'HIGH', enr(0.2)),
    mk('now-kev', 'LOW', enr(0.001, true)),
    mk('now-a', 'CRITICAL', enr(0.2)),
    mk('now-hi', 'HIGH', enr(0.8)),
    mk('sprint-sev', 'CRITICAL', enr(0.02)),
  ];
  const enrichments = new Map(items.map((i) => [i.advisory.id, i.e]));
  const out = scoreFindings(items.map(({ pkg, advisory }) => ({ pkg, advisory })), enrichments).map((f) => f.pkg.name);
  assert.deepEqual(out, [
    'now-hi',       // FIX_NOW, EPSS 0.8
    'now-a',        // 0.2, CRITICAL beats HIGH
    'now-b',        // 0.2, HIGH
    'now-kev',      // 0.001
    'sprint-sev',   // 0.02, CRITICAL beats HIGH
    'sprint-low-epss',
    'sprint-null',  // null EPSS last in tier
    'plan-mod',
    'zeta-dev',
  ]);
  console.log('ok  sort order');
}

// Funnel.
{
  const a = adv('HIGH');
  const p1 = pkg({ name: 'a' });
  const p2 = pkg({ name: 'b', dev: true });
  const fs = scoreFindings([{ pkg: p1, advisory: a }, { pkg: p2, advisory: a }], new Map([[a.id, enr(0.5)]]),
    new Map([[findingKey(p1, a), verdict('USES_VULNERABLE_API')]]));
  assert.deepEqual(funnel(fs), { total: 2, production: 1, aiConfirmed: 1, fixNow: 1 });
  console.log('ok  funnel');
}
console.log('ALL SCORE CHECKS PASSED');
