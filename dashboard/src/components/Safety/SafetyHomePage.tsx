import { Link } from 'react-router-dom'
import SafetyLayout from './SafetyLayout'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export default function SafetyHomePage() {
  useDocumentTitle('Safety Hub - Cladding Creations')

  return (
    <SafetyLayout
      title="Safety Hub"
      subtitle="Quickly choose where to start: publish SWMS templates or run project compliance schedules."
    >
      <section className="safety-card safety-hub-grid">
        <article className="safety-hub-card">
          <h3>Documents</h3>
          <p>Upload and version SWMS (Safe Work Method Statements) templates in a reusable library.</p>
          <Link to="/safety/documents" className="safety-btn-primary">
            Open Documents
          </Link>
        </article>

        <article className="safety-hub-card">
          <h3>Projects/Jobs/Sites</h3>
          <p>Create schedules, assign workers, and monitor pending/signed/overdue status in one place.</p>
          <Link to="/safety/projects" className="safety-btn-primary">
            Open Projects
          </Link>
        </article>

        <article className="safety-hub-card">
          <h3>My assignments</h3>
          <p>Mobile-first worker view to open assigned SWMS, complete reading, and sign safely on site.</p>
          <Link to="/safety/my-assignments" className="safety-btn-primary">
            Open My Assignments
          </Link>
        </article>
      </section>
    </SafetyLayout>
  )
}
