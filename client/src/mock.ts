// Illustrative demo data for UI development and the "View demo data" button.
// Values are realistic but NOT live: do not treat them as real scan output.
import type { Advisory, AiVerdict, Enrichment, Finding, Package, ScanResult, Tier, UpgradePlan } from './types'

const pkg = (name: string, version: string, direct: boolean, dev: boolean, path: string[]): Package => ({
  name,
  version,
  direct,
  dev,
  path,
})

const adv = (a: Omit<Advisory, 'references'> & { references?: string[] }): Advisory => ({
  ...a,
  references: a.references ?? [
    `https://github.com/advisories/${a.id}`,
    ...(a.aliases[0] ? [`https://nvd.nist.gov/vuln/detail/${a.aliases[0]}`] : []),
  ],
})

const f = (
  p: Package,
  advisory: Advisory,
  enrichment: Enrichment,
  tier: Tier,
  reasons: string[],
  ai?: AiVerdict,
): Finding => ({ pkg: p, advisory, enrichment, tier, reasons, ...(ai ? { ai } : {}) })

const ejs = pkg('ejs', '3.1.6', true, false, ['ejs'])
const lodash = pkg('lodash', '4.17.15', true, false, ['lodash'])
const jwt = pkg('jsonwebtoken', '8.5.1', true, false, ['jsonwebtoken'])
const axios = pkg('axios', '0.21.0', true, false, ['axios'])
const qs = pkg('qs', '6.7.0', false, false, ['express', 'body-parser', 'qs'])
const cookie = pkg('cookie', '0.4.0', false, false, ['express', 'cookie'])
const nodeUuid = pkg('node-uuid', '1.4.8', true, false, ['node-uuid'])
const minimist = pkg('minimist', '1.2.0', false, true, ['mocha', 'mkdirp', 'minimist'])
const wordWrap = pkg('word-wrap', '1.2.3', false, true, ['eslint', 'optionator', 'word-wrap'])
const ws = pkg('ws', '7.4.5', false, true, ['jest-environment-jsdom', 'jsdom', 'ws'])

