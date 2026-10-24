// Run: npx tsx server/src/pipeline/__checks__/parse.check.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLockfile } from '../parse.js';

const find = (pkgs: ReturnType<typeof parseLockfile>, name: string, version?: string) =>
  pkgs.find((p) => p.name === name && (version === undefined || p.version === version));

// --- fixture: scoped, nested, dev vs devOptional, transitive paths, dedupe ---
const lock = {
  lockfileVersion: 3,
  packages: {
    '': {
      name: 'app',
      dependencies: { express: '^4', '@babel/core': '^7' },
      devDependencies: { jest: '^29' },
    },
    'node_modules/express': { version: '4.18.0', dependencies: { 'body-parser': '1.20.0' } },
    'node_modules/body-parser': { version: '1.20.0', dependencies: { qs: '6.10.0' } },
    'node_modules/qs': { version: '6.10.0' },
    // nested copy with a different version, required only by express's nested subtree
    'node_modules/body-parser/node_modules/qs': { version: '6.11.0' },
    'node_modules/@babel/core': { version: '7.20.0', dependencies: { '@babel/helper': '7.0.0' } },
    'node_modules/@babel/helper': { version: '7.0.0' },
    'node_modules/jest': { version: '29.0.0', dev: true, dependencies: { 'dev-only': '1.0.0', shared: '1.0.0' } },
    'node_modules/dev-only': { version: '1.0.0', dev: true },
    'node_modules/shared': { version: '1.0.0', dev: true },
    // same name@version at two locations: one dev, one prod -> dev=false
    'node_modules/a': { version: '1.0.0', dependencies: { shared: '1.0.0' } },
    'node_modules/a/node_modules/shared': { version: '1.0.0' },
    'node_modules/a/node_modules/@scope/b': { version: '2.0.0' },
    'node_modules/opt-dev': { version: '1.0.0', devOptional: true },
    'node_modules/orphan': { version: '3.0.0', dev: true },
    'node_modules/linked': { resolved: 'packages/linked', link: true },
    'node_modules/noversion': {},
    'packages/linked': { version: '1.0.0' },
  },
};
lock.packages[''].dependencies = Object.assign({ a: '1', 'opt-dev': '1' }, lock.packages[''].dependencies);
(lock.packages['node_modules/a'] as { dependencies: Record<string, string> }).dependencies['@scope/b'] = '2';

const pkgs = parseLockfile(lock);

// shape / skipping
assert.ok(!find(pkgs, 'linked'), 'link entries skipped');
assert.ok(!find(pkgs, 'noversion'), 'entries without version skipped');
assert.ok(!pkgs.some((p) => p.name === ''), 'root skipped');
assert.ok(!pkgs.some((p) => p.name.includes('node_modules')), 'names derived from key');

// scoped + nested scoped names
assert.equal(find(pkgs, '@babel/core')?.direct, true);
assert.deepEqual(find(pkgs, '@babel/helper')?.path, ['@babel/core', '@babel/helper']);
assert.deepEqual(find(pkgs, '@scope/b')?.path, ['a', '@scope/b']);
assert.equal(find(pkgs, '@scope/b')?.direct, false);

// direct vs transitive
assert.equal(find(pkgs, 'express')?.direct, true);
assert.deepEqual(find(pkgs, 'express')?.path, ['express']);
assert.equal(find(pkgs, 'body-parser')?.direct, false);

// nested resolution: body-parser -> qs resolves to the nested 6.11.0, not top-level 6.10.0
assert.deepEqual(find(pkgs, 'qs', '6.11.0')?.path, ['express', 'body-parser', 'qs']);
// top-level qs 6.10.0 is unreachable (body-parser's qs is the nested one) -> orphan fallback
assert.deepEqual(find(pkgs, 'qs', '6.10.0')?.path, ['qs']);

// dev vs devOptional
assert.equal(find(pkgs, 'jest')?.dev, true);
assert.equal(find(pkgs, 'dev-only')?.dev, true);
assert.deepEqual(find(pkgs, 'dev-only')?.path, ['jest', 'dev-only']);
assert.equal(find(pkgs, 'opt-dev')?.dev, false, 'devOptional is not dev');
assert.equal(find(pkgs, 'express')?.dev, false);

// dedupe: shared@1.0.0 at two locations -> one package, dev=false (one location is prod)
const shared = pkgs.filter((p) => p.name === 'shared');
assert.equal(shared.length, 1);
assert.equal(shared[0]!.dev, false);
assert.equal(shared[0]!.path.length, 2, 'shortest path chosen');

