import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { safetyApi } from '../../../services/safetyApi'
import { safetyProjectsPath } from '../utils/safetyProjectsPath'
import {
  buildPreStartFormPath,
  defaultPreStartDueAtIso,
  findTodayPreStartSchedule,
  listPreStartDocumentIdsForProject,
  resolveDailyPreStartMaster
} from '../utils/preStartToday'
import { useSafetyManagerProjectAccess } from '../hooks/useSafetyManagerProjectAccess'
import SafetyManagerAccessDenied from '../SafetyManagerAccessDenied'

export default function PreStartEntryPage() {
  useDocumentTitle('Daily Pre-Start - Cladding Creations')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectName = (searchParams.get('project') ?? '').trim()
  const redirectedRef = useRef(false)
  const { isChecking, isDenied } = useSafetyManagerProjectAccess(projectName)

  const documentsQuery = useQuery({
    queryKey: ['safety-documents-for-prestart-entry'],
    queryFn: () => safetyApi.listDocuments()
  })

  const schedulesQuery = useQuery({
    queryKey: ['safety-schedules-project', projectName],
    queryFn: () => safetyApi.listSchedulesByProject(projectName),
    enabled: projectName.length > 0
  })

  useEffect(() => {
    if (!projectName || redirectedRef.current || isChecking || isDenied) return
    if (documentsQuery.isLoading || schedulesQuery.isLoading) return

    redirectedRef.current = true
    const masterDoc = resolveDailyPreStartMaster(documentsQuery.data ?? [])
    const preStartDocumentIds = listPreStartDocumentIdsForProject(
      documentsQuery.data ?? [],
      masterDoc?.document_id ?? null,
      projectName
    )
    const scheduleToday = findTodayPreStartSchedule(
      schedulesQuery.data ?? [],
      preStartDocumentIds,
      defaultPreStartDueAtIso()
    )

    if (scheduleToday) {
      navigate(`/safety/schedules/${scheduleToday.schedule_id}`, { replace: true })
      return
    }

    navigate(buildPreStartFormPath(projectName), { replace: true })
  }, [
    projectName,
    documentsQuery.isLoading,
    documentsQuery.data,
    schedulesQuery.isLoading,
    schedulesQuery.data,
    navigate,
    isChecking,
    isDenied
  ])

  if (!projectName) {
    return (
      <SafetyLayout title="Daily Pre-Start" subtitle="Select a project to continue.">
        <section className="safety-card">
          <div className="safety-alert safety-alert--error">
            <p>Select a project first from the Projects page.</p>
          </div>
          <Link className="safety-btn-secondary" to={safetyProjectsPath()}>
            Back to Projects
          </Link>
        </section>
      </SafetyLayout>
    )
  }

  if (isDenied) {
    return (
      <SafetyLayout title="Daily Pre-Start" subtitle={`Pre-start for ${projectName}`}>
        <SafetyManagerAccessDenied
          projectName={projectName}
          backToProjectsPath={safetyProjectsPath(projectName)}
          featureDescription="create and manage Daily Pre-Start checklists"
        />
      </SafetyLayout>
    )
  }

  return (
    <SafetyLayout title="Daily Pre-Start" subtitle={`Opening pre-start for ${projectName}…`}>
      <section className="safety-card">
        <p className="safety-muted">
          {isChecking ? 'Checking permissions…' : 'Resolving today&apos;s Daily Pre-Start…'}
        </p>
      </section>
    </SafetyLayout>
  )
}
