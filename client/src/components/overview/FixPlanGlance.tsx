import { Link } from '../../router'
import type { UpgradePlan } from '../../types'
import { Icon } from '../ui/Icon'
import { StackedBar, type Segment } from './StackedBar'

/** Summary of the remediation plan: how many packages have a verified fix, and how big each jump is. */
export function FixPlanGlance({ plans }: { plans: UpgradePlan[] }) {
  const fixable = plans.filter((p) => p.to)
  const noFix = plans.length - fixable.length
  const patch = fixable.filter((p) => p.jump === 'patch').length
  const minor = fixable.filter((p) => p.jump === 'minor').length
  const major = fixable.filter((p) => p.jump === 'major').length
  const other = fixable.length - patch - minor - major
  const viaParent = fixable.filter((p) => p.viaParent).length

  const segments: Segment[] = [
    { key: 'patch', label: 'Patch', count: patch, color: 'var(--ok)', hint: 'Bug-fix release' },
    { key: 'minor', label: 'Minor', count: minor, color: 'var(--info)', hint: 'New features, same major version' },
    { key: 'major', label: 'Major', count: major, color: 'var(--warn)', hint: 'May contain breaking changes' },
    ...(other > 0 ? [{ key: 'other', label: 'Other', count: other, color: 'var(--text-3)' }] : []),
    { key: 'none', label: 'No verified fix', count: noFix, color: 'var(--line-strong)', hint: 'No version was found that clears every advisory' },
  ]

  return (
    <section className="ov-plan" aria-labelledby="ov-plan-h">
      <div className="ov-section-head ov-section-head--tight">
        <h2 id="ov-plan-h">Fix plan at a glance</h2>
        <Link to="/remediation" className="ov-more">
          Open fix plan <Icon name="arrow-right" size={12} />
        </Link>
      </div>
      {plans.length === 0 ? (
        <p className="ov-empty">There is nothing to upgrade: no vulnerable package versions were found.</p>
      ) : (
        <div className="ov-plan__grid">
          <div className="ov-plan__lead">
            <p className="ov-plan__big num">
              {fixable.length.toLocaleString()}
              <span className="subtle"> of {plans.length.toLocaleString()}</span>
            </p>
            <p className="ov-plan__text">
              vulnerable {plans.length === 1 ? 'package has' : 'packages have'} a verified safe upgrade
              {noFix > 0 ? `; ${noFix.toLocaleString()} ${noFix === 1 ? 'has' : 'have'} no verified fix` : ''}.
            </p>
            <p className="ov-plan__sub subtle">
              Each target is the smallest version that clears every advisory for that package and was re-checked against OSV.
              {viaParent > 0
                ? ` ${viaParent.toLocaleString()} ${viaParent === 1 ? 'is' : 'are'} transitive: fixed by upgrading a parent or adding an override, which is a suggestion that needs testing.`
                : ''}
            </p>
          </div>
          <StackedBar title="Upgrade jump size" segments={segments} unit="packages" />
        </div>
      )}
    </section>
  )
}
