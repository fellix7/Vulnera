import type { Finding, UpgradePlan } from '../types'
import { CopyButton } from './CopyButton'
import { JumpBadge } from './UpgradePlanView'

export function UpgradeTable({ plans, findings }: { plans: UpgradePlan[]; findings: Finding[] }) {
  const isDirect = (p: UpgradePlan) => {
    if (p.viaParent) return false
    const f = findings.find((x) => x.pkg.name === p.name && x.pkg.version === p.from)
    return f ? f.pkg.direct : true
  }
  const sorted = plans
    .map((p, i) => ({ p, i, direct: isDirect(p) }))
    .sort((a, b) => Number(b.direct) - Number(a.direct) || a.i - b.i)

  return (
    <section className="card" aria-labelledby="plans-h">
      <h2 id="plans-h">Upgrade plan</h2>
      <p className="muted">Direct dependencies first. Each target version is the smallest one that clears the advisories.</p>
      {sorted.length === 0 ? (
        <p className="empty">No upgrades needed.</p>
      ) : (
        <table className="plans">
          <thead>
            <tr>
              <th scope="col">Package</th>
              <th scope="col">Upgrade</th>
              <th scope="col">Type</th>
              <th scope="col">Command</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ p, direct }) => (
              <tr key={`${p.name}@${p.from}`}>
                <th scope="row" data-label="Package">
                  {p.name}
                  <span className="mini">{direct ? 'direct' : 'transitive'}</span>
                </th>
                <td data-label="Upgrade">
                  {p.to ? (
                    <>
                      <code>{p.from}</code> → <code>{p.to}</code> <JumpBadge jump={p.jump} />
                    </>
                  ) : (
                    <>
                      <code>{p.from}</code> → <strong>No verified fix available</strong>
                    </>
                  )}
                </td>
                <td data-label="Type">{p.viaParent ? `Upgrade via ${p.viaParent}` : direct ? 'Upgrade directly' : '—'}</td>
                <td data-label="Command">
                  {p.command ? (
                    <div className="cmd inline">
                      <pre>
                        <code>{p.command}</code>
                      </pre>
                      <CopyButton text={p.command} />
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
