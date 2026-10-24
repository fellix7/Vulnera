import { AiTag, VerifiedTag } from '../ui/Badges'
import { SectionHead } from './SectionHead'

const GUARDS = [
  {
    title: 'AI adds context, never the verdict on whether a package is vulnerable.',
    body: 'Matching is an exact OSV.dev lookup by name and version. The model can neither create a finding nor remove one.',
  },
  {
    title: 'Citations are verified against your source.',
    body: 'A quoted line must exist in your file, within one line of where the AI said it was. Otherwise the citation is dropped, and a “uses” verdict left with none becomes Uncertain.',
  },
  {
    title: 'AI can only raise priority. Only a person can lower it.',
    body: 'A reviewer can lower a finding by one tier. Findings on the CISA KEV list can never be lowered.',
  },
  {
    title: 'Uploaded projects are never installed or executed.',
    body: 'The lockfile is parsed as data. Only small snippets near usages of a vulnerable package go to Gemini, with secrets masked, and the API key stays on the server.',
  },
  {
    title: 'Unknown EPSS is shown as unknown, not zero.',
    body: 'If no exploit-probability score exists for an advisory, Vulnera says so instead of treating it as low risk. Findings the AI did not review read “Not assessed”.',
  },
]

const VERIFIED = [
  'Which packages are vulnerable (OSV.dev, exact match)',
  'EPSS and CISA KEV values, as published',
  'The tier, and the rule that set it',
  'The upgrade target, re-checked against OSV',
  'Whether a cited line exists in your file',
]
const AI = ['Which function or option an advisory is about', 'Whether your code appears to call it', 'The short reasoning behind the verdict']

export function Guardrails() {
  return (
    <section id="trust" className="lp-section" aria-labelledby="trust-title">
      <div className="lp-wrap lp-trust">
        <div className="lp-trust__lead">
          <SectionHead
            id="trust-title"
            eyebrow="Guardrails"
            title="AI adds context. Rules and lookups decide."
            lede="You should always be able to tell which part of a finding was looked up and which part was written by a model. The interface keeps the two visibly apart."
          />

          <div className="lp-prov">
            <div className="lp-prov__box lp-prov__box--verified">
              <VerifiedTag>Looked up or checked</VerifiedTag>
              <ul>
                {VERIFIED.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="lp-prov__box lp-prov__box--ai">
              <AiTag>AI-generated</AiTag>
              <ul>
                {AI.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ol className="lp-guards">
          {GUARDS.map((g, i) => (
            <li key={g.title} className="lp-guard">
              <span className="lp-guard__n" aria-hidden="true">
                0{i + 1}
              </span>
              <div>
                <h3>{g.title}</h3>
                <p className="muted">{g.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
