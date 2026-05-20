import { useEffect, useMemo, useRef, useState } from 'react'
import type { SafetyActiveProfile, SafetyScheduleRecipientInput } from '../../../types/safety'
import { formatSafetyEnumLabel, isActiveProfileSelected } from './scheduleRecipientFromProfile'

type RecipientListFilter = 'all' | 'project_workers' | 'selected_in_list'

interface ScheduleRecipientsStepProps {
  projectName: string
  selectedRecipients: SafetyScheduleRecipientInput[]
  profiles: SafetyActiveProfile[]
  isLoadingProfiles: boolean
  profileSearch: string
  profileJobTitle: string
  shouldAutoFocusSearch: boolean
  onProfileSearchChange: (value: string) => void
  onProfileJobTitleChange: (value: string) => void
  onToggleProfile: (profile: SafetyActiveProfile) => void
  onSelectVisibleProfiles: (profiles: SafetyActiveProfile[]) => void
  onClearRecipients: () => void
  onRemoveRecipient: (recipientKey: string) => void
  onAddRecipientByEmail: (email: string, displayName?: string | null) => void
  onBackToDetails?: () => void
  onCreateSchedule?: () => void
  isCreatingSchedule?: boolean
}

function recipientKey(recipient: SafetyScheduleRecipientInput): string {
  return recipient.recipient_user_id
    ? `user:${recipient.recipient_user_id}`
    : recipient.profile_id
      ? `profile:${recipient.profile_id}`
      : `email:${(recipient.recipient_email ?? '').trim().toLowerCase()}`
}

