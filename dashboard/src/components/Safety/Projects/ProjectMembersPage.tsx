import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import type { SafetyActiveProfile, SafetyProjectMember, SafetyProjectMemberRole } from '../../../types/safety'
import ProjectMembersTable from './ProjectMembersTable'
import { safetyProjectsPath } from '../utils/safetyProjectsPath'
import ProjectMembersAddPanel from './ProjectMembersAddPanel'
import SafetyManagerAccessGate from '../SafetyManagerAccessGate'

export default function ProjectMembersPage() {
  const { projectName: projectNameParam } = useParams<{ projectName: string }>()
  const projectName = decodeURIComponent(projectNameParam ?? '').trim()
  const queryClient = useQueryClient()

  const [memberSearch, setMemberSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | SafetyProjectMemberRole>('all')
  const [profileSearch, setProfileSearch] = useState('')
  const [profileJobTitle, setProfileJobTitle] = useState('')
  const [addRole, setAddRole] = useState<SafetyProjectMemberRole>('worker')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  useDocumentTitle(`Project Members - ${projectName || 'Safety'} - Cladding Creations`)

  useEffect(() => {
    if (!feedback) return
    const node = feedbackRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.requestAnimationFrame(() => {
      node.focus({ preventScroll: true })
    })
  }, [feedback])

  const membersQuery = useQuery({
    queryKey: ['safety-project-members', projectName],
    queryFn: () => safetyApi.listProjectMembers(projectName),
    enabled: Boolean(projectName)
  })

  const profilesQuery = useQuery({
    queryKey: ['safety-project-member-profiles', projectName, profileSearch, profileJobTitle],
    queryFn: () => safetyApi.listActiveProfiles({
      projectName,
      search: profileSearch,
      jobTitle: profileJobTitle,
      limit: 300
    }),
    enabled: Boolean(projectName)
  })

  const memberProfileIds = useMemo(
    () => new Set((membersQuery.data ?? []).map((member) => member.profile_id)),
    [membersQuery.data]
  )

  const filteredMembers = useMemo(() => {
    const rows = membersQuery.data ?? []
    const query = memberSearch.trim().toLowerCase()
    return rows.filter((member) => {
      if (roleFilter !== 'all' && member.role !== roleFilter) return false
      if (!query) return true
      const name = (member.full_name ?? '').toLowerCase()
      const email = (member.email ?? '').toLowerCase()
      const job = (member.job_title ?? '').toLowerCase()
      return name.includes(query) || email.includes(query) || job.includes(query)
    })
  }, [membersQuery.data, memberSearch, roleFilter])

  const counters = useMemo(() => {
    const rows = membersQuery.data ?? []
    return {
      total: rows.length,
      managers: rows.filter((member) => member.role === 'manager' && member.is_active).length,
      workers: rows.filter((member) => member.role === 'worker' && member.is_active).length
    }
  }, [membersQuery.data])

  const invalidateMemberQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['safety-project-members', projectName] })
    await queryClient.invalidateQueries({ queryKey: ['safety-project-member-profiles', projectName] })
  }

  const addMemberMutation = useMutation({
    mutationFn: async (payload: {
      profileId?: string
      email?: string
      fullName?: string | null
      role?: SafetyProjectMemberRole
    }) => {
      return safetyApi.addProjectMemberAndSendInvite({
        projectName,
        profileId: payload.profileId,
        email: payload.email,
        fullName: payload.fullName ?? undefined,
        role: payload.role ?? addRole
      })
    },
    onSuccess: async (result) => {
      if (result.email_error) {
        setFeedback({
          type: 'error',
          message: `Member added, but invitation email failed: ${result.email_error}`
        })
      } else if (result.email_sent) {
        setFeedback({ type: 'success', message: 'Project member added. Invitation email sent.' })
      } else if (result.invitation_queued) {
        setFeedback({ type: 'success', message: 'Project member added. Invitation email queued.' })
      } else {
        setFeedback({ type: 'success', message: 'Project member added or updated.' })
      }
      await invalidateMemberQueries()
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const isAddingByEmail = addMemberMutation.isPending && Boolean(addMemberMutation.variables?.email)

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: SafetyProjectMemberRole }) => {
      await safetyApi.updateProjectMemberRole(memberId, role)
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Member role updated.' })
      await queryClient.invalidateQueries({ queryKey: ['safety-project-members', projectName] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => safetyApi.removeProjectMember(memberId),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Member removed from project.' })
      await invalidateMemberQueries()
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const handleAddProfile = async (profile: SafetyActiveProfile) => {
    await addMemberMutation.mutateAsync({ profileId: profile.profile_id, role: addRole })
  }

  const handleAddProfiles = async (profiles: SafetyActiveProfile[]) => {
    for (const profile of profiles) {
      await addMemberMutation.mutateAsync({ profileId: profile.profile_id, role: addRole })
    }
  }

  const handleAddByEmail = async (email: string, displayName?: string | null) => {
    await addMemberMutation.mutateAsync({
      email,
      fullName: displayName ?? undefined,
      role: addRole
    })
  }

  const handleRemoveMember = async (member: SafetyProjectMember) => {
    const label = member.full_name?.trim() || member.email?.trim() || 'this member'
    let unsignedCount = 0

    try {
      unsignedCount = await safetyApi.countUnsignedAssignmentsForMember(member.member_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check pending assignments.'
      setFeedback({ type: 'error', message })
      return
    }

    const pendingNote = unsignedCount > 0
      ? `\n\n${label} has ${unsignedCount} unsigned SWMS assignment${unsignedCount === 1 ? '' : 's'} on this project. They will lose project access for new schedules, but can still open and sign those assignments until completed.`
      : ''

    const confirmed = window.confirm(
      `Remove ${label} from ${projectName}? They will lose project access for new schedules.${pendingNote}\n\nAssignment history is kept.`
    )
    if (!confirmed) return
    removeMemberMutation.mutate(member.member_id)
  }

  if (!projectName) {
    return (
      <SafetyLayout title="Project members" subtitle="No project selected.">
        <section className="safety-card">
          <p className="safety-muted">Missing project name in the URL.</p>
          <Link className="safety-btn-secondary" to={safetyProjectsPath(projectName)}>Back to projects</Link>
        </section>
      </SafetyLayout>
    )
  }

  return (
    <SafetyLayout
      title="Project members"
      subtitle={`Manage members and roles for ${projectName}.`}
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to={safetyProjectsPath(projectName)}>
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back to projects
        </Link>
      )}
    >
      <SafetyManagerAccessGate
        projectName={projectName}
        backToProjectsPath={safetyProjectsPath(projectName)}
        featureDescription="manage project members and invitations"
        loadingMessage="Checking member management permissions…"
      >
      <section className="safety-card safety-stats-row">
        <div className="safety-kpi-card">
          <span className="safety-muted">Total members</span>
          <strong>{counters.total}</strong>
        </div>
        <div className="safety-kpi-card">
          <span className="safety-muted">Managers</span>
          <strong>{counters.managers}</strong>
        </div>
        <div className="safety-kpi-card">
          <span className="safety-muted">Workers</span>
          <strong>{counters.workers}</strong>
        </div>
      </section>

      <section className="safety-card">
        <div className="safety-detail-header">
          <div className="safety-detail-meta">
            <h3 className="safety-card-title">{projectName}</h3>
          </div>
        </div>

        <div className="safety-toolbar">
          <input
            className="safety-input"
            placeholder="Search by name, email, or job title…"
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            autoComplete="off"
          />
          <select
            className="safety-input"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'all' | SafetyProjectMemberRole)}
          >
            <option value="all">All roles</option>
            <option value="manager">Managers</option>
            <option value="worker">Workers</option>
          </select>
        </div>
        <p className="safety-muted safety-inline-help">
          Tip: managers can create schedules and manage members. Workers receive SWMS assignments only.
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

        {membersQuery.isLoading ? (
          <p className="safety-muted">Loading project members…</p>
        ) : membersQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{membersQuery.error instanceof Error ? membersQuery.error.message : 'Could not load members.'}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="safety-empty-block">
            <p className="safety-muted">
              {(membersQuery.data ?? []).length === 0
                ? 'No members yet. Add someone in the section below.'
                : 'No members match your current filters.'}
            </p>
          </div>
        ) : (
          <ProjectMembersTable
            rows={filteredMembers}
            isUpdatingRole={updateRoleMutation.isPending}
            removingMemberId={removeMemberMutation.isPending ? removeMemberMutation.variables ?? null : null}
            onRoleChange={(memberId, role) => {
              updateRoleMutation.mutate({ memberId, role })
            }}
            onRemove={handleRemoveMember}
          />
        )}
      </section>

      <section className="safety-card">
        <ProjectMembersAddPanel
          projectName={projectName}
          profiles={profilesQuery.data ?? []}
          isLoadingProfiles={profilesQuery.isLoading}
          profileSearch={profileSearch}
          profileJobTitle={profileJobTitle}
          memberProfileIds={memberProfileIds}
          addRole={addRole}
          isAdding={addMemberMutation.isPending}
          isAddingByEmail={isAddingByEmail}
          onProfileSearchChange={setProfileSearch}
          onProfileJobTitleChange={setProfileJobTitle}
          onAddRoleChange={setAddRole}
          onAddProfile={handleAddProfile}
          onAddProfiles={handleAddProfiles}
          onAddByEmail={handleAddByEmail}
        />
      </section>
      </SafetyManagerAccessGate>
    </SafetyLayout>
  )
}
