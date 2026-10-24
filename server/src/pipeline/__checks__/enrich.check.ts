// Run: npx tsx server/src/pipeline/__checks__/enrich.check.ts   (live network; second run is served from .cache)
import assert from 'node:assert/strict';
import type { Advisory } from '../../types.js';
import { enrich, loadKev } from '../enrich.js';

const adv = (id: string, aliases: string[]): Advisory => ({
  id, aliases, summary: '', details: '', severity: 'HIGH', fixedVersions: [], references: [],
});

const advisories = [
  adv('GHSA-jfh8-c2jp-5v3q', ['CVE-2021-44228']), // Log4Shell: KEV + very high EPSS
  adv('GHSA-35jh-r3h4-6jhm', ['CVE-2021-23337']), // lodash command injection
  adv('GHSA-no-cve-0000-0000', []), // no CVE -> no data
  adv('GHSA-bogus-cve', ['CVE-2099-99999']), // CVE with no EPSS entry -> epss null
];

const kev = await loadKev();
console.log(`KEV entries: ${kev.size}`);
assert.ok(kev.has('CVE-2021-44228'));

for (const run of [1, 2]) {
  const t = Date.now();
  const { map, warnings } = await enrich(advisories);
  console.log(`\n-- run ${run}: ${Date.now() - t}ms, warnings: ${JSON.stringify(warnings)}`);
  for (const [id, e] of map) console.log(id.padEnd(24), JSON.stringify(e));

  assert.equal(warnings.length, 0);
  const log4 = map.get('GHSA-jfh8-c2jp-5v3q')!;
  assert.equal(log4.kev, true);
  assert.ok(log4.epss! > 0.9);
  const lodash = map.get('GHSA-35jh-r3h4-6jhm')!;
  assert.equal(lodash.kev, false);
  assert.ok(lodash.epss !== null && lodash.epss > 0 && lodash.epss < 1);
  assert.deepEqual(map.get('GHSA-no-cve-0000-0000'), { epss: null, kev: null });
  assert.deepEqual(map.get('GHSA-bogus-cve'), { epss: null, kev: false });
}
console.log('\nENRICH CHECKS PASSED');