const findings: Finding[] = [
  f(
    ejs,
    adv({
      id: 'GHSA-phwq-j96m-2c2q',
      aliases: ['CVE-2022-29078'],
      summary: 'ejs template injection vulnerability allows remote code execution',
      details:
        'The ejs (aka Embedded JavaScript templates) package 3.1.6 for Node.js allows server-side template injection in settings[view options][outputFunctionName]. This is parsed as an internal option, and overwrites the outputFunctionName option with an arbitrary OS command (which is executed upon template compilation).\n\nExploitation requires that attacker-controlled data reaches the options object passed to render().',
      severity: 'CRITICAL',
      fixedVersions: ['3.1.7'],
    }),
    { epss: 0.9423, kev: true },
    'FIX_NOW',
    [
      'Listed in CISA Known Exploited Vulnerabilities (KEV)',
      'Critical severity in production code',
      'EPSS 94.2% (top exploitation likelihood)',
      'Your code calls the vulnerable function',
    ],
    {
      verdict: 'USES_VULNERABLE_API',
      reasoning:
        'res.render is called with req.query spread into the options object, so a request can set settings[view options][outputFunctionName]. That is the exact injection path described in the advisory.',
      citations: [
        { file: 'src/routes/profile.js', line: 14, quote: "res.render('profile', { ...req.query, user })" },
      ],
    },
  ),
  f(
    lodash,
    adv({
      id: 'GHSA-35jh-r3h4-6jhm',
      aliases: ['CVE-2021-23337'],
      summary: 'Command Injection in lodash',
      details:
        'lodash versions prior to 4.17.21 are vulnerable to Command Injection via the template function. If an attacker can control the options.variable or the template source, arbitrary code can run when the compiled template is invoked.',
      severity: 'HIGH',
      fixedVersions: ['4.17.21'],
    }),
    { epss: 0.0212, kev: false },
    'FIX_NOW',
    [
      'High severity in production code',
      'Your code calls the vulnerable function (_.template)',
      'Direct dependency, one patch release fixes it',
    ],
    {
      verdict: 'USES_VULNERABLE_API',
      reasoning:
        '_.template is invoked with a template string loaded from a user-editable field, and `variable` is read from the request body. Both are attacker-influenced inputs named in the advisory.',
      citations: [
        {
          file: 'src/services/mailer.js',
          line: 31,
          quote: 'const render = _.template(tpl.body, { variable: req.body.varName })',
        },
        { file: 'src/services/mailer.js', line: 18, quote: 'const tpl = await Template.findById(id)' },
      ],
    },
  ),
  f(
    jwt,
    adv({
      id: 'GHSA-27h2-hvpr-p74q',
      aliases: ['CVE-2022-23529'],
      summary: 'jsonwebtoken has insecure input validation in jwt.verify function',
      details:
        'For versions <= 8.5.1 of jsonwebtoken library, if a malicious actor has the ability to modify the key retrieval parameter (referring to the secretOrPublicKey argument from the readme link) of the jwt.verify() function, they can gain remote code execution (RCE).',
      severity: 'HIGH',
      fixedVersions: ['9.0.0'],
    }),
    { epss: 0.0036, kev: false },
    'FIX_SPRINT',
    ['High severity in production code', 'EPSS 0.4% (below 10% threshold)', 'Major upgrade required (8 to 9)'],
    {
      verdict: 'NO_VULNERABLE_USAGE_FOUND',
      reasoning:
        'jwt.verify is called with a secret read from process.env at startup. The attack needs an attacker-controlled secretOrPublicKey argument, which was not found in the scanned files.',
      citations: [
        { file: 'src/middleware/auth.js', line: 22, quote: 'jwt.verify(token, process.env.JWT_SECRET, cb)' },
      ],
    },
  ),
  f(
    jwt,
    adv({
      id: 'GHSA-8cf7-32gw-wr33',
      aliases: ['CVE-2022-23539'],
      summary: 'jsonwebtoken unrestricted key type could lead to legacy keys usage',
      details:
        'Versions before 9.0.0 of jsonwebtoken library could be misconfigured so that legacy, insecure key types are used for signature verification. For example, DSA keys could be used with the RS256 algorithm.',
      severity: 'HIGH',
      fixedVersions: ['9.0.0'],
    }),
    { epss: 0.0018, kev: false },
    'FIX_SPRINT',
    ['High severity in production code', 'EPSS 0.2% (below 10% threshold)'],
    {
      verdict: 'UNCERTAIN',
      reasoning:
        'Tokens are verified with a key loaded from a file, but the code that generates or selects that key type is outside the uploaded sources, so exposure to legacy key types cannot be determined.',
      citations: [],
    },
  ),
  f(
    axios,
    adv({
      id: 'GHSA-cph5-m8f7-6c5x',
      aliases: ['CVE-2021-3749'],
      summary: 'axios Inefficient Regular Expression Complexity',
      details:
        'axios before 0.21.2 is vulnerable to Inefficient Regular Expression Complexity (ReDoS) in the trim function of its header handling. A crafted header value can block the event loop.',
      severity: 'HIGH',
      fixedVersions: ['0.21.2'],
    }),
    { epss: 0.0041, kev: false },
    'FIX_SPRINT',
    ['High severity in production code', 'EPSS 0.4% (below 10% threshold)'],
  ),
  f(
    qs,
    adv({
      id: 'GHSA-hrpp-h998-j3pp',
      aliases: ['CVE-2022-24999'],
      summary: 'qs vulnerable to Prototype Pollution',
      details:
        'qs before 6.10.3, as used in Express before 4.17.3 and other products, allows attackers to cause a Node process hang for an Express application because an __proto__ key can be used. In many typical Express use cases, an unauthenticated remote attacker can place the attack payload in the query string of the URL that is used to visit the application, such as a[__proto__]=b&a[__proto__]&a[length]=100000000.',
      severity: 'HIGH',
      fixedVersions: ['6.2.4', '6.3.3', '6.4.1', '6.5.3', '6.6.1', '6.7.3', '6.8.3', '6.9.7', '6.10.3'],
    }),
    { epss: 0.0277, kev: false },
    'FIX_SPRINT',
    [
      'High severity in production code',
      'Reachable on every request through Express body parsing',
      'Transitive: upgrade express to fix',
    ],
  ),
  f(
    lodash,
    adv({
      id: 'GHSA-p6mc-m468-83gf',
      aliases: ['CVE-2020-8203'],
      summary: 'Prototype Pollution in lodash',
      details:
        'Versions of lodash prior to 4.17.19 are vulnerable to Prototype Pollution. The function zipObjectDeep can be tricked into adding or modifying properties of the Object prototype.',
      severity: 'HIGH',
      fixedVersions: ['4.17.19'],
    }),
    { epss: 0.0089, kev: false },
    'FIX_SPRINT',
    ['High severity in production code', 'EPSS 0.9% (below 10% threshold)'],
    {
      verdict: 'NO_VULNERABLE_USAGE_FOUND',
      reasoning: 'zipObjectDeep and the other affected deep-path helpers are never imported in the scanned files.',
      citations: [{ file: 'src/utils/collections.js', line: 3, quote: "import { groupBy, sortBy } from 'lodash'" }],
    },
  ),
  f(
    axios,
    adv({
      id: 'GHSA-wf5p-g6vw-rhxx',
      aliases: ['CVE-2023-45857'],
      summary: 'Axios Cross-Site Request Forgery Vulnerability',
      details:
        'An issue discovered in Axios 1.5.1 inadvertently reveals the confidential XSRF-TOKEN stored in cookies by including it in the HTTP header X-XSRF-TOKEN for every request made to any host, allowing attackers to view sensitive information.',
      severity: 'MODERATE',
      fixedVersions: ['0.28.0', '1.6.0'],
    }),
    { epss: 0.0009, kev: false },
    'PLAN',
    ['Moderate severity in production code', 'EPSS 0.09% (very low)'],
  ),
  f(
    lodash,
    adv({
      id: 'GHSA-29mw-wpgm-hmr9',
      aliases: ['CVE-2020-28500'],
      summary: 'Regular Expression Denial of Service (ReDoS) in lodash',
      details:
        'lodash versions prior to 4.17.21 are vulnerable to Regular Expression Denial of Service (ReDoS) via the toNumber, trim and trimEnd functions.',
      severity: 'MODERATE',
      fixedVersions: ['4.17.21'],
    }),
    { epss: 0.0031, kev: false },
    'PLAN',
    ['Moderate severity in production code', 'EPSS 0.3% (below 10% threshold)'],
  ),
  f(
    cookie,
    adv({
      id: 'GHSA-pxg6-pf52-xh8x',
      aliases: ['CVE-2024-47764'],
      summary: 'cookie accepts cookie name, path, and domain with out of bounds characters',
      details:
        'The cookie name, path, and domain, which can be set by the application, accept characters outside the allowed range. An attacker who controls those values could set arbitrary cookie attributes.',
      severity: 'LOW',
      fixedVersions: ['0.7.0'],
    }),
    { epss: 0.0007, kev: false },
    'PLAN',
    ['Low severity in production code', 'Transitive: upgrade express to fix'],
  ),
  f(
    nodeUuid,
    adv({
      id: 'GHSA-265q-28rp-chq5',
      aliases: ['CVE-2015-8851'],
      summary: 'Insecure Entropy Source - Math.random() in node-uuid',
      details:
        'node-uuid 1.4.3 and earlier use Math.random() to generate identifiers on some platforms, which is not cryptographically secure. The package is deprecated and no patched version exists.',
      severity: 'MODERATE',
      fixedVersions: [],
    }),
    { epss: null, kev: false },
    'PLAN',
    ['Moderate severity in production code', 'No EPSS data available', 'No verified fix: replace the package'],
  ),
  f(
    minimist,
    adv({
      id: 'GHSA-xvch-5gv4-984h',
      aliases: ['CVE-2021-44906'],
      summary: 'Prototype Pollution in minimist',
      details:
        'Minimist <=1.2.5 is vulnerable to Prototype Pollution via file index.js, function setKey() (lines 69-95).',
      severity: 'CRITICAL',
      fixedVersions: ['0.2.4', '1.2.6'],
    }),
    { epss: 0.0073, kev: false },
    'MONITOR',
    ['Development dependency only (mocha)', 'Not shipped to production', 'EPSS 0.7% (below 10% threshold)'],
  ),
  f(
    minimist,
    adv({
      id: 'GHSA-vh95-rmgr-6w4m',
      aliases: ['CVE-2020-7598'],
      summary: 'Prototype Pollution in minimist',
      details:
        'minimist before 1.2.2 could be tricked into adding or modifying properties of Object.prototype using a constructor or __proto__ payload.',
      severity: 'MODERATE',
      fixedVersions: ['0.2.1', '1.2.3'],
    }),
    { epss: 0.0021, kev: false },
    'MONITOR',
    ['Development dependency only (mocha)', 'Not shipped to production'],
  ),
  f(
    wordWrap,
    adv({
      id: 'GHSA-j8xg-fqg3-53r7',
      aliases: ['CVE-2023-26115'],
      summary: 'word-wrap vulnerable to Regular Expression Denial of Service',
      details: 'All versions of the package word-wrap before 1.2.4 are vulnerable to ReDoS due to the regex used in the result variable.',
      severity: 'MODERATE',
      fixedVersions: ['1.2.4'],
    }),
    { epss: null, kev: null },
    'MONITOR',
    ['Development dependency only (eslint)', 'No EPSS or KEV data available'],
  ),
  f(
    ws,
    adv({
      id: 'GHSA-6fc8-4gx4-v693',
      aliases: ['CVE-2021-32640'],
      summary: 'ReDoS in Sec-Websocket-Protocol header',
      details:
        'ws is an open source WebSocket client and server library for Node.js. A specially crafted value of the Sec-Websocket-Protocol header can be used to significantly slow down a ws server.',
      severity: 'MODERATE',
      fixedVersions: ['5.2.3', '6.2.2', '7.4.6'],
    }),
    { epss: 0.0042, kev: false },
    'MONITOR',
    ['Development dependency only (jest-environment-jsdom)', 'Not shipped to production'],
  ),
]

