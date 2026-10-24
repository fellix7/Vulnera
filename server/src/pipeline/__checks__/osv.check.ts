// Run: npx tsx server/src/pipeline/__checks__/osv.check.ts   (needs network the first time; cached afterwards)
import assert from 'node:assert/strict';
import type { Package } from '../../types.js';
import { matchPackages } from '../match.js';
import { planUpgrades } from '../plan.js';
import { cvss3BaseScore, getAdvisory, queryVersions, severityFromScore } from '../osv.js';

// --- CVSS calculator against known scores (FIRST / NVD) ---
const vectors: [string, number][] = [
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 9.8],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', 10.0],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', 6.1],
  ['CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H', 7.2],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N', 0],
  ['CVSS:3.0/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N', 5.5],
];
for (const [v, expected] of vectors) assert.equal(cvss3BaseScore(v), expected, v);
assert.equal(cvss3BaseScore('CVSS:2.0/AV:N'), null);
assert.equal(severityFromScore(9.8), 'CRITICAL');
assert.equal(severityFromScore(7.2), 'HIGH');
assert.equal(severityFromScore(6.1), 'MODERATE');
assert.equal(severityFromScore(3.1), 'LOW');
assert.equal(severityFromScore(0), 'UNKNOWN');
console.log('CVSS calculator: OK');

// --- live queries ---
const pkgs: Package[] = [
  { name: 'lodash', version: '4.17.15', direct: true, dev: false, path: ['lodash'] },
  { name: 'axios', version: '0.21.0', direct: true, dev: false, path: ['axios'] },
  { name: 'qs', version: '6.5.2', direct: false, dev: false, path: ['express', 'qs'] },
  { name: 'lodash.template', version: '4.4.0', direct: false, dev: true, path: ['some-tool', 'lodash.template'] },
  { name: 'left-pad', version: '1.3.0', direct: true, dev: false, path: ['left-pad'] }, // expected clean
];

async function run() {
  const t0 = performance.now();
  const ids = await queryVersions(pkgs);
  assert.equal(ids.length, pkgs.length);
  assert.ok(ids[0]!.length > 0, 'lodash@4.17.15 should have advisories');
  assert.ok(ids[1]!.length > 0, 'axios@0.21.0 should have advisories');
  pkgs.forEach((p, i) => console.log(`${p.name}@${p.version}: ${ids[i]!.length} advisories`));

  const adv = await getAdvisory('GHSA-35jh-r3h4-6jhm', 'lodash');
  assert.equal(adv.severity, 'HIGH');
  assert.ok(adv.fixedVersions.includes('4.17.21'));

  const matches = await matchPackages([...pkgs, pkgs[0]!]); // duplicate must be deduped
  assert.equal(matches.length, new Set(matches.map((m) => `${m.pkg.name}@${m.pkg.version}#${m.advisory.id}`)).size);
  for (const name of ['lodash', 'axios']) {
    console.log(`\n${name}:`);
    for (const m of matches.filter((x) => x.pkg.name === name)) {
      console.log(`  ${m.advisory.id} ${m.advisory.severity.padEnd(8)} fixed: ${m.advisory.fixedVersions.join(', ') || '-'}`);
    }
  }

  const plans = await planUpgrades(matches);
  console.log('\nPlans:');
  for (const p of plans) {
    console.log(`  ${p.name} ${p.from} -> ${p.to ?? 'NO FIX'} [${p.jump ?? '-'}]${p.viaParent ? ` via ${p.viaParent}` : ''}  ${p.command ?? ''}`);
  }
  const lodash = plans.find((p) => p.name === 'lodash')!;
  assert.ok(lodash.to && lodash.jump && lodash.command?.startsWith('npm install lodash@'));
  const qs = plans.find((p) => p.name === 'qs');
  if (qs?.to) {
    assert.equal(qs.viaParent, 'express');
    assert.ok(qs.command?.startsWith('npm pkg set overrides.qs='));
  }
  const dotted = plans.find((p) => p.name === 'lodash.template');
  if (dotted?.to) assert.ok(dotted.command?.includes('"overrides"'));
  assert.ok(!plans.some((p) => p.name === 'left-pad'));
  // direct packages first
  const firstTransitive = plans.findIndex((p) => p.viaParent);
  if (firstTransitive !== -1) assert.ok(plans.slice(firstTransitive).every((p) => p.viaParent));
}

const t1 = performance.now();
await run();
const first = performance.now() - t1;
console.log(`\nrun 1: ${first.toFixed(0)} ms`);

const t2 = performance.now();
process.env.OFFLINE = '1'; // second run must not need the network at all
await run();
const second = performance.now() - t2;
console.log(`run 2 (OFFLINE=1, from cache): ${second.toFixed(0)} ms`);
console.log('osv.check: OK');
