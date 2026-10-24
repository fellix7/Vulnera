// Run with: npx tsx server/src/pipeline/__checks__/ai.check.ts
// Offline unit checks always run. A live Gemini check runs only when GEMINI_API_KEY is set.
import assert from 'node:assert/strict';
import { findingKey } from '../../keys.js';
import type { AiVerdict, Finding, SourceFile } from '../../types.js';
import { analyzeFindings, findUsages, redact, validateCitations } from '../ai.js';

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok  ${name}`);
};

// ---------------------------------------------------------------------------
// findUsages
// ---------------------------------------------------------------------------
const cjs: SourceFile = {
  path: 'src/routes/render.js',
  content: [
    "const express = require('express');", // 1
    "const _ = require('lodash');", // 2
    '', // 3
    "app.post('/render', (req, res) => {", // 4
    '  const fn = _.template(req.body.tpl);', // 5
    '  res.send(fn({ name: "x" }));', // 6
    '});', // 7
  ].join('\n'),
};
const esm: SourceFile = {
  path: 'src/util.ts',
  content: ["import { zipObjectDeep } from 'lodash';", 'export const z = (a, b) => zipObjectDeep(a, b);'].join('\n'),
};
const sub: SourceFile = {
  path: 'src/sub.mjs',
  content: ["import template from 'lodash/template';", "const lazy = await import('lodash/fp');", 'template("x");'].join('\n'),
};
const unrelated: SourceFile = {
  path: 'src/other.js',
  content: ["const x = require('lodash-es-not');", "const template = 'not related';", "// mentions lodash but never imports it", 'template;'].join('\n'),
};

check('findUsages: CJS require + _.template matched by last segment', () => {
  const r = findUsages('lodash', ['_.template'], [cjs, unrelated]);
  assert.equal(r.imported, true);
  assert.deepEqual(r.importingFiles, ['src/routes/render.js']);
  assert.equal(r.apiMatches, true);
  assert.equal(r.snippets.length, 1);
  const s = r.snippets[0];
  assert.deepEqual(s.matchLines, [5]);
  assert.equal(s.startLine, 2); // 5 - 3
  assert.equal(s.endLine, 7); // clamped to file length
  assert.equal(s.lines[s.matchLines[0] - s.startLine], '  const fn = _.template(req.body.tpl);');
});

check('findUsages: ESM named import', () => {
  const r = findUsages('lodash', ['zipObjectDeep'], [esm]);
  assert.equal(r.imported, true);
  assert.deepEqual(r.snippets[0].matchLines, [1, 2]); // merged into one window
  assert.equal(r.snippets.length, 1);
});

check('findUsages: subpath imports and dynamic import()', () => {
  const r = findUsages('lodash', ['template'], [sub]);
  assert.equal(r.imported, true);
  assert.ok(r.snippets[0].matchLines.includes(1));
  assert.ok(r.snippets[0].matchLines.includes(3));
});

check('findUsages: package not imported anywhere', () => {
  const r = findUsages('lodash', ['template'], [unrelated]);
  assert.equal(r.imported, false);
  assert.equal(r.snippets.length, 0);
});

check('findUsages: scoped package names and regex-special chars', () => {
  const src: SourceFile = { path: 'a.js', content: "const p = require('@scope/pkg.x/sub');\np.go();" };
  assert.equal(findUsages('@scope/pkg.x', ['go'], [src]).imported, true);
  assert.equal(findUsages('@scope/pkgZx', ['go'], [src]).imported, false);
});

check('findUsages: word boundaries (template vs templateCache)', () => {
  const src: SourceFile = { path: 'a.js', content: "const _ = require('lodash');\nconst a = templateCache;\nconst b = _.template;" };
  const r = findUsages('lodash', ['template'], [src]);
  assert.equal(r.snippets.length, 1);
  assert.deepEqual(r.snippets[0].matchLines, [3]);
});

check('findUsages: imported but no API line falls back to import snippets', () => {
  const src: SourceFile = { path: 'a.js', content: "const _ = require('lodash');\n_.map([], x => x);" };
  const r = findUsages('lodash', ['template'], [src]);
  assert.equal(r.imported, true);
  assert.equal(r.apiMatches, false);
  assert.equal(r.snippets.length, 1);
});

check('findUsages: max 8 snippets, truncated flag set', () => {
  const lines = ["const _ = require('lodash');"];
  for (let i = 0; i < 12; i++) lines.push(...Array(10).fill('noop();'), '_.template(a);');
  const r = findUsages('lodash', ['template'], [{ path: 'big.js', content: lines.join('\n') }]);
  assert.equal(r.snippets.length, 8);
  assert.equal(r.truncated, true);
});

// ---------------------------------------------------------------------------
// validateCitations
// ---------------------------------------------------------------------------
const sources = [cjs, esm];
const uses = (citations: AiVerdict['citations']): AiVerdict => ({
  verdict: 'USES_VULNERABLE_API',
  reasoning: 'Template string comes from the request body.',
  citations,
});

check('validateCitations: valid citation kept (whitespace-insensitive)', () => {
  const ok = validateCitations(uses([{ file: 'src/routes/render.js', line: 5, quote: 'const fn =   _.template(req.body.tpl);' }]), sources);
  assert.equal(ok.verdict, 'USES_VULNERABLE_API');
  assert.equal(ok.citations.length, 1);
});

check('validateCitations: off-by-one line accepted, off-by-two rejected', () => {
  const q = '_.template(req.body.tpl)';
  assert.equal(validateCitations(uses([{ file: 'src/routes/render.js', line: 4, quote: q }]), sources).citations.length, 1);
  assert.equal(validateCitations(uses([{ file: 'src/routes/render.js', line: 6, quote: q }]), sources).citations.length, 1);
  assert.equal(validateCitations(uses([{ file: 'src/routes/render.js', line: 7, quote: q }]), sources).citations.length, 0);
});

check('validateCitations: wrong line dropped and USES downgraded to UNCERTAIN', () => {
  const v = validateCitations(uses([{ file: 'src/routes/render.js', line: 1, quote: '_.template(req.body.tpl)' }]), sources);
  assert.equal(v.verdict, 'UNCERTAIN');
  assert.equal(v.citations.length, 0);
  assert.match(v.reasoning, /Downgraded to UNCERTAIN/);
});

check('validateCitations: fabricated quote dropped', () => {
  const v = validateCitations(uses([{ file: 'src/routes/render.js', line: 5, quote: 'eval(req.body.tpl)' }]), sources);
  assert.equal(v.verdict, 'UNCERTAIN');
  assert.equal(v.citations.length, 0);
});

check('validateCitations: missing file, bad line number, empty quote dropped', () => {
  const v = validateCitations(
    uses([
      { file: 'src/nope.js', line: 1, quote: 'require' },
      { file: 'src/routes/render.js', line: 999, quote: 'require' },
      { file: 'src/routes/render.js', line: 0, quote: 'require' },
      { file: 'src/routes/render.js', line: 2.5, quote: 'require' },
      { file: 'src/routes/render.js', line: 2, quote: '   ' },
    ]),
    sources,
  );
  assert.equal(v.citations.length, 0);
  assert.equal(v.verdict, 'UNCERTAIN');
});

check('validateCitations: mixed keeps only valid; verdict stays USES', () => {
  const v = validateCitations(
    uses([
      { file: 'src/routes/render.js', line: 5, quote: '_.template(req.body.tpl)' },
      { file: 'src/routes/render.js', line: 5, quote: 'made up' },
      { file: 'src/routes/render.js', line: 5, quote: '_.template(req.body.tpl)' }, // duplicate
    ]),
    sources,
  );
  assert.equal(v.verdict, 'USES_VULNERABLE_API');
  assert.equal(v.citations.length, 1);
});

check('validateCitations: non-USES verdicts keep verdict but lose bad citations', () => {
  const v = validateCitations(
    { verdict: 'NO_VULNERABLE_USAGE_FOUND', reasoning: 'Static template.', citations: [{ file: 'x.js', line: 1, quote: 'x' }] },
    sources,
  );
  assert.equal(v.verdict, 'NO_VULNERABLE_USAGE_FOUND');
  assert.equal(v.citations.length, 0);
});

// ---------------------------------------------------------------------------
// redact
// ---------------------------------------------------------------------------
const sameLines = (a: string, b: string) => assert.equal(a.split('\n').length, b.split('\n').length);

check('redact: Google, OpenAI, AWS, GitHub, Stripe tokens', () => {
  const samples = [
    'AIzaSyA1234567890abcdefghijklmnopqrstuv',
    'sk-abcdefghijklmnopqrstuvwxyz123456',
    'sk-proj-abcdefghijklmnopqrstuvwxyz123456',
    'AKIAIOSFODNN7EXAMPLE',
    'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
    'gho_abcdefghijklmnopqrstuvwxyz0123456789',
    'ghs_abcdefghijklmnopqrstuvwxyz0123456789',
    'sk_live_abcdefghijklmnop1234',
    'rk_live_abcdefghijklmnop1234',
  ];
  for (const s of samples) {
    const out = redact(`const k = ${s}; // use it`);
    assert.ok(!out.includes(s), `not redacted: ${s}`);
    assert.ok(out.includes('[REDACTED]'));
    assert.ok(out.includes('// use it'));
  }
});