const plans: UpgradePlan[] = [
  { name: 'ejs', from: '3.1.6', to: '3.1.7', jump: 'patch', command: 'npm install ejs@3.1.7' },
  { name: 'lodash', from: '4.17.15', to: '4.17.21', jump: 'patch', command: 'npm install lodash@4.17.21' },
  { name: 'jsonwebtoken', from: '8.5.1', to: '9.0.0', jump: 'major', command: 'npm install jsonwebtoken@9.0.0' },
  { name: 'axios', from: '0.21.0', to: '0.28.0', jump: 'minor', command: 'npm install axios@0.28.0' },
  { name: 'node-uuid', from: '1.4.8', to: null, jump: null, command: null },
  {
    name: 'qs',
    from: '6.7.0',
    to: '6.9.7',
    jump: 'minor',
    command: 'npm install express@4.17.3',
    viaParent: 'express',
  },
  {
    name: 'cookie',
    from: '0.4.0',
    to: '0.7.1',
    jump: 'minor',
    command: 'npm install express@4.21.1',
    viaParent: 'express',
  },
  {
    name: 'minimist',
    from: '1.2.0',
    to: '1.2.6',
    jump: 'patch',
    command: 'npm install --save-dev mocha@10.4.0',
    viaParent: 'mocha',
  },
  {
    name: 'word-wrap',
    from: '1.2.3',
    to: '1.2.4',
    jump: 'patch',
    command: 'npm install --save-dev eslint@8.57.0',
    viaParent: 'eslint',
  },
  {
    name: 'ws',
    from: '7.4.5',
    to: '7.4.6',
    jump: 'patch',
    command: 'npm install --save-dev jest-environment-jsdom@29.7.0',
    viaParent: 'jest-environment-jsdom',
  },
]

export const MOCK_RESULT: ScanResult = {
  scannedAt: '2026-10-24T09:30:00.000Z',
  packageCount: 412,
  findings,
  plans,
  aiStatus: 'ok',
  notes: [
    'EPSS has no score for 2 advisories; shown as "no data", not zero.',
    'No fixed version of node-uuid exists; consider replacing it with the uuid package.',
  ],
}
