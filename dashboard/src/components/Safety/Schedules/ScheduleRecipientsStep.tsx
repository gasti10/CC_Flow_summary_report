import { useEffect, useMemo, useRef, useState } from 'react'
import { useMatchMedia } from '../../../hooks/useMatchMedia'
import type { SafetyActiveProfile, SafetyScheduleRecipientInput } from '../../../types/safety'
import { formatSafetyEnumLabel, isActiveProfileSelected } from './scheduleRecipientFromProfile'

export type RecipientListFilter = 'all' | 'project_workers' | 'selected_in_list'
type RecipientsMobileTab = 'workers' | 'selected' | 'invite'

interface ScheduleRecipientsStepProps {
  projectName: string
  selectedRecipients: SafetyScheduleRecipientInput[]
  profiles: SafetyActiveProfile[]
  isLoadingProfiles: boolean
  profileSearch: string
  profileJobTitle: string
  shouldAutoFocusSearch: boolean
  initialListFilter?: RecipientListFilter
  showGeneratedFlowHint?: boolean
  protectedRecipientKey?: string
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
  primaryActionLabel?: string
  primaryActionPendingLabel?: string
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
  initialListFilter = 'all',
  showGeneratedFlowHint = false,
  protectedRecipientKey,
  onProfileSearchChange,
  onProfileJobTitleChange,
  onToggleProfile,
  onSelectVisibleProfiles,
  onClearRecipients,
  onRemoveRecipient,
  onAddRecipientByEmail,
  onBackToDetails,
  onCreateSchedule,
  isCreatingSchedule = false,
  primaryActionLabel = 'Create schedule',
  primaryActionPendingLabel = 'Creating...'
}: ScheduleRecipientsStepProps) {
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [listFilter, setListFilter] = useState<RecipientListFilter>(initialListFilter)
  const [mobileTab, setMobileTab] = useState<RecipientsMobileTab>('workers')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const inviteEmailInputRef = useRef<HTMLInputElement | null>(null)
  const inviteBlockRef = useRef<HTMLDivElement | null>(null)
  const isMobileLayout = useMatchMedia('(max-width: 768px)')
  const isFinePointer = useMatchMedia('(pointer: fine)')

  useEffect(() => {
    setListFilter(initialListFilter)
    setMobileTab('workers')
    setShowMobileSearch(false)
  }, [projectName, initialListFilter])

  useEffect(() => {
    if (!shouldAutoFocusSearch || !isFinePointer || isMobileLayout) return
    searchInputRef.current?.focus()
  }, [shouldAutoFocusSearch, isFinePointer, isMobileLayout])

  useEffect(() => {
    if (!showMobileSearch || !isMobileLayout) return
    searchInputRef.current?.focus()
  }, [showMobileSearch, isMobileLayout])

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

  const projectWorkers = useMemo(
    () => profiles.filter((profile) => profile.is_project_worker),
    [profiles]
  )

  const hasActiveFilters = useMemo(
    () => profileSearch.trim() !== '' || profileJobTitle.trim() !== '' || listFilter !== initialListFilter,
    [profileSearch, profileJobTitle, listFilter, initialListFilter]
  )

  function clearFilters() {
    onProfileSearchChange('')
    onProfileJobTitleChange('')
    setListFilter(initialListFilter)
    setShowMobileSearch(false)
  }

  function handleProfileSearchChange(value: string) {
    if (value.trim() !== '' && listFilter !== 'all') {
      setListFilter('all')
    }
    onProfileSearchChange(value)
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
    if (isMobileLayout) {
      setMobileTab('selected')
    }
  }

  function focusAddWorkerEmailInput() {
    if (isMobileLayout) {
      setMobileTab('invite')
      window.setTimeout(() => inviteEmailInputRef.current?.focus(), 120)
      return
    }
    inviteBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => inviteEmailInputRef.current?.focus(), 120)
  }

  function renderSelectedChips(className = '') {
    if (selectedRecipientsView.length === 0) return null
    return (
      <div className={`safety-selected-recipient-chips${className ? ` ${className}` : ''}`} aria-label="Selected recipients">
        {selectedRecipientsView.map(({ key, label }) => (
          <span key={key} className={`safety-selected-recipient-chip${protectedRecipientKey === key ? ' is-protected' : ''}`}>
            <span className="safety-selected-recipient-chip-label">{label}</span>
            {protectedRecipientKey === key ? (
              <span className="safety-selected-recipient-chip-badge">You</span>
            ) : (
              <button
                type="button"
                className="safety-selected-recipient-chip-remove"
                onClick={() => onRemoveRecipient(key)}
                aria-label={`Remove ${label}`}
              >
                <span className="material-icons" aria-hidden>close</span>
              </button>
            )}
          </span>
        ))}
      </div>
    )
  }

  function openMobileSearch() {
    setShowMobileSearch(true)
  }

  function closeMobileSearch() {
    setShowMobileSearch(false)
  }

  function renderDesktopProfileFilters() {
    return (
      <>
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
              onChange={(e) => handleProfileSearchChange(e.target.value)}
              autoComplete="off"
              inputMode="search"
              enterKeyHint="search"
            />
          </div>
          <div className="safety-recipient-filter-job-title">
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
                  Project workers ({projectWorkers.length})
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
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="safety-filter-chip safety-recipient-clear-filters-btn safety-recipient-clear-filters-btn--chip-row"
                  onClick={clearFilters}
                  title="Clear search, job title text and reset list filters."
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="safety-recipient-controls-seg safety-recipient-controls-seg--actions">
            <span className="safety-recipient-controls-label safety-recipient-controls-label--centered">Actions</span>
            <div className="safety-recipients-actions-row">
              <button
                type="button"
                className="safety-filter-chip"
                onClick={() => onSelectVisibleProfiles(filteredProfiles)}
                disabled={filteredProfiles.length === 0}
                title="Adds everyone currently shown in the list below (after filters and search)."
              >
                Add all ({filteredProfiles.length})
              </button>
              <button
                type="button"
                className="safety-filter-chip"
                onClick={focusAddWorkerEmailInput}
                title="Go to Add new worker by email and focus the email field."
              >
                Add new worker
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  function renderMobileWorkersToolbar() {
    if (showMobileSearch) {
      return (
        <div className="safety-recipients-mobile-search-bar">
          <label className="safety-recipients-mobile-search-field" htmlFor="safety-profile-search">
            <span className="material-icons safety-recipients-mobile-search-icon" aria-hidden>search</span>
            <input
              id="safety-profile-search"
              ref={searchInputRef}
              className="safety-input safety-recipients-mobile-search-input"
              value={profileSearch}
              placeholder="Name or email…"
              onChange={(e) => handleProfileSearchChange(e.target.value)}
              autoComplete="off"
              inputMode="search"
              enterKeyHint="search"
            />
          </label>
          <div className="safety-recipients-mobile-search-actions">
            {profileSearch.trim() ? (
              <button
                type="button"
                className="safety-filter-chip"
                onClick={() => onProfileSearchChange('')}
              >
                Clear
              </button>
            ) : null}
            <button
              type="button"
              className="safety-filter-chip safety-recipients-mobile-search-close"
              onClick={closeMobileSearch}
              aria-label="Close search"
            >
              <span className="material-icons" aria-hidden>close</span>
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="safety-recipients-mobile-toolbar">
        <div
          className="safety-recipient-chip-tabs safety-recipient-chip-tabs--mobile-inline"
          role="tablist"
          aria-label="Worker list filters"
        >
          <button
            type="button"
            className={`safety-filter-chip${listFilter === 'all' ? ' is-active' : ''}`}
            onClick={() => setListFilter('all')}
          >
            All ({profiles.length})
          </button>
          <button
            type="button"
            className={`safety-filter-chip${listFilter === 'project_workers' ? ' is-active' : ''}`}
            onClick={() => setListFilter('project_workers')}
          >
            Project workers ({projectWorkers.length})
          </button>
        </div>
        <button
          type="button"
          className={`safety-filter-chip safety-recipients-mobile-search-open${profileSearch.trim() ? ' is-active' : ''}`}
          onClick={openMobileSearch}
          aria-expanded={false}
          aria-controls="safety-profile-search"
        >
          <span className="material-icons" aria-hidden>search</span>
          Search
        </button>
      </div>
    )
  }

  function renderProfileList(touchFriendly = false) {
    return (
      <div className={`safety-workers-list safety-workers-list--profiles${touchFriendly ? ' safety-workers-list--touch' : ''}`}>
        {isLoadingProfiles ? (
          <p className="safety-muted">Loading profiles…</p>
        ) : filteredProfiles.length === 0 ? (
          <p className="safety-muted">No profiles match the filters.</p>
        ) : (
          filteredProfiles.map((profile) => {
            const isSelected = isActiveProfileSelected(profile, selectedRecipients)
            const displayName = profile.full_name?.trim() || '—'
            const rowClass = `safety-worker-item safety-profile-row${isSelected ? ' is-selected' : ''}${touchFriendly ? ' safety-profile-row--touch' : ''}`

            if (touchFriendly) {
              return (
                <button
                  key={profile.profile_id}
                  type="button"
                  className={rowClass}
                  onClick={() => onToggleProfile(profile)}
                  aria-pressed={isSelected}
                >
                  <span className={`safety-profile-row-check material-icons${isSelected ? ' is-checked' : ''}`} aria-hidden>
                    {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="safety-profile-row-body">
                    <span className="safety-profile-row-identity">
                      <span className="safety-profile-row-name">{displayName}</span>
                      {profile.job_title?.trim() ? (
                        <span className="safety-profile-row-job">{profile.job_title.trim()}</span>
                      ) : null}
                    </span>
                    <span className="safety-profile-row-meta">
                      {profile.is_project_worker ? (
                        <span className="safety-status-pill safety-status-pill--signed">Project worker</span>
                      ) : (
                        <span className="safety-status-pill safety-status-pill--pending">Non member</span>
                      )}
                    </span>
                  </span>
                </button>
              )
            }

            return (
              <label key={profile.profile_id} className={rowClass}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleProfile(profile)}
                />
                <span className="safety-profile-row-body">
                  <span
                    className="safety-profile-row-identity"
                    title={`${displayName} · ${profile.job_title?.trim() || '—'} · ${profile.email || '—'}`}
                  >
                    <span className="safety-profile-row-name">{displayName}</span>
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
    )
  }

  function renderWorkersQuickAction() {
    if ((!isMobileLayout && !showGeneratedFlowHint) || projectWorkers.length === 0) return null
    return (
      <div className="safety-recipients-mobile-quick-action">
        {showGeneratedFlowHint ? (
          <p className="safety-recipients-mobile-hint">
            Workers linked to this project — tap to add everyone on site today. You are included automatically so you can sign too.
          </p>
        ) : null}
        <button
          type="button"
          className="safety-btn-primary safety-recipients-add-project-workers-btn"
          onClick={() => onSelectVisibleProfiles(projectWorkers)}
          disabled={projectWorkers.length === 0 || isLoadingProfiles}
        >
          Add all project workers ({projectWorkers.length})
        </button>
      </div>
    )
  }

  function renderSelectedRecipientsPanel(options?: { showStepActions?: boolean }) {
    return (
      <div className="safety-form-section safety-recipients-selected-panel">
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
                          {protectedRecipientKey === key ? (
                            <>
                              {' · '}
                              <span className="safety-status-pill safety-status-pill--available">You · must sign</span>
                            </>
                          ) : (
                            <>
                              {' · '}
                              <span className={`safety-status-pill safety-status-pill--${recipient.membership_state === 'project_member' ? 'signed' : 'pending'}`}>
                                {formatSafetyEnumLabel(recipient.membership_state ?? 'non_member')}
                              </span>
                              {' '}
                              <span className={`safety-status-pill safety-status-pill--${recipient.invitation_status === 'signed' ? 'signed' : recipient.invitation_status === 'failed' ? 'overdue' : 'pending'}`}>
                                {formatSafetyEnumLabel(recipient.invitation_status ?? 'requested')}
                              </span>
                            </>
                          )}
                        </span>
                        {protectedRecipientKey === key ? null : (
                          <button
                            type="button"
                            className="safety-selected-recipient-remove"
                            onClick={() => onRemoveRecipient(key)}
                            aria-label="Remove recipient from selection"
                            title="Remove from selection"
                          >
                            <span className="material-icons" aria-hidden>delete_forever</span>
                          </button>
                        )}
                      </div>
                    ))
          )}
        </div>

        {options?.showStepActions && onCreateSchedule ? (
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
              {isCreatingSchedule ? primaryActionPendingLabel : primaryActionLabel}
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  function renderInviteEmailPanel() {
    return (
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
          <p className="safety-muted safety-invite-email-lead">
            Invite someone who is not in the list yet. They will receive the SWMS by email.
          </p>
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
            enterKeyHint="done"
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
            className="safety-btn-primary safety-invite-email-submit"
            onClick={() => { submitInviteEmail() }}
          >
            Add new worker by email
          </button>
        </div>
      </div>
    )
  }

  function renderMobileTabs() {
    return (
      <div
        className="safety-recipient-chip-tabs safety-recipients-mobile-tabs"
        role="tablist"
        aria-label="Recipient selection views"
      >
        <button
          type="button"
          role="tab"
          id="safety-recipients-tab-workers"
          className={`safety-filter-chip safety-recipients-mobile-tab${mobileTab === 'workers' ? ' is-active' : ''}`}
          aria-selected={mobileTab === 'workers'}
          aria-controls="safety-recipients-panel-workers"
          onClick={() => setMobileTab('workers')}
        >
          Workers
        </button>
        <button
          type="button"
          role="tab"
          id="safety-recipients-tab-selected"
          className={`safety-filter-chip safety-recipients-mobile-tab${mobileTab === 'selected' ? ' is-active' : ''}`}
          aria-selected={mobileTab === 'selected'}
          aria-controls="safety-recipients-panel-selected"
          onClick={() => setMobileTab('selected')}
        >
          Selected ({selectedRecipients.length})
        </button>
        <button
          type="button"
          role="tab"
          id="safety-recipients-tab-invite"
          className={`safety-filter-chip safety-recipients-mobile-tab${mobileTab === 'invite' ? ' is-active' : ''}`}
          aria-selected={mobileTab === 'invite'}
          aria-controls="safety-recipients-panel-invite"
          onClick={() => setMobileTab('invite')}
        >
          Invite
        </button>
      </div>
    )
  }

  function renderMobileWorkersPanel() {
    return (
      <div
        id="safety-recipients-panel-workers"
        role="tabpanel"
        aria-labelledby="safety-recipients-tab-workers"
        className={`safety-recipients-mobile-panel${showMobileSearch ? ' is-search-mode' : ''}`}
      >
        {!showMobileSearch ? renderWorkersQuickAction() : null}
        {renderMobileWorkersToolbar()}
        {!showMobileSearch ? (
          <div className="safety-recipients-mobile-actions">
            <button
              type="button"
              className="safety-filter-chip safety-recipients-mobile-add-all"
              onClick={() => onSelectVisibleProfiles(filteredProfiles)}
              disabled={filteredProfiles.length === 0}
            >
              Add all shown ({filteredProfiles.length})
            </button>
          </div>
        ) : null}
        {renderProfileList(true)}
        {!showMobileSearch ? (
          <p className="safety-recipients-legend">
            <span className="material-icons" aria-hidden>info</span>
            <span>
              Tap a worker to select or deselect. Use <strong>Invite</strong> to add someone by email.
            </span>
          </p>
        ) : null}
      </div>
    )
  }

  function renderMobileStepActions() {
    if (!onCreateSchedule) return null
    return (
      <div className="safety-recipients-mobile-step-actions">
        {onBackToDetails ? (
          <button type="button" className="safety-btn-secondary" onClick={onBackToDetails}>
            Back to details
          </button>
        ) : null}
        <button
          type="button"
          className="safety-btn-primary"
          disabled={isCreatingSchedule || selectedRecipients.length === 0}
          onClick={onCreateSchedule}
        >
          {isCreatingSchedule ? primaryActionPendingLabel : primaryActionLabel}
        </button>
      </div>
    )
  }

  function renderMobileLayout() {
    return (
      <div className="safety-recipients-layout safety-recipients-layout--mobile">
        {renderMobileTabs()}
        {renderSelectedChips()}
        {mobileTab === 'workers' ? renderMobileWorkersPanel() : null}
        {mobileTab === 'selected' ? (
          <div
            id="safety-recipients-panel-selected"
            role="tabpanel"
            aria-labelledby="safety-recipients-tab-selected"
            className="safety-recipients-mobile-panel"
          >
            {renderSelectedRecipientsPanel()}
          </div>
        ) : null}
        {mobileTab === 'invite' ? (
          <div
            id="safety-recipients-panel-invite"
            role="tabpanel"
            aria-labelledby="safety-recipients-tab-invite"
            className="safety-recipients-mobile-panel"
          >
            {renderInviteEmailPanel()}
          </div>
        ) : null}
        {renderMobileStepActions()}
      </div>
    )
  }

  function renderDesktopLayout() {
    return (
      <div className="safety-recipients-layout">
        {renderSelectedChips('safety-selected-recipient-chips--desktop')}
        <div className="safety-recipients-main">
          {renderWorkersQuickAction()}
          {renderDesktopProfileFilters()}
          {renderProfileList()}
          <p className="safety-recipients-legend">
            <span className="material-icons" aria-hidden>info</span>
            <span>
              <strong>Non member</strong>: worker exists but is not linked to this project yet.
            </span>
          </p>
        </div>

        <aside className="safety-recipients-side">
          {renderSelectedRecipientsPanel({ showStepActions: Boolean(onCreateSchedule) })}
          {renderInviteEmailPanel()}
        </aside>
      </div>
    )
  }

  return (
    <section className="safety-card safety-card--recipients-step">
      <div className="safety-form-stack safety-form-stack--recipients-step">
        <div className="safety-form-section safety-form-section--recipients-top">
          {!isMobileLayout ? (
            <div className="safety-workers-header">
              <div className="safety-workers-heading">
                <h3 className="safety-workers-title">Recipients</h3>
                <span className="safety-workers-count">{selectedRecipients.length} selected</span>
              </div>
            </div>
          ) : null}

          {!projectName ? (
            <p className="safety-muted">Select a project in Step 1 to load active profiles.</p>
          ) : isMobileLayout ? (
            renderMobileLayout()
          ) : (
            renderDesktopLayout()
          )}
        </div>
      </div>
    </section>
  )
}