check('redact: private key block, line count preserved', () => {
  const text = ['a();', '-----BEGIN RSA PRIVATE KEY-----', 'MIIEowIBAAKCAQEA', 'abcdef', '-----END RSA PRIVATE KEY-----', 'b();'].join('\n');
  const out = redact(text);
  assert.ok(!out.includes('MIIEow'));
  assert.ok(out.startsWith('a();') && out.endsWith('b();'));
  sameLines(text, out);
  const lines = out.split('\n');
  assert.equal(lines[5], 'b();'); // later line numbers unchanged
});

check('redact: generic key/secret/token/password assignments', () => {
  const cases = [
    `const apiKey = "hunter2hunter2";`,
    `API_KEY: 'abc123'`,
    `{"password": "p@ss w0rd"}`,
    `client_secret = 'zzz'`,
    `const token = 'abc.def.ghi';`,
  ];
  for (const c of cases) {
    const out = redact(c);
    assert.ok(out.includes('[REDACTED]'), `not redacted: ${c}`);
    assert.ok(!/hunter2|abc123|p@ss|zzz|abc\.def/.test(out), `value leaked: ${out}`);
  }
  assert.equal(redact(`const apiKey = "hunter2hunter2";`), `const apiKey = "[REDACTED]";`);
});

check('redact: leaves ordinary code alone and preserves multi-line content', () => {
  const text = "const a = 1;\nconst tokenizer = require('x');\nreturn a + 2;\n";
  assert.equal(redact(text), text);
  const multi = 'x = "AKIAIOSFODNN7EXAMPLE"\ny = 1\nz = \'ghp_abcdefghijklmnopqrstuvwxyz0123456789\'\n';
  sameLines(multi, redact(multi));
});

