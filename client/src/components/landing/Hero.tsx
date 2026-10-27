import { Link } from '../../router'
import { Icon } from '../ui/Icon'
import { ProductPreview } from './ProductPreview'
import { useOpenDemo } from './useOpenDemo'

export function Hero() {
  const openDemo = useOpenDemo()
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-wrap">
        <div className="lp-hero__copy">
          <p className="eyebrow">Dependency risk triage for Node.js</p>
          <h1 id="hero-title">
            <span>Fix what matters.</span> <span className="lp-hero__dim">Ignore the noise.</span>
          </h1>
          <p className="lp-hero__lede">
            Vulnera analyses the vulnerable dependencies in a package-lock.json, checks whether your code actually reaches the vulnerable
            function, and produces an evidence-backed, verified upgrade plan.
          </p>
          <div className="lp-hero__cta">
            <Link to="/scan" className="btn btn--primary btn--lg">
              Scan a project
              <Icon name="arrow-right" size={16} />
            </Link>
            <button type="button" className="btn btn--lg" onClick={openDemo}>
              <Icon name="beaker" size={16} />
              Explore the demo
            </button>
          </div>
          <p className="lp-hero__trust">
            <span>
              <Icon name="lock" size={14} />
              Lockfiles are read, never installed or executed
            </span>
            <span className="lp-hero__sep" aria-hidden="true">
              ·
            </span>
            <span>
              <Icon name="shield-check" size={14} />
              Gemini key stays on the server
            </span>
          </p>
        </div>
        <ProductPreview />
      </div>
    </section>
  )
}
