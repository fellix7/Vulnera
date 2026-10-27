import { MOCK_RESULT } from '../../mock'
import { SeverityBadge, TierBadge, VerdictBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { SectionHead } from './SectionHead'

// Source: samples/demo-app/EXPECTED.md (QuickNotes sample). 251 packages matched to OSV.dev give 76 advisories
// across 21 vulnerable packages, identical to OSV-Scanner 2.7.0. Largest eight shown, in count order.
const FLAT_LIST: [string, number][] = [
  ['axios@0.21.0', 25],
  ['lodash@4.17.15', 6],
  ['nanoid@3.1.12', 5],
  ['js-yaml@3.14.0', 5],
  ['minimatch@3.0.4', 4],
  ['qs@6.7.0', 4],
  ['jsonwebtoken@8.5.1', 3],
  ['body-parser@1.19.0', 3],
]
const FLAT_REST = 21 - FLAT_LIST.length

const TYPICAL = [
  'Ordered by a severity score alone',
  'Dev-only and production packages in one list',
  'No view of whether your code calls the vulnerable function',
  'For transitive findings, which dependency to upgrade is left to you',
]
const APPROACH = [
  'Four tiers from fixed rules, every one with stated reasons',
  'Dev-only findings stay visible, but separated',
  'The line your code calls, with the quote checked against your file',
  'The smallest verified upgrade, with the exact command',
]

const EXAMPLE =
  MOCK_RESULT.findings.find((f) => f.advisory.id === 'GHSA-35jh-r3h4-6jhm') ?? MOCK_RESULT.findings[0]!
const EXAMPLE_PLAN = MOCK_RESULT.plans.find((p) => p.name === EXAMPLE.pkg.name && p.from === EXAMPLE.pkg.version)

export function Problem() {
  return (
    <section id="problem" className="lp-section" aria-labelledby="problem-title">
      <div className="lp-wrap">
        <SectionHead
          id="problem-title"
          eyebrow="The problem"
          title="A longer list is not a plan."
          lede="Finding known-vulnerable packages is a solved problem. Knowing which of them deserve your next hour is not."
        />

        <div className="lp-compare">
          <div className="lp-compare__col">
            <div className="lp-compare__head">
              <h3>Conventional scanner output</h3>
              <span className="subtle">QuickNotes sample</span>
            </div>
            <p className="lp-stat">
              <span className="lp-stat__n num">76</span>
              <span className="lp-stat__l">
                advisories across 251 packages, matching OSV-Scanner 2.7.0 exactly
              </span>
            </p>
            <ul className="lp-flat" aria-label="Vulnerable packages and their advisory counts, flat list">
              {FLAT_LIST.map(([name, n]) => (
                <li key={name}>
                  <span className="mono">{name}</span>
                  <span className="mono num subtle">
                    {n} {n === 1 ? 'advisory' : 'advisories'}
                  </span>
                </li>
              ))}
              <li className="lp-flat__rest subtle">+ {FLAT_REST} more vulnerable packages</li>
            </ul>
            <p className="lp-compare__note subtle">
              Sorted by count. Dev-only and production packages sit side by side, and nothing says which advisory your code can reach.
            </p>
            <ul className="lp-points">
              {TYPICAL.map((t) => (
                <li key={t}>
                  <Icon name="minus" size={14} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-compare__col">
            <div className="lp-compare__head">
              <h3>Vulnera</h3>
              <span className="badge badge--accent">Demo data</span>
            </div>
            <p className="lp-stat">
              <span className="lp-stat__l">Same matches, turned into a decision.</span>
            </p>
            <div className="lp-example">
              <div className="lp-example__head">
                <TierBadge tier={EXAMPLE.tier} />
                <span className="lp-example__pkg">
                  {EXAMPLE.pkg.name}@{EXAMPLE.pkg.version}
                </span>
                <SeverityBadge severity={EXAMPLE.advisory.severity} />
                <VerdictBadge verdict={EXAMPLE.ai?.verdict ?? 'NOT_ASSESSED'} />
              </div>
              <p className="eyebrow">Why this tier</p>
              <ul className="lp-reasons">
                {EXAMPLE.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {EXAMPLE_PLAN?.command && EXAMPLE_PLAN.to && (
                <>
                  <p className="eyebrow">
                    Fix: {EXAMPLE_PLAN.from} to {EXAMPLE_PLAN.to}, {EXAMPLE_PLAN.jump} upgrade
                  </p>
                  <div className="cmd">
                    <span className="cmd__prompt" aria-hidden="true">
                      $
                    </span>
                    <pre>
                      <code>{EXAMPLE_PLAN.command}</code>
                    </pre>
                  </div>
                </>
              )}
            </div>
            <p className="lp-compare__note subtle">One finding from the demo data. Each one carries its reasons, evidence and verified fix.</p>
            <ul className="lp-points lp-points--yes">
              {APPROACH.map((t) => (
                <li key={t}>
                  <Icon name="check" size={14} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
