import { useEffect, type ComponentType } from 'react'
import { AppShell } from './components/AppShell'
import { Icon } from './components/ui/Icon'
import { PageHeader } from './components/ui/Kit'
import EvidencePage from './pages/Evidence'
import FindingDetailPage from './pages/FindingDetail'
import FindingsPage from './pages/Findings'
import LandingPage from './pages/Landing'
import OverviewPage from './pages/Overview'
import RemediationPage from './pages/Remediation'
import ReportsPage from './pages/Reports'
import ScanPage from './pages/Scan'
import { Link, navigate, useLocation } from './router'
import { ScanProvider, useScan } from './state/store'

const APP_ROUTES: Record<string, { page: ComponentType; title: string }> = {
  '/scan': { page: ScanPage, title: 'New scan' },
  '/overview': { page: OverviewPage, title: 'Overview' },
  '/findings': { page: FindingsPage, title: 'Findings' },
  '/finding': { page: FindingDetailPage, title: 'Finding' },
  '/evidence': { page: EvidencePage, title: 'Code evidence' },
  '/remediation': { page: RemediationPage, title: 'Remediation' },
  '/reports': { page: ReportsPage, title: 'Reports & history' },
}

function Routes() {
  const { path, search } = useLocation()
  const { loadDemo } = useScan()
  const mock = search.get('mock') === '1'

  // Old links: ?mock=1 opened demo data on the single-page dashboard.
  useEffect(() => {
    if (!mock) return
    loadDemo()
    navigate('/overview', { replace: true })
  }, [mock, loadDemo])

  const route = APP_ROUTES[path]
  useEffect(() => {
    document.title = path === '/' ? 'Vulnera · Fix what matters' : `${route?.title ?? 'Not found'} · Vulnera`
  }, [path, route])

  if (path === '/') return <LandingPage />
  if (!route) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="404"
          title="Page not found"
          description={`There is nothing at ${path}.`}
          actions={
            <Link to="/overview" className="btn">
              <Icon name="arrow-left" size={14} />
              Back to overview
            </Link>
          }
        />
      </AppShell>
    )
  }
  const Page = route.page
  return (
    <AppShell>
      <Page />
    </AppShell>
  )
}

export default function App() {
  return (
    <ScanProvider>
      <Routes />
    </ScanProvider>
  )
}