// orphan
assert.deepEqual(find(pkgs, 'orphan')?.path, ['orphan']);

// sorting by name then version
const sortedNames = pkgs.map((p) => `${p.name}@${p.version}`);
const resorted = [...pkgs]
  .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version < b.version ? -1 : a.version > b.version ? 1 : 0))
  .map((p) => `${p.name}@${p.version}`);
assert.deepEqual(sortedNames, resorted);
assert.ok(sortedNames.indexOf('qs@6.10.0') < sortedNames.indexOf('qs@6.11.0'));

// lockfile v2 (has both packages and dependencies) is accepted
assert.equal(parseLockfile({ lockfileVersion: 2, packages: { '': {}, 'node_modules/x': { version: '1.0.0' } }, dependencies: {} }).length, 1);

// --- rejections ---
const rejects = (v: unknown, re: RegExp) => assert.throws(() => parseLockfile(v), re);
rejects({ lockfileVersion: 1, dependencies: { x: { version: '1.0.0' } } }, /package-lock-only/);
rejects({ lockfileVersion: 3 }, /package-lock-only/);
rejects({ name: 'x' }, /packages/);
for (const garbage of [null, undefined, 42, 'str', true, [], [1, 2], () => 1]) {
  assert.throws(() => parseLockfile(garbage), Error);
}
rejects({ lockfileVersion: 3, packages: [] }, /must be an object/);
rejects({ lockfileVersion: 3, packages: 'x' }, /must be an object/);
rejects({ lockfileVersion: 3, packages: {} }, /empty/);
// malformed entries never crash
assert.deepEqual(
  parseLockfile({
    lockfileVersion: 3,
    packages: {
      '': { dependencies: 'nope', devDependencies: [1] },
      'node_modules/a': { version: 123 },
      'node_modules/b': null,
      'node_modules/c': 'str',
      'node_modules/d': { version: '1.0.0', dependencies: 5 },
    },
  }),
  [{ name: 'd', version: '1.0.0', direct: false, dev: false, path: ['d'] }],
);

// --- performance: ~2000 packages, chain-shaped graph ---
{
  const packages: Record<string, unknown> = { '': { dependencies: { p0: '1' } } };
  for (let i = 0; i < 2000; i++) {
    packages[`node_modules/p${i}`] = {
      version: '1.0.0',
      dependencies: { [`p${i + 1}`]: '1', [`p${(i * 7) % 2000}`]: '1' },
    };
    if (i % 5 === 0) packages[`node_modules/p${i}/node_modules/n${i}`] = { version: '2.0.0' };
  }
  const t = performance.now();
  const out = parseLockfile({ lockfileVersion: 3, packages });
  const ms = performance.now() - t;
  assert.ok(out.length >= 2000);
  assert.ok(ms < 500, `perf: ${ms}ms`);
  console.log(`perf: ${out.length} packages in ${ms.toFixed(1)}ms`);
}

console.log('fixture checks passed');

// --- real lockfile ---
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const demo = `${repoRoot}samples/demo-app/package-lock.json`;
const files = existsSync(demo) ? [demo] : [`${repoRoot}package-lock.json`];
if (!existsSync(demo)) console.log('samples/demo-app/package-lock.json not found; using repo root lockfile');
for (const f of files) {
  const real = parseLockfile(JSON.parse(readFileSync(f, 'utf8')));
  const direct = real.filter((p) => p.direct).length;
  const dev = real.filter((p) => p.dev).length;
  console.log(`${f}\n  total=${real.length} direct=${direct} dev=${dev} transitive=${real.length - direct}`);
  const deep = [...real].sort((a, b) => b.path.length - a.path.length).slice(0, 3);
  for (const p of deep) console.log(`  ${p.name}@${p.version}: ${p.path.join(' > ')}`);
  for (const p of real.filter((p) => p.direct).slice(0, 2)) console.log(`  ${p.name}@${p.version}: ${p.path.join(' > ')}`);
  assert.ok(real.length > 0);
}

// Aliased install: keyed by the alias, but the real registry name must be reported.
{
  const pkgs = parseLockfile({
    lockfileVersion: 3,
    packages: {
      '': { dependencies: { 'lodash-old': 'npm:lodash@4.17.15' } },
      'node_modules/lodash-old': { name: 'lodash', version: '4.17.15' },
    },
  });
  assert.equal(pkgs.length, 1);
  assert.equal(pkgs[0].name, 'lodash');
  assert.equal(pkgs[0].version, '4.17.15');
  assert.equal(pkgs[0].direct, true);
  console.log('ok  aliased package reports registry name');
}
