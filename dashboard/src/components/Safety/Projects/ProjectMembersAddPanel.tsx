import { useEffect, useMemo, useRef, useState } from 'react'
import type { SafetyActiveProfile, SafetyProjectMemberRole } from '../../../types/safety'

type MemberListFilter = 'all' | 'not_in_project' | 'in_project'

interface ProjectMembersAddPanelProps {
  projectName: string
  profiles: SafetyActiveProfile[]
  isLoadingProfiles: boolean
  profileSearch: string
  profileJobTitle: string
  memberProfileIds: Set<string>
  addRole: SafetyProjectMemberRole
  isAdding: boolean
  onProfileSearchChange: (value: string) => void
  onProfileJobTitleChange: (value: string) => void
  onAddRoleChange: (role: SafetyProjectMemberRole) => void
  onAddProfile: (profile: SafetyActiveProfile) => void
  onAddProfiles: (profiles: SafetyActiveProfile[]) => void
  onAddByEmail: (email: string, displayName?: string | null) => void
}

export default function ProjectMembersAddPanel({
  projectName,
  profiles,
  isLoadingProfiles,
  profileSearch,
  profileJobTitle,
  memberProfileIds,
  addRole,
  isAdding,
  onProfileSearchChange,
  onProfileJobTitleChange,
  onAddRoleChange,
  onAddProfile,
  onAddProfiles,
  onAddByEmail
}: ProjectMembersAddPanelProps) {
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [listFilter, setListFilter] = useState<MemberListFilter>('not_in_project')
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const inviteEmailInputRef = useRef<HTMLInputElement | null>(null)
  const inviteBlockRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const notInProjectProfiles = useMemo(
    () => profiles.filter((profile) => !memberProfileIds.has(profile.profile_id)),
    [profiles, memberProfileIds]
  )

  const inProjectProfiles = useMemo(
    () => profiles.filter((profile) => memberProfileIds.has(profile.profile_id)),
    [profiles, memberProfileIds]
  )

  const filteredProfiles = useMemo(() => {
    if (listFilter === 'not_in_project') return notInProjectProfiles
    if (listFilter === 'in_project') return inProjectProfiles
    return profiles
  }, [listFilter, profiles, notInProjectProfiles, inProjectProfiles])

  const addableFilteredProfiles = useMemo(
    () => filteredProfiles.filter((profile) => !memberProfileIds.has(profile.profile_id)),
    [filteredProfiles, memberProfileIds]
  )

  const jobTitleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const profile of profiles) {
      const title = profile.job_title?.trim()
      if (!title) continue
      counts.set(title, (counts.get(title) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [profiles])

  const jobTitleMatchCount = useMemo(() => {
    const query = profileJobTitle.trim().toLowerCase()
    if (!query) return profiles.length
    return profiles.filter((profile) => (profile.job_title?.trim().toLowerCase() ?? '').includes(query)).length
  }, [profileJobTitle, profiles])

  const hasActiveFilters = useMemo(
    () => profileSearch.trim() !== '' || profileJobTitle.trim() !== '' || listFilter !== 'not_in_project',
    [profileSearch, profileJobTitle, listFilter]
  )

  function clearFilters() {
    onProfileSearchChange('')
    onProfileJobTitleChange('')
    setListFilter('not_in_project')
  }

  function submitInviteEmail() {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      setInviteError('Enter an email.')
      return
    }
    if (!email.includes('@')) {
      setInviteError('Invalid email.')
      return
    }
    setInviteError(null)
    onAddByEmail(email, inviteName.trim() || null)
    setInviteEmail('')
    setInviteName('')
  }

  function focusAddMemberEmailInput() {
    inviteBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => inviteEmailInputRef.current?.focus(), 120)
  }

  return (
    <div className="safety-form-stack safety-form-stack--recipients-step">
      <div className="safety-form-section safety-form-section--recipients-top">
        <div className="safety-workers-header">
          <div className="safety-workers-heading">
            <h3 className="safety-workers-title">Add member</h3>
            <span className="safety-workers-count">{notInProjectProfiles.length} available</span>
          </div>
        </div>

        {!projectName ? (
          <p className="safety-muted">Project name is required to load profiles.</p>
        ) : (
          <div className="safety-recipients-layout">
            <div className="safety-recipients-main">
              <div className="safety-recipient-filters">
                <div>
                  <label className="safety-label" htmlFor="safety-member-profile-search">
                    Search profiles
                    <span
                      className="material-icons safety-inline-tooltip"
                      aria-label="Search by name or email"
                      title="Search by name or email."
                    >
                      help_outline
                    </span>
                  </label>
                  <input
                    id="safety-member-profile-search"
                    ref={searchInputRef}
                    className="safety-input"
                    value={profileSearch}
                    placeholder="Name or email…"
                    onChange={(event) => onProfileSearchChange(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="safety-label" htmlFor="safety-member-profile-job-title">
                    Job title filter ({jobTitleMatchCount})
                    <span
                      className="material-icons safety-inline-tooltip"
                      aria-label="Optional filter by job title"
                      title="Optional: narrow profiles by job title."
                    >
                      help_outline
                    </span>
                  </label>
                  <input
                    id="safety-member-profile-job-title"
                    className="safety-input"
                    value={profileJobTitle}
                    placeholder="Type or pick a title…"
                    onChange={(event) => onProfileJobTitleChange(event.target.value)}
                    list="safety-member-job-title-datalist"
                    autoComplete="off"
                  />
                  <datalist id="safety-member-job-title-datalist">
                    {jobTitleOptions.map(({ title, count }) => (
                      <option key={title} value={title} label={`${title} (${count})`} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="safety-recipient-controls-row">
                <div className="safety-recipient-controls-seg safety-recipient-controls-seg--filters">
                  <span className="safety-recipient-controls-label safety-recipient-controls-label--centered">Filters</span>
                  <div className="safety-recipient-chip-row">
                    <div className="safety-recipient-chip-tabs" role="tablist" aria-label="Profile list filters">
                      <button
                        type="button"
                        className={`safety-filter-chip${listFilter === 'all' ? ' is-active' : ''}`}
                        onClick={() => setListFilter('all')}
                      >
                        All ({profiles.length})
                      </button>
                      <button
                        type="button"
                        className={`safety-filter-chip${listFilter === 'not_in_project' ? ' is-active' : ''}`}
                        onClick={() => setListFilter('not_in_project')}
                      >
                        Not in project ({notInProjectProfiles.length})
                      </button>
                      <button
                        type="button"
                        className={`safety-filter-chip${listFilter === 'in_project' ? ' is-active' : ''}`}
                        onClick={() => setListFilter('in_project')}
                      >
                        In project ({inProjectProfiles.length})
                      </button>
                    </div>
                    <button
                      type="button"
                      className="safety-btn-secondary safety-recipient-clear-filters-btn safety-recipient-clear-filters-btn--chip-row"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>

                <div className="safety-recipient-controls-seg safety-recipient-controls-seg--actions">
                  <span className="safety-recipient-controls-label safety-recipient-controls-label--centered">Actions</span>
                  <div className="safety-recipients-actions-row">
                    <button
                      type="button"
                      className="safety-btn-secondary"
                      onClick={() => onAddProfiles(addableFilteredProfiles)}
                      disabled={isAdding || addableFilteredProfiles.length === 0}
                    >
                      Add all ({addableFilteredProfiles.length})
                    </button>
                    <button
                      type="button"
                      className="safety-btn-secondary"
                      onClick={focusAddMemberEmailInput}
                    >
                      Add new member
                    </button>
                  </div>
                </div>
              </div>

              <div className="safety-workers-list safety-workers-list--profiles">
                {isLoadingProfiles ? (
                  <p className="safety-muted">Loading profiles…</p>
                ) : filteredProfiles.length === 0 ? (
                  <p className="safety-muted">No profiles match the filters.</p>
                ) : (
                  filteredProfiles.map((profile) => {
                    const isMember = memberProfileIds.has(profile.profile_id)
                    return (
                      <div
                        key={profile.profile_id}
                        className={`safety-worker-item safety-profile-row safety-profile-row--member-add${isMember ? ' is-selected' : ''}`}
                      >
                        {!isMember ? (
                          <button
                            type="button"
                            className="safety-btn-secondary safety-profile-row-add-btn"
                            disabled={isAdding}
                            onClick={() => onAddProfile(profile)}
                            title={`Add as ${addRole}`}
                          >
                            Add
                          </button>
                        ) : (
                          <span className="safety-profile-row-add-placeholder" aria-hidden>
                            <span className="material-icons">check</span>
                          </span>
                        )}
                        <span className="safety-profile-row-body">
                          <span
                            className="safety-profile-row-identity"
                            title={`${profile.full_name?.trim() || '—'} · ${profile.job_title?.trim() || '—'} · ${profile.email || '—'}`}
                          >
                            <span className="safety-profile-row-name">{profile.full_name?.trim() || '—'}</span>
                            {profile.job_title?.trim() ? (
                              <>
                                <span className="safety-profile-row-sep" aria-hidden>·</span>
                                <span className="safety-profile-row-job">{profile.job_title.trim()}</span>
                              </>
                            ) : null}
                            <span className="safety-profile-row-sep" aria-hidden>·</span>
                            <span className="safety-profile-row-email">{profile.email || '—'}</span>
                          </span>
                          <span className="safety-profile-row-meta">
                            {isMember ? (
                              <span className="safety-status-pill safety-status-pill--signed">Project member</span>
                            ) : profile.is_project_worker ? (
                              <span className="safety-status-pill safety-status-pill--pending">Project worker</span>
                            ) : (
                              <span className="safety-status-pill safety-status-pill--pending">Not in project</span>
                            )}
                          </span>
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <p className="safety-recipients-legend">
                <span className="material-icons" aria-hidden>info</span>
                <span>
                  Use <strong>Add all</strong> for the filtered list, or add individuals. New members use the role selected in the sidebar.
                </span>
              </p>
            </div>

            <aside className="safety-recipients-side">
              <div className="safety-form-section">
                <label className="safety-label" htmlFor="safety-member-add-role">
                  Role for new member
                  <span
                    className="material-icons safety-inline-tooltip"
                    aria-label="Role applied when adding from the list or by email"
                    title="Manager can manage schedules and members. Worker receives assignments."
                  >
                    help_outline
                  </span>
                </label>
                <select
                  id="safety-member-add-role"
                  className="safety-input"
                  value={addRole}
                  onChange={(event) => onAddRoleChange(event.target.value as SafetyProjectMemberRole)}
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                </select>
                <p className="safety-muted safety-member-role-help">
                  Adding as <strong>{addRole}</strong>. Change before using Add or email invite.
                </p>
              </div>

              <div className="safety-form-section">
                <div className="safety-invite-email-block" ref={inviteBlockRef}>
                  <h4 className="safety-invite-email-title">
                    Add new member
                    <span
                      className="material-icons safety-inline-tooltip"
                      aria-label="Add a member by email even if they do not have an active profile"
                      title="Use this to add a member by email."
                    >
                      help_outline
                    </span>
                  </h4>
                  <label className="safety-label" htmlFor="safety-member-invite-name">Display name (optional)</label>
                  <input
                    id="safety-member-invite-name"
                    className="safety-input"
                    value={inviteName}
                    placeholder="As shown to recipients"
                    onChange={(event) => setInviteName(event.target.value)}
                  />
                  <label className="safety-label" htmlFor="safety-member-invite-email">Email</label>
                  <input
                    id="safety-member-invite-email"
                    ref={inviteEmailInputRef}
                    className="safety-input"
                    type="email"
                    value={inviteEmail}
                    placeholder="name@company.com"
                    onChange={(event) => setInviteEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitInviteEmail()
                      }
                    }}
                  />
                  {inviteError ? <p className="safety-muted" role="alert">{inviteError}</p> : null}
                  <button
                    type="button"
                    className="safety-btn-secondary"
                    disabled={isAdding}
                    onClick={() => { submitInviteEmail() }}
                  >
                    Add new member by email
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
