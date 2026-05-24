import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getLogoPath } from '../../utils/assetUtils'
import './Safety.css'

interface SafetyLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
  /** Contenido a la derecha del subnav (p. ej. enlace Back). */
  subnavEnd?: ReactNode
}

function getEmailInitial(email: string | undefined): string {
  if (!email) return '?'
  const localPart = email.trim().split('@')[0] ?? email
  const letter = localPart.replace(/[^a-zA-Z0-9]/g, '').charAt(0) || email.trim().charAt(0)
  return letter.toUpperCase()
}

export default function SafetyLayout({ title, subtitle, children, actions, subnavEnd }: SafetyLayoutProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const subnavLinksRef = useRef<HTMLDivElement>(null)
  const isSafetyHub = title.trim().toLowerCase() === 'safety hub'
  const documentsNavActive =
    location.pathname === '/safety/documents' || /^\/safety\/documents\/.+/.test(location.pathname)
  const projectsNavActive =
    location.pathname.startsWith('/safety/projects') || location.pathname.startsWith('/safety/schedules/')
  const myAssignmentsNavActive =
    location.pathname === '/safety/my-assignments' || location.pathname.startsWith('/safety/my-assignments/')

  useEffect(() => {
    const container = subnavLinksRef.current
    if (!container) return

    const scrollActiveIntoCenter = () => {
      const activeItem = container.querySelector<HTMLElement>('.safety-subnav-item.is-active')
      if (!activeItem) return

      const maxScroll = container.scrollWidth - container.clientWidth
      const targetScrollLeft =
        activeItem.offsetLeft - (container.clientWidth - activeItem.offsetWidth) / 2

      container.scrollTo({
        left: Math.min(maxScroll, Math.max(0, targetScrollLeft)),
        behavior: 'smooth'
      })
    }

    const frame = requestAnimationFrame(scrollActiveIntoCenter)
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  const userEmail = user?.email
  const emailInitial = getEmailInitial(userEmail)

  return (
    <div className="safety-shell">
      <header className="safety-header">
        <div className="safety-header-left">
          <img src={getLogoPath()} alt="Cladding Creations" className="safety-logo" />
          <h1 className="safety-header-title">Safety</h1>
        </div>
        <div className="safety-header-right">
          {userEmail ? (
            <>
              <span
                className="safety-user-avatar"
                title={userEmail}
                aria-label={`Signed in as ${userEmail}`}
              >
                {emailInitial}
              </span>
              <span className="safety-user-email" title={userEmail}>
                {userEmail}
              </span>
            </>
          ) : null}
          <button
            type="button"
            className="safety-logout"
            onClick={() => signOut()}
            aria-label="Logout"
          >
            <span className="material-icons safety-logout-icon" aria-hidden>
              logout
            </span>
            <span className="safety-logout-label">Logout</span>
          </button>
        </div>
      </header>
      <main className="safety-main">
        <section className="safety-page-head">
          <nav className="safety-breadcrumb" aria-label="Breadcrumb">
            <ol className="safety-breadcrumb-list">
              <li>
                <Link to="/safety">Safety</Link>
              </li>
              {!isSafetyHub ? (
                <>
                  <li className="safety-breadcrumb-sep" aria-hidden="true">/</li>
                  <li className="safety-breadcrumb-current">{title}</li>
                </>
              ) : null}
            </ol>
          </nav>
          <div className="safety-page-head-top">
            <div className="page-heading safety-page-heading">
              <h2 className="page-heading-title safety-page-title">{title}</h2>
              {subtitle ? <p className="page-heading-desc safety-page-desc">{subtitle}</p> : null}
            </div>
            {actions ? <div className="safety-page-actions">{actions}</div> : null}
          </div>
          <nav className="safety-subnav" aria-label="Safety navigation">
            <div className="safety-subnav-links" ref={subnavLinksRef}>
              <Link to="/safety" className={`safety-subnav-item${isSafetyHub ? ' is-active' : ''}`}>Overview</Link>
              <Link to="/safety/documents" className={`safety-subnav-item${documentsNavActive ? ' is-active' : ''}`}>Documents</Link>
              <Link to="/safety/projects" className={`safety-subnav-item${projectsNavActive ? ' is-active' : ''}`}>Projects/Jobs/Sites</Link>
              <Link to="/safety/my-assignments" className={`safety-subnav-item${myAssignmentsNavActive ? ' is-active' : ''}`}>My assignments</Link>
            </div>
            {subnavEnd ? <div className="safety-subnav-trailing">{subnavEnd}</div> : null}
          </nav>
        </section>
        {children}
      </main>
    </div>
  )
}
