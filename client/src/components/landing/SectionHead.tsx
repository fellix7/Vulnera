import type { ReactNode } from 'react'

/** Eyebrow + h2 + optional lede shared by every landing section. `id` is the h2 id (for aria-labelledby). */
export function SectionHead({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <header className="lp-head">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="lp-title">
        {title}
      </h2>
      {lede && <p className="lp-lede">{lede}</p>}
    </header>
  )
}
