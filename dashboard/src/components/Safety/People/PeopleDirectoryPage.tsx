import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import SafetyAdminAccessDenied from '../SafetyAdminAccessDenied'
import { useSafetyGlobalAdmin } from '../hooks/useSafetyGlobalAdmin'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { safetyApi } from '../../../services/safetyApi'
import type { SafetyProfileMembership, SafetyProjectMemberRole } from '../../../types/safety'
import PeopleDirectoryTable from './PeopleDirectoryTable'
import PeopleProjectSelect from './PeopleProjectSelect'

export default function PeopleDirectoryPage() {
  useDocumentTitle('Safety People - Cladding Creations')

  const queryClient = useQueryClient()
  const { isChecking, isAdmin, isDenied } = useSafetyGlobalAdmin()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [managersOnly, setManagersOnly] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!feedback) return
    const node = feedbackRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.requestAnimationFrame(() => {
      node.focus({ preventScroll: true })
    })
  }, [feedback])

  const directoryQuery = useQuery({
    queryKey: ['safety-people-directory', debouncedSearch, projectFilter, managersOnly, includeInactive],
    queryFn: () => safetyApi.listPeopleDirectory({
      search: debouncedSearch || undefined,
      projectName: projectFilter || undefined,
      managersOnly,
      includeInactive
    }),
    enabled: isAdmin
  })

  const projectsQuery = useQuery({
    queryKey: ['safety-projects-for-people'],
    queryFn: () => safetyApi.listProjects(),
    enabled: isAdmin
  })

  const projects = useMemo(
    () => [...(projectsQuery.data ?? [])]
      .filter((project) => Boolean(project.Name?.trim()))
      .sort((a, b) => a.Name.localeCompare(b.Name)),
    [projectsQuery.data]
  )

  const projectOptions = useMemo(
    () => projects.map((project) => project.Name),
    [projects]
  )

  const counters = useMemo(() => {
    const rows = directoryQuery.data ?? []
    const withMemberships = rows.filter((row) => row.memberships.some((m) => m.is_active)).length
    const managers = rows.filter((row) => row.memberships.some((m) => m.is_active && m.role === 'manager')).length
    return {
      total: rows.length,
      withMemberships,
      managers
    }
  }, [directoryQuery.data])

  const invalidateDirectory = async () => {
    await queryClient.invalidateQueries({ queryKey: ['safety-people-directory'] })
    await queryClient.invalidateQueries({ queryKey: ['safety-project-members'] })
    await queryClient.invalidateQueries({ queryKey: ['safety-active-profiles'] })
    await queryClient.invalidateQueries({ queryKey: ['safety-project-member-profiles'] })
  }

  const updateProfileMutation = useMutation({
    mutationFn: async ({
      profileId,
      fullName,
      jobTitle,
      phone
    }: {
      profileId: string
      fullName: string | null
      jobTitle: string | null
      phone: string | null
    }) => {
      await safetyApi.adminUpdateProfile({
        profileId,
        fullName,
        jobTitle,
        phone
      })
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Profile updated.' })
      await invalidateDirectory()
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const setProfileActiveMutation = useMutation({
    mutationFn: async ({ profileId, isActive }: { profileId: string; isActive: boolean }) => {
      await safetyApi.adminSetProfileActive(profileId, isActive)
    },
    onSuccess: async (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.isActive ? 'Profile reactivated.' : 'Profile deactivated.'
      })
      await invalidateDirectory()
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: SafetyProjectMemberRole }) => {
      await safetyApi.updateProjectMemberRole(memberId, role)
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Member role updated.' })
      await invalidateDirectory()
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => safetyApi.removeProjectMember(memberId),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Member removed from project.' })
      await invalidateDirectory()
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const addMemberMutation = useMutation({
    mutationFn: async ({
      profileId,
      projectName,
      role
    }: {
      profileId: string
      projectName: string
      role: SafetyProjectMemberRole
    }) => {
      return safetyApi.addProjectMemberAndSendInvite({ projectName, profileId, role })
    },
    onSuccess: async (result) => {
      if (result.email_error) {
        setFeedback({
          type: 'error',
          message: `Member added, but invitation email failed: ${result.email_error}`
        })
      } else if (result.email_sent) {
        setFeedback({ type: 'success', message: 'Project membership added. Invitation email sent.' })
      } else if (result.invitation_queued) {
        setFeedback({ type: 'success', message: 'Project membership added. Invitation email queued.' })
      } else {
        setFeedback({ type: 'success', message: 'Project membership added or updated.' })
      }
      await invalidateDirectory()
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  async function handleRemoveMembership(membership: SafetyProfileMembership, profileLabel: string) {
    let unsignedCount = 0
    try {
      unsignedCount = await safetyApi.countUnsignedAssignmentsForMember(membership.member_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check pending assignments.'
      setFeedback({ type: 'error', message })
      return
    }

    const pendingNote = unsignedCount > 0
      ? `\n\n${profileLabel} has ${unsignedCount} unsigned SWMS assignment${unsignedCount === 1 ? '' : 's'} on ${membership.project_name}. They will lose project access for new schedules, but can still open and sign those assignments until completed.`
      : ''

    const confirmed = window.confirm(
      `Remove ${profileLabel} from ${membership.project_name}? They will lose project access for new schedules.${pendingNote}\n\nAssignment history is kept.`
    )
    if (!confirmed) return
    removeMemberMutation.mutate(membership.member_id)
  }

  function handleToggleExpand(profileId: string) {
    setExpandedProfileId((current) => (current === profileId ? null : profileId))
  }

  if (isChecking) {
    return (
      <SafetyLayout title="People" subtitle="View all Safety profiles and manage project memberships.">
        <section className="safety-card">
          <p className="safety-muted">Checking permissions…</p>
        </section>
      </SafetyLayout>
    )
  }

  if (isDenied) {
    return (
      <SafetyLayout title="People" subtitle="View all Safety profiles and manage project memberships.">
        <SafetyAdminAccessDenied />
      </SafetyLayout>
    )
  }

  return (
    <SafetyLayout
      title="People"
      subtitle="View all Safety profiles and manage project memberships."
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to="/safety">
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back to Safety Hub
        </Link>
      )}
    >
      <section className="safety-card safety-stats-row">
        <div className="safety-kpi-card">
          <span className="safety-muted">Profiles</span>
          <strong>{counters.total}</strong>
        </div>
        <div className="safety-kpi-card">
          <span className="safety-muted">With memberships</span>
          <strong>{counters.withMemberships}</strong>
        </div>
        <div className="safety-kpi-card">
          <span className="safety-muted">Managers (any project)</span>
          <strong>{counters.managers}</strong>
        </div>
      </section>

      <section className="safety-card">
        <div className="safety-toolbar safety-people-toolbar">
          <input
            className="safety-input safety-people-toolbar-search"
            placeholder="Search by name, email, phone, or job title…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
          />
          <div className="safety-people-toolbar-project-filter">
            <PeopleProjectSelect
              id="safety-people-toolbar-project-filter"
              className="safety-people-toolbar-project-combobox"
              ariaLabel="Filter by project"
              options={projectOptions}
              value={projectFilter}
              placeholder="All projects — search to filter…"
              disabled={projectsQuery.isLoading}
              onChange={setProjectFilter}
            />
            {projectFilter.trim() ? (
              <Link
                className="safety-btn-secondary safety-project-action-btn safety-people-manage-members-btn"
                to={`/safety/projects/${encodeURIComponent(projectFilter)}/members`}
              >
                <span className="material-icons" aria-hidden>group</span>
                Manage members
              </Link>
            ) : null}
          </div>
          <label className="safety-people-filter-check">
            <input
              type="checkbox"
              checked={managersOnly}
              onChange={(event) => setManagersOnly(event.target.checked)}
            />
            Managers only
          </label>
          <label className="safety-people-filter-check">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
            />
            Include inactive profiles
          </label>
        </div>

        <p className="safety-muted safety-inline-help">
          Expand a row to edit profile details and project memberships. Promote onsite leads to Manager so they can create new schedules.
        </p>

        {feedback ? (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            className={`safety-alert safety-alert--reveal safety-alert--${feedback.type === 'success' ? 'success' : 'error'}`}
          >
            <p>{feedback.message}</p>
          </div>
        ) : null}

        {directoryQuery.isLoading ? (
          <p className="safety-muted">Loading people directory…</p>
        ) : directoryQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{directoryQuery.error instanceof Error ? directoryQuery.error.message : 'Could not load people directory.'}</p>
          </div>
        ) : (directoryQuery.data ?? []).length === 0 ? (
          <div className="safety-empty-block">
            <p className="safety-muted">No profiles match your current filters.</p>
          </div>
        ) : (
          <PeopleDirectoryTable
            rows={directoryQuery.data ?? []}
            expandedProfileId={expandedProfileId}
            projects={projects}
            savingProfileId={updateProfileMutation.isPending ? updateProfileMutation.variables?.profileId ?? null : null}
            updatingProfileActiveId={setProfileActiveMutation.isPending ? setProfileActiveMutation.variables?.profileId ?? null : null}
            isUpdatingRole={updateRoleMutation.isPending}
            removingMemberId={removeMemberMutation.isPending ? removeMemberMutation.variables ?? null : null}
            isAdding={addMemberMutation.isPending}
            onToggleExpand={handleToggleExpand}
            onSaveProfile={(profileId, payload) => {
              updateProfileMutation.mutate({
                profileId,
                fullName: payload.fullName,
                jobTitle: payload.jobTitle,
                phone: payload.phone
              })
            }}
            onSetProfileActive={(profileId, isActive) => {
              setProfileActiveMutation.mutate({ profileId, isActive })
            }}
            onRoleChange={(memberId, role) => {
              updateRoleMutation.mutate({ memberId, role })
            }}
            onRemove={handleRemoveMembership}
            onAddToProject={(profileId, projectName, role) => {
              addMemberMutation.mutate({ profileId, projectName, role })
            }}
          />
        )}
      </section>
    </SafetyLayout>
  )
}
