import type { UpgradePlan } from '../types'
import { CopyButton } from './CopyButton'

export function JumpBadge({ jump }: { jump: UpgradePlan['jump'] }) {
  if (!jump) return null
  return (
    <span className={`badge jump jump-${jump}`} title={jump === 'major' ? 'Major version: may contain breaking changes' : undefined}>
      {jump} upgrade
    </span>
  )
}

export function CommandBlock({ command }: { command: string }) {
  return (
    <div className="cmd">
      <pre>
        <code>{command}</code>
      </pre>
      <CopyButton text={command} />
    </div>
  )
}

/** Plan for one package, as shown in the detail panel. */
export function UpgradePlanView({ plan }: { plan: UpgradePlan | undefined }) {
  if (!plan) return <p className="muted">No upgrade plan was returned for this package.</p>
  if (plan.to === null) {
    return (
      <div>
        <p>
          <strong>No verified fix available</strong> for {plan.name}@{plan.from}.
        </p>
        <p className="muted">
          Vulnera only recommends versions that are re-checked clean against OSV.dev. Consider replacing or removing
          this package.
        </p>
      </div>
    )
  }
  return (
    <div>
      <p className="plan-line">
        <code>{plan.from}</code> <span aria-label="to">→</span> <code>{plan.to}</code> <JumpBadge jump={plan.jump} />
      </p>
      {plan.viaParent && (
        <p>
          Upgrade via <strong>{plan.viaParent}</strong> (this is a transitive dependency).
        </p>
      )}
      {plan.command && <CommandBlock command={plan.command} />}
    </div>
  )
}
