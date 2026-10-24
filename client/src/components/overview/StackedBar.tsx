import { Link } from '../../router'

export interface Segment {
  key: string
  label: string
  count: number
  /** Any CSS colour, normally a design token such as `var(--critical)`. */
  color: string
  /** Where the legend entry links to (only used when count > 0). */
  href?: string
  hint?: string
}

interface Props {
  /** Visible heading text; also used in the text equivalent of the bar. */
  title: string
  segments: Segment[]
  /** Noun for the text equivalent, e.g. "findings". */
  unit?: string
  /** Optional one-line caption under the legend. */
  note?: string
}

/**
 * One stacked bar with a legend. The legend is the accessible, labelled version of the bar:
 * every segment is named and counted in text, and the bar itself carries an equivalent aria-label.
 */
export function StackedBar({ title, segments, unit = 'findings', note }: Props) {
  const total = segments.reduce((n, s) => n + s.count, 0)
  const summary = segments.filter((s) => s.count > 0).map((s) => `${s.count} ${s.label}`).join(', ')

  return (
    <div className="ov-dist">
      <div className="ov-dist__head">
        <h3>{title}</h3>
        <span className="num subtle">
          {total.toLocaleString()} {unit}
        </span>
      </div>
      <div className="ov-bar" role="img" aria-label={`${title}: ${summary || `no ${unit}`}`}>
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span key={s.key} style={{ flexGrow: s.count, background: s.color }} />
          ))}
      </div>
      <ul className="ov-legend">
        {segments.map((s) => {
          const body = (
            <>
              <i style={{ background: s.color }} aria-hidden="true" />
              <span className="ov-legend__label">{s.label}</span>
              <b className="num">{s.count.toLocaleString()}</b>
            </>
          )
          return (
            <li key={s.key} className={s.count === 0 ? 'is-zero' : undefined} title={s.hint}>
              {s.href && s.count > 0 ? (
                <Link to={s.href} className="ov-legend__item">
                  {body}
                </Link>
              ) : (
                <span className="ov-legend__item">{body}</span>
              )}
            </li>
          )
        })}
      </ul>
      {note && <p className="ov-dist__note subtle">{note}</p>}
    </div>
  )
}
