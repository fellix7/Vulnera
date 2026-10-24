import { Link } from '../../router'
import { Icon } from '../ui/Icon'
import { useOpenDemo } from './useOpenDemo'

export function FinalCta() {
  const openDemo = useOpenDemo()
  return (
    <section className="lp-section lp-section--cta" aria-labelledby="cta-title">
      <div className="lp-wrap">
        <div className="lp-cta">
          <div className="lp-cta__text">
            <h2 id="cta-title" className="lp-title">
              See the fix order for your own lockfile.
            </h2>
            <p className="lp-lede">Upload a package-lock.json, or open the clearly labelled demo to look around first.</p>
          </div>
          <div className="lp-cta__actions">
            <Link to="/scan" className="btn btn--primary btn--lg">
              Scan a project
              <Icon name="arrow-right" size={16} />
            </Link>
            <button type="button" className="btn btn--lg" onClick={openDemo}>
              <Icon name="beaker" size={16} />
              Explore the demo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
