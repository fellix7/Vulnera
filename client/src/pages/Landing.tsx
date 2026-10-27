import './landing.css'
import { Audience } from '../components/landing/Audience'
import { FinalCta } from '../components/landing/FinalCta'
import { Guardrails } from '../components/landing/Guardrails'
import { Hero } from '../components/landing/Hero'
import { HowItWorks } from '../components/landing/HowItWorks'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingNav } from '../components/landing/LandingNav'
import { Problem } from '../components/landing/Problem'
import { Roadmap } from '../components/landing/Roadmap'
import { Why } from '../components/landing/Why'

/** Public landing page at `/`. Own nav and footer; rendered outside the app shell. */
export default function LandingPage() {
  return (
    <div className="lp" id="top">
      <a className="lp-skip" href="#main">
        Skip to content
      </a>
      <LandingNav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Problem />
        <HowItWorks />
        <Why />
        <Guardrails />
        <Audience />
        <Roadmap />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
