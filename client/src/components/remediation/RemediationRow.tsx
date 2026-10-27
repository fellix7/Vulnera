import { useState } from 'react'
import { safeHttpUrl } from '../../lib/format'
import { findingHref } from '../../lib/selectors'
import { Link } from '../../router'
import type { ReviewState } from '../../lib/review'
import type { Finding } from '../../types'
import { DepBadge, JumpBadge, KevBadge, ScopeBadge, SeverityBadge, TierBadge, VerifiedTag } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { Callout, CommandBlock } from '../ui/Kit'
import { noFixReasons, overridesSnippet, tierOfFinding, type RemediationItem } from './model'
import { StatusTag } from './StatusTag'

interface Props {
  item: RemediationItem
  review: ReviewState
  open: boolean
  onToggle: () => void
}

const advisoryCount = (n: number) => `${n} ${n === 1 ? 'advisory' : 'advisories'}`

export function RemediationRow({ item, review, open, onToggle }: Props) {
  const { plan } = item
  const panelId = `rem-${item.id.replace(/[^A-Za-z0-9_-]/g, '_')}`
  const n = item.findings.length
  // For transitive packages the command is shown inside option B once the row is open.
  const inlineCommand = item.command && !(open && !item.direct)

  return (
    <li className={`rem rem--${item.status}`}>
      <button type="button" className="rem__head" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={onToggle}>
        <Icon name="chevron-right" size={14} className="rem__chev" />
        <span className="rem__pkg">
          <span className="rem__name mono">{plan.name}</span>
          <span className="rem__tags">
            <DepBadge direct={item.direct} />
            {item.dev && <ScopeBadge dev />}
          </span>
        </span>
        <span className="rem__ver">
          <span className="mono">{plan.from}</span>
          <span className="sr-only"> upgrade to </span>
          <Icon name="arrow-right" size={12} />
          {plan.to ? (
            <>
              <span className="mono rem__to">{plan.to}</span>
              <JumpBadge jump={plan.jump} />
            </>
          ) : (
            <span className="rem__nofix">no verified version</span>
          )}
        </span>
        <span className="rem__prio">
          <TierBadge tier={item.tier} />
          {item.kev && <KevBadge />}
          <SeverityBadge severity={item.severity} />
        </span>
        <span className="rem__cleared num">
          <strong>{n}</strong> {n === 1 ? 'advisory' : 'advisories'}
          <span className="sr-only">{plan.to ? ' cleared' : ' remain'}</span>
        </span>
        <StatusTag status={item.status} />
      </button>

      {(inlineCommand || item.major || (!item.direct && plan.to && !open)) && (
        <div className="rem__sub">
          {inlineCommand && item.command && (
            <div className="rem__cmd">
              <CommandBlock command={item.command.text} prompt={item.command.kind !== 'manual'} />
            </div>
          )}
          {item.major && (
            <p className="rem__note rem__note--warn">
              <Icon name="alert" size={13} />
              May contain breaking changes. Test before shipping.
            </p>
          )}
          {!item.direct && plan.to && !item.major && !open && (
            <p className="rem__note">
              <Icon name="info" size={13} />
              Suggested change. Run your tests after applying.
            </p>
          )}
        </div>
      )}

      {open && (
        <div id={panelId} className="rem__detail">
          {plan.to ? <TargetDetail item={item} review={review} /> : <NoFixDetail item={item} review={review} />}
        </div>
      )}
    </li>
  )
}

