import { Icon } from '../ui/Icon'
import { STATUS_LABEL, type FixStatus } from './model'

/** Status of a remediation item. Always icon + text, never colour alone. */
export function StatusTag({ status }: { status: FixStatus }) {
  if (status === 'verified')
    return (
      <span className="badge badge--ok rem-status" title="Direct dependency; the target version was re-checked against OSV">
        <Icon name="shield-check" size={12} />
        {STATUS_LABEL.verified}
      </span>
    )
  if (status === 'test')
    return (
      <span
        className="badge badge--warn rem-status"
        title="The target version was re-checked against OSV, but the change itself (a major upgrade or an override) needs testing"
      >
        <Icon name="alert" size={12} />
        {STATUS_LABEL.test}
      </span>
    )
  return (
    <span className="badge badge--critical rem-status" title="No version was found that clears every advisory and is itself clean in OSV">
      <Icon name="x" size={12} />
      {STATUS_LABEL.none}
    </span>
  )
}

/** Explains the three statuses once, above the list. */
export function StatusLegend() {
  return (
    <section className="rem-legend" aria-label="Status legend">
      <h2 className="eyebrow">How to read the status</h2>
      <ul>
        <li>
          <StatusTag status="verified" />
          <p>Direct dependency, patch or minor. The target is the smallest version that clears every advisory and is itself clean in OSV.</p>
        </li>
        <li>
          <StatusTag status="test" />
          <p>The target is re-checked the same way, but a major version or a transitive override can change behaviour. Run your tests.</p>
        </li>
        <li>
          <StatusTag status="none" />
          <p>No published version clears every advisory and is clean in OSV. Replace, remove or monitor the package.</p>
        </li>
      </ul>
    </section>
  )
}