// ---------------------------------------------------------------------------
// analyzeFindings without a key
// ---------------------------------------------------------------------------
const lodashFinding: Finding = {
  pkg: { name: 'lodash', version: '4.17.20', direct: true, dev: false, path: ['lodash'] },
  advisory: {
    id: 'GHSA-35jh-r3h4-6jhm',
    aliases: ['CVE-2021-23337'],
    summary: 'Command Injection in lodash',
    details:
      'lodash versions prior to 4.17.21 are vulnerable to Command Injection via the template function. ' +
      'The `template` function accepts an `options.variable` parameter that is interpolated into generated source code ' +
      'without sanitisation, so an attacker who controls the options or template can execute arbitrary code. ' +
      'Upgrade to 4.17.21.',
    severity: 'HIGH',
    fixedVersions: ['4.17.21'],
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-23337'],
  },
  enrichment: { epss: null, kev: null },
  tier: 'FIX_SPRINT',
  reasons: [],
};

const savedKey = process.env.GEMINI_API_KEY;
const savedOffline = process.env.OFFLINE;

{
  delete process.env.GEMINI_API_KEY;
  delete process.env.OFFLINE;
  const r = await analyzeFindings([lodashFinding], [cjs]);
  assert.equal(r.status, 'disabled');
  assert.equal(r.verdicts.size, 0);
  passed++;
  console.log('ok  analyzeFindings: no API key -> disabled, empty map');
}

if (savedKey) {
  process.env.GEMINI_API_KEY = savedKey;
  const noSources = await analyzeFindings([lodashFinding], []);
  assert.equal(noSources.status, 'disabled');
  console.log('ok  analyzeFindings: no sources -> disabled');

  // Not-imported path: deterministic, no Gemini call.
  const notImported = await analyzeFindings([lodashFinding], [unrelated]);
  const k = findingKey(lodashFinding.pkg, lodashFinding.advisory);
  assert.equal(notImported.verdicts.get(k)?.verdict, 'NO_VULNERABLE_USAGE_FOUND');
  assert.equal(notImported.verdicts.get(k)?.reasoning, 'Package is not imported in the provided source code.');
  console.log('ok  analyzeFindings: not imported -> deterministic NO_VULNERABLE_USAGE_FOUND');
}
if (savedOffline) process.env.OFFLINE = savedOffline;

console.log(`\n${passed} offline checks passed`);

// ---------------------------------------------------------------------------
// Live check (only with a key)
// ---------------------------------------------------------------------------
if (!savedKey) {
  console.log('skipped live check (no GEMINI_API_KEY)');
} else {
  const fixture: SourceFile[] = [
    cjs,
    {
      path: 'src/routes/health.js',
      content: "const express = require('express');\nmodule.exports = express.Router().get('/health', (_req, res) => res.send('ok'));",
    },
  ];
  const t0 = Date.now();
  const result = await analyzeFindings([lodashFinding], fixture);
  const key = findingKey(lodashFinding.pkg, lodashFinding.advisory);
  const v = result.verdicts.get(key);
  console.log(`live check: status=${result.status} (${Date.now() - t0} ms)`);
  console.log(JSON.stringify(v, null, 2));
  if (result.warnings.length) console.log('warnings:', result.warnings);
  assert.ok(v, 'live check produced a verdict');
  // Every citation that survives must be real.
  for (const c of v.citations) {
    const line = fixture.find((s) => s.path === c.file)?.content.split('\n')[c.line - 1];
    assert.ok(line !== undefined, `citation file/line missing: ${c.file}:${c.line}`);
  }
  console.log(v.verdict === 'USES_VULNERABLE_API' ? 'live check: expected verdict reached' : 'live check: NOTE verdict was not USES_VULNERABLE_API');
}