function AdvisoryList({ findings, review, from }: { findings: Finding[]; review: ReviewState; from: string }) {
  return (
    <ul className="rem-adv">
      {findings.map((f) => {
        const refs = f.advisory.references.map(safeHttpUrl).filter((u): u is string => u !== null)
        return (
          <li key={f.advisory.id}>
            <Link to={findingHref(f)} className="link mono rem-adv__id">
              {f.advisory.id}
            </Link>
            <SeverityBadge severity={f.advisory.severity} />
            <TierBadge tier={tierOfFinding(f, review)} />
            <span className="rem-adv__fix mono subtle">
              {f.advisory.fixedVersions.length > 0 ? `fixed in ${f.advisory.fixedVersions.join(', ')}` : `no fixed version above ${from}`}
            </span>
            <span className="rem-adv__sum muted">{f.advisory.summary}</span>
            {refs.length > 0 && (
              <a className="link rem-adv__ref" href={refs[0]} target="_blank" rel="noopener noreferrer">
                Advisory
                <span className="sr-only"> {f.advisory.id} (opens in a new tab)</span>
              </a>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function TargetDetail({ item, review }: { item: RemediationItem; review: ReviewState }) {
  const { plan } = item
  const n = item.findings.length
  const kind = item.command?.kind
  // A transitive plan normally carries an override command. If it instead carries `npm install <parent>`, that is the parent upgrade (option A).
  const optionCommand = kind === 'override' || kind === 'manual' ? item.command : null
  const parentCommand = kind === 'install' ? item.command : null
  const [view, setView] = useState<'command' | 'snippet'>(optionCommand ? 'command' : 'snippet')
  const snippet = overridesSnippet([item])

  return (
    <div className="rem__cols">
      <section className="rem__block" aria-label="Why this target">
        <h3>Why this target</h3>
        {n > 0 ? (
          <p>
            Clears {advisoryCount(n)}
            {': '}
            {item.findings.map((f, i) => (
              <span key={f.advisory.id}>
                {i > 0 && ', '}
                <Link to={findingHref(f)} className="link mono">
                  {f.advisory.id}
                </Link>
              </span>
            ))}
            . Highest priority: <TierBadge tier={item.tier} />
          </p>
        ) : (
          <p>No advisory in this scan is linked to this package version.</p>
        )}
        <p className="rem__verified">
          <VerifiedTag>Re-checked against OSV</VerifiedTag>
          <span className="muted">
            <span className="mono">{plan.to}</span> is the smallest version that clears {n === 1 ? 'the advisory' : `all ${n} advisories`} and is itself clean in
            OSV. If the first candidate was still vulnerable, up to 5 newer releases were checked.
          </span>
        </p>
        {item.findings.length > 0 && <AdvisoryList findings={item.findings} review={review} from={plan.from} />}
        {item.major && (
          <Callout tone="warn">
            <strong>Major version jump</strong> ({plan.from} to {plan.to}). It may contain breaking changes: read the changelog and test before shipping.
          </Callout>
        )}
        {item.command && !item.command.safe && item.command.kind !== 'manual' && (
          <Callout tone="warn">
            This command contains unexpected characters, so it is left out of the bulk copy and the shell script. Check the package name before running it.
          </Callout>
        )}
      </section>

      {!item.direct && (
        <section className="rem__block" aria-label="How to apply">
          <h3>How to apply</h3>
          <p className="rem__chain">
            Pulled in by {item.parent ? <code>{item.parent}</code> : <span>a direct dependency</span>}.
            {item.path.length > 1 && (
              <>
                {' '}
                Dependency path: <span className="mono">{item.path.join(' → ')}</span>
              </>
            )}
          </p>
          <ol className="rem-opts">
            {item.parent && (
              <li>
                <strong>Option A.</strong> Upgrade <code>{item.parent}</code> to a version that depends on a fixed <code>{plan.name}</code>. Vulnera has not
                verified this: check the parent&apos;s changelog and lockfile after upgrading.
                {parentCommand && (
                  <div className="rem__optcmd">
                    <CommandBlock command={parentCommand.text} />
                  </div>
                )}
              </li>
            )}
            <li>
              <strong>Option {item.parent ? 'B' : '1'}.</strong> Force the fixed version with an npm override. Suggested: run your tests after applying.
              <div className="rem__optcmd">
                {optionCommand && (
                  <div className="seg" role="group" aria-label={`View for ${plan.name}`}>
                    <button type="button" aria-pressed={view === 'command'} onClick={() => setView('command')}>
                      Command
                    </button>
                    <button type="button" aria-pressed={view === 'snippet'} onClick={() => setView('snippet')}>
                      package.json snippet
                    </button>
                  </div>
                )}
                {view === 'command' && optionCommand ? (
                  <CommandBlock command={optionCommand.text} prompt={optionCommand.kind !== 'manual'} />
                ) : (
                  <CommandBlock command={snippet} prompt={false} />
                )}
                <p className="subtle rem__hint">
                  {view === 'snippet' ? 'Merge this into package.json, then run npm install. ' : 'Run npm install afterwards to update package-lock.json. '}
                  Suggested: run your tests after applying.
                </p>
              </div>
            </li>
          </ol>
        </section>
      )}
    </div>
  )
}

function NoFixDetail({ item, review }: { item: RemediationItem; review: ReviewState }) {
  const { plan } = item
  const reasons = noFixReasons(item)
  return (
    <div className="rem__cols">
      <section className="rem__block" aria-label="Why there is no verified fix">
        <h3>Why there is no verified fix</h3>
        <ul className="rem-reasons">
          {reasons.unfixed.length > 0 && (
            <li>
              No fixed version above <span className="mono">{plan.from}</span> is published for{' '}
              {reasons.unfixed.map((f, i) => (
                <span key={f.advisory.id}>
                  {i > 0 && ', '}
                  <Link to={findingHref(f)} className="link mono">
                    {f.advisory.id}
                  </Link>
                </span>
              ))}
              .
            </li>
          )}
          {reasons.candidate && (
            <li>
              A fixed version is published (the smallest that covers every advisory is <span className="mono">{reasons.candidate}</span>), but it and the
              releases above it that were checked (up to 5) were still reported as vulnerable by OSV.
            </li>
          )}
          {reasons.unfixed.length === 0 && !reasons.candidate && <li>No version that clears every advisory could be confirmed.</li>}
        </ul>
        {item.findings.length > 0 && <AdvisoryList findings={item.findings} review={review} from={plan.from} />}
      </section>
      <section className="rem__block" aria-label="What you can do">
        <h3>What you can do</h3>
        <p>
          Replace <code>{plan.name}</code> with a maintained alternative, remove it if nothing uses it, or keep monitoring the advisories until a fix ships.
          {item.dev && ' It is a development-only dependency, so it does not ship to production.'}
        </p>
        <p>
          <Link to={`/findings?q=${encodeURIComponent(plan.name)}`} className="btn btn--sm">
            <Icon name="list" size={14} />
            View findings for {plan.name}
          </Link>
        </p>
      </section>
    </div>
  )
}