export default function ScheduleRecipientsStep({
  projectName,
  selectedRecipients,
  profiles,
  isLoadingProfiles,
  profileSearch,
  profileJobTitle,
  shouldAutoFocusSearch,
  onProfileSearchChange,
  onProfileJobTitleChange,
  onToggleProfile,
  onSelectVisibleProfiles,
  onClearRecipients,
  onRemoveRecipient,
  onAddRecipientByEmail,
  onBackToDetails,
  onCreateSchedule,
  isCreatingSchedule = false
}: ScheduleRecipientsStepProps) {
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [listFilter, setListFilter] = useState<RecipientListFilter>('all')
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const inviteEmailInputRef = useRef<HTMLInputElement | null>(null)
  const inviteBlockRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!shouldAutoFocusSearch) return
    searchInputRef.current?.focus()
  }, [shouldAutoFocusSearch])

  const selectedRecipientsView = useMemo(() => (
    selectedRecipients.map((recipient) => {
      const key = recipientKey(recipient)
      const label = recipient.recipient_full_name?.trim()
        || recipient.recipient_email?.trim()
        || recipient.recipient_user_id
        || recipient.profile_id
        || 'Recipient'
      return { key, label, recipient }
    })
  ), [selectedRecipients])

  const selectedRecipientKeys = useMemo(
    () => new Set(selectedRecipients.map((recipient) => recipientKey(recipient))),
    [selectedRecipients]
  )

  const filteredProfiles = useMemo(() => {
    if (listFilter === 'project_workers') {
      return profiles.filter((profile) => profile.is_project_worker)
    }
    if (listFilter === 'selected_in_list') {
      return profiles.filter((profile) => isActiveProfileSelected(profile, selectedRecipients))
    }
    return profiles
  }, [listFilter, profiles, selectedRecipients])

  const jobTitleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of profiles) {
      const j = p.job_title?.trim()
      if (!j) continue
      counts.set(j, (counts.get(j) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [profiles])

  const jobTitleMatchCount = useMemo(() => {
    const q = profileJobTitle.trim().toLowerCase()
    if (!q) return profiles.length
    return profiles.filter((profile) => (profile.job_title?.trim().toLowerCase() ?? '').includes(q)).length
  }, [profileJobTitle, profiles])

  const hasActiveFilters = useMemo(
    () => profileSearch.trim() !== '' || profileJobTitle.trim() !== '' || listFilter !== 'all',
    [profileSearch, profileJobTitle, listFilter]
  )

  function clearFilters() {
    onProfileSearchChange('')
    onProfileJobTitleChange('')
    setListFilter('all')
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
    onAddRecipientByEmail(email, inviteName.trim() || null)
    setInviteEmail('')
    setInviteName('')
  }

  function focusAddWorkerEmailInput() {
    inviteBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => inviteEmailInputRef.current?.focus(), 120)
  }

  return (
    <section className="safety-card">
      <div className="safety-form-stack safety-form-stack--recipients-step">
        <div className="safety-form-section safety-form-section--recipients-top">
          <div className="safety-workers-header">
            <div className="safety-workers-heading">
              <h3 className="safety-workers-title">Recipients</h3>
              <span className="safety-workers-count">{selectedRecipients.length} selected</span>
            </div>
          </div>

          {!projectName ? (
            <p className="safety-muted">Select a project in Step 1 to load active profiles.</p>
          ) : (
            <div className="safety-recipients-layout">
              <div className="safety-recipients-main">
              <div className="safety-recipient-filters">
                <div>
                  <label className="safety-label" htmlFor="safety-profile-search">
                    Search profiles
                    <span
                      className="material-icons safety-inline-tooltip"
                      aria-label="Search by worker name or email"
                      title="Search by worker name or email."
                    >
                      help_outline
                    </span>
                  </label>
                  <input
                    id="safety-profile-search"
                    ref={searchInputRef}
                    className="safety-input"
                    value={profileSearch}
                    placeholder="Name or email…"
                    onChange={(e) => onProfileSearchChange(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="safety-label" htmlFor="safety-profile-job-title">
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
                    id="safety-profile-job-title"
                    className="safety-input"
                    value={profileJobTitle}
                    placeholder="Type or pick a title…"
                    onChange={(e) => onProfileJobTitleChange(e.target.value)}
                    list="safety-job-title-datalist"
                    autoComplete="off"
                  />
                  <datalist id="safety-job-title-datalist">
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
                    <div className="safety-recipient-chip-tabs" role="tablist" aria-label="Recipient list filters">
                      <button
                        type="button"
                        className={`safety-filter-chip${listFilter === 'all' ? ' is-active' : ''}`}
                        onClick={() => setListFilter('all')}
                        title="Show all active profiles for this project."
                      >
                        All ({profiles.length})
                      </button>
                      <button
                        type="button"
                        className={`safety-filter-chip${listFilter === 'project_workers' ? ' is-active' : ''}`}
                        onClick={() => setListFilter('project_workers')}
                        title="Show only workers already linked to this project."
                      >
                        Project workers ({profiles.filter((profile) => profile.is_project_worker).length})
                      </button>
                      <button
                        type="button"
                        className={`safety-filter-chip${listFilter === 'selected_in_list' ? ' is-active' : ''}`}
                        onClick={() => setListFilter('selected_in_list')}
                        title="Show only profiles currently selected."
                      >
                        Selected in list ({profiles.filter((profile) => isActiveProfileSelected(profile, selectedRecipients)).length})
                      </button>
                    </div>
                    <button
                      type="button"
                      className="safety-btn-secondary safety-recipient-clear-filters-btn safety-recipient-clear-filters-btn--chip-row"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      title="Clear search, job title text and reset list filter to All."
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
                      onClick={() => onSelectVisibleProfiles(filteredProfiles)}
                      disabled={filteredProfiles.length === 0}
                      title="Adds everyone currently shown in the list below (after filters and search)."
                    >
                      Add all ({filteredProfiles.length})
                    </button>
                    <button
                      type="button"
                      className="safety-btn-secondary"
                      onClick={focusAddWorkerEmailInput}
                      title="Go to Add new worker by email and focus the email field."
                    >
                      Add new worker
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
                    const isSelected = isActiveProfileSelected(profile, selectedRecipients)
                    return (
                      <label key={profile.profile_id} className={`safety-worker-item safety-profile-row${isSelected ? ' is-selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleProfile(profile)}
                        />
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
                            {profile.is_project_worker ? (
                              <span className="safety-status-pill safety-status-pill--signed">Project worker</span>
                            ) : (
                              <span
                                className="safety-status-pill safety-status-pill--pending"
                                title="Non member means this worker is not currently linked to this project yet."
                              >
                                Non member
                              </span>
                            )}
                            {selectedRecipientKeys.has(`profile:${profile.profile_id}`) ? (
                              <span className="safety-status-pill safety-status-pill--available">Selected</span>
                            ) : null}
                          </span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>

              <p className="safety-recipients-legend">
                <span className="material-icons" aria-hidden>info</span>
                <span>
                  <strong>Non member</strong>: worker exists but is not linked to this project yet.
                </span>
              </p>
              </div>

            <aside className="safety-recipients-side">
              <div className="safety-form-section">
                <div className="safety-selected-recipients-head">
                  <label className="safety-label safety-selected-recipients-label">Selected recipients</label>
                  <button
                    type="button"
                    className="safety-btn-secondary safety-selected-recipients-clear"
                    onClick={onClearRecipients}
                    disabled={selectedRecipients.length === 0}
                    title="Remove every selected recipient from this schedule."
                  >
                    Clear recipients
                  </button>
                </div>
                <div className="safety-workers-list safety-selected-recipients-list">
                  {selectedRecipientsView.length === 0 ? (
                    <p className="safety-muted">No recipients selected yet.</p>
                  ) : (
                    selectedRecipientsView.map(({ key, label, recipient }) => (
                      <div key={key} className="safety-worker-item safety-selected-recipient-row">
                        <span className="safety-selected-recipient-main">
                          {label}
                          {' · '}
                          <span className={`safety-status-pill safety-status-pill--${recipient.membership_state === 'project_member' ? 'signed' : 'pending'}`}>
                            {formatSafetyEnumLabel(recipient.membership_state ?? 'non_member')}
                          </span>
                          {' '}
                          <span className={`safety-status-pill safety-status-pill--${recipient.invitation_status === 'signed' ? 'signed' : recipient.invitation_status === 'failed' ? 'overdue' : 'pending'}`}>
                            {formatSafetyEnumLabel(recipient.invitation_status ?? 'requested')}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="safety-selected-recipient-remove"
                          onClick={() => onRemoveRecipient(key)}
                          aria-label="Remove recipient from selection"
                          title="Remove from selection"
                        >
                          <span className="material-icons" aria-hidden>delete_forever</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {onCreateSchedule ? (
                  <div className="safety-recipients-step-actions">
                    {onBackToDetails ? (
                      <button type="button" className="safety-btn-secondary" onClick={onBackToDetails}>
                        Back to details
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="safety-btn-primary"
                      disabled={isCreatingSchedule}
                      onClick={onCreateSchedule}
                    >
                      {isCreatingSchedule ? 'Creating...' : 'Create schedule'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="safety-form-section">
                <div className="safety-invite-email-block" ref={inviteBlockRef}>
                  <h4 className="safety-invite-email-title">
                    Add new worker
                    <span
                      className="material-icons safety-inline-tooltip"
                      aria-label="Add a recipient by email even if they do not have an active profile"
                      title="Use this to invite a new worker by email."
                    >
                      help_outline
                    </span>
                  </h4>
                  <label className="safety-label" htmlFor="safety-invite-name">Display name (optional)</label>
                  <input
                    id="safety-invite-name"
                    className="safety-input"
                    value={inviteName}
                    placeholder="As shown to recipients"
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                  <label className="safety-label" htmlFor="safety-invite-email">Email</label>
                  <input
                    id="safety-invite-email"
                    ref={inviteEmailInputRef}
                    className="safety-input"
                    type="email"
                    value={inviteEmail}
                    placeholder="name@company.com"
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        submitInviteEmail()
                      }
                    }}
                  />
                  {inviteError ? <p className="safety-muted" role="alert">{inviteError}</p> : null}
                  <button
                    type="button"
                    className="safety-btn-secondary"
                    onClick={() => { submitInviteEmail() }}
                  >
                    Add new worker by email
                  </button>
                </div>
              </div>
            </aside>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
