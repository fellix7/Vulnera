import { Icon } from '../ui/Icon'
import { SectionHead } from './SectionHead'

const HYPOTHESES = [
  {
    title: 'Less manual triage time',
    body: 'A tiered list with reasons should replace most of the reading, sorting and cross-checking done by hand today.',
    test: 'Time triage on real projects with and without Vulnera.',
  },
  {
    title: 'Faster safe upgrades',
    body: 'Starting from a verified target version and an exact command should shorten the path from alert to merged fix.',
    test: 'Measure time from first scan to applied upgrade, and how often the target version needs correcting.',
  },
  {
    title: 'Security coverage without specialists',
    body: 'Teams with nobody dedicated to security should be able to act on dependency risk with the same confidence as teams that have one.',
    test: 'Ask such teams whether they would have acted on the same findings, and why.',
  },
]

const MODEL = [
  {
    title: 'Free individual scans',
    body: 'Upload a lockfile, with source code if you like, and get the tiered plan, evidence and exports. Scan history stays in your own browser.',
    now: true,
  },
  { title: 'Team', body: 'Shared review of findings and shared scan history.', now: false },
  { title: 'CI integration and scheduled monitoring', body: 'Scans on every pull request and on a schedule, instead of when someone remembers.', now: false },
  { title: 'Organisation reporting', body: 'Posture across many projects, for the people who answer for it.', now: false },
]

export function Roadmap() {
  return (
    <section id="roadmap" className="lp-section" aria-labelledby="roadmap-title">
      <div className="lp-wrap">
        <SectionHead
          id="roadmap-title"
          eyebrow="Business case and roadmap"
          title="What we expect to prove, and what might come next."
          lede="These are hypotheses and a proposal. None of it has been measured, and nothing below the first step exists yet."
        />

        <div className="lp-hyp">
          <h3 className="lp-subhead">
            Intended benefits <span className="badge">Hypotheses to validate</span>
          </h3>
          <ul className="lp-hyp__list">
            {HYPOTHESES.map((h, i) => (
              <li key={h.title} className="lp-hyp__item">
                <span className="eyebrow">Hypothesis {i + 1}</span>
                <h4>{h.title}</h4>
                <p className="muted">{h.body}</p>
                <p className="lp-hyp__test">
                  <span className="subtle">How we would test it: </span>
                  {h.test}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-model">
          <h3 className="lp-subhead">
            Proposed model: not available today <span className="badge">Proposal</span>
          </h3>
          <ol className="lp-ladder">
            {MODEL.map((m, i) => (
              <li key={m.title} className="lp-rung" data-now={m.now}>
                <div className="lp-rung__top">
                  <span className="lp-rung__n">0{i + 1}</span>
                  {m.now ? (
                    <span className="badge badge--ok">
                      <Icon name="check" size={12} />
                      Available now
                    </span>
                  ) : (
                    <span className="badge">Proposed</span>
                  )}
                </div>
                <h4>{m.title}</h4>
                <p className="muted">{m.body}</p>
              </li>
            ))}
          </ol>
          <p className="lp-model__note subtle">
            No pricing is published because none has been decided. There are no customers, logos or testimonials to show.
          </p>
        </div>
      </div>
    </section>
  )
}
