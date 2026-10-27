import { SectionHead } from './SectionHead'

const PEOPLE = [
  {
    who: 'Small startups without security staff',
    job: 'Turn a pile of alerts into a short fix order and the exact command to run, without reading advisories written for specialists.',
  },
  {
    who: 'Growing engineering organisations',
    job: 'Decide what ships first the same way across projects. The tier rules are fixed and visible, so a prioritisation can be reviewed and challenged.',
  },
  {
    who: 'Security engineers reviewing many projects',
    job: 'Check the evidence instead of trusting a black box: the reasons, KEV and EPSS, the cited line of code, and a Markdown or JSON report to attach to a ticket.',
  },
  {
    who: 'Tech leads owning dependency hygiene',
    job: 'See what is worth a sprint slot, which upgrades are patch, minor or major, and what can safely stay on Monitor.',
  },
]

export function Audience() {
  return (
    <section id="who" className="lp-section" aria-labelledby="who-title">
      <div className="lp-wrap">
        <SectionHead
          id="who-title"
          eyebrow="Who it's for"
          title="For the people who own the upgrade."
          lede="Teams that depend on hundreds of packages and have no time to read every advisory."
        />
        <ul className="lp-people">
          {PEOPLE.map((p, i) => (
            <li key={p.who} className="lp-person">
              <span className="lp-person__n" aria-hidden="true">
                0{i + 1}
              </span>
              <h3>{p.who}</h3>
              <div>
                <p className="eyebrow">The job</p>
                <p className="lp-person__job">{p.job}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
