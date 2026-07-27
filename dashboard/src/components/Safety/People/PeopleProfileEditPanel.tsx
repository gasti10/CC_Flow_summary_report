import { useEffect, useMemo, useState } from 'react'
import type { SafetyPeopleDirectoryProfile } from '../../../types/safety'

interface PeopleProfileEditPanelProps {
  profile: SafetyPeopleDirectoryProfile
  isSaving: boolean
  isUpdatingActive: boolean
  onSave: (payload: {
    fullName: string | null
    jobTitle: string | null
    phone: string | null
  }) => void
  onSetActive: (isActive: boolean) => void
}

function fieldValue(value: string | null | undefined): string {
  return value ?? ''
}

export default function PeopleProfileEditPanel({
  profile,
  isSaving,
  isUpdatingActive,
  onSave,
  onSetActive
}: PeopleProfileEditPanelProps) {
  const [fullName, setFullName] = useState(fieldValue(profile.full_name))
  const [jobTitle, setJobTitle] = useState(fieldValue(profile.job_title))
  const [phone, setPhone] = useState(fieldValue(profile.phone))

  useEffect(() => {
    setFullName(fieldValue(profile.full_name))
    setJobTitle(fieldValue(profile.job_title))
    setPhone(fieldValue(profile.phone))
  }, [profile.profile_id, profile.full_name, profile.job_title, profile.phone])

  const isDirty = useMemo(() => {
    return fullName.trim() !== fieldValue(profile.full_name).trim()
      || jobTitle.trim() !== fieldValue(profile.job_title).trim()
      || phone.trim() !== fieldValue(profile.phone).trim()
  }, [fullName, jobTitle, phone, profile.full_name, profile.job_title, profile.phone])

  const isBusy = isSaving || isUpdatingActive
  const profileLabel = profile.full_name?.trim() || profile.email?.trim() || 'this profile'

  function handleSave() {
    if (!isDirty || isBusy) return
    onSave({
      fullName: fullName.trim() || null,
      jobTitle: jobTitle.trim() || null,
      phone: phone.trim() || null
    })
  }

  function handleToggleActive() {
    if (isBusy) return
    const nextActive = !profile.is_active
    const action = nextActive ? 'Reactivate' : 'Deactivate'
    const note = nextActive
      ? `${profileLabel} will appear in active profile lists again.`
      : `${profileLabel} will be hidden from active lists and cannot receive new schedules. Existing assignment history is kept.`
    const confirmed = window.confirm(`${action} ${profileLabel}?\n\n${note}`)
    if (!confirmed) return
    onSetActive(nextActive)
  }

  return (
    <section className="safety-people-profile-edit" aria-label="Edit profile details">
      <div className="safety-people-profile-edit-header">
        <h4 className="safety-people-profile-edit-title">Profile details</h4>
        <div className="safety-people-profile-edit-status">
          <span className={`safety-status-pill safety-status-pill--${profile.is_active ? 'active' : 'closed'}`}>
            {profile.is_active ? 'Active' : 'Inactive'}
          </span>
          <button
            type="button"
            className={profile.is_active ? 'safety-btn-secondary' : 'safety-btn-primary'}
            disabled={isBusy}
            onClick={handleToggleActive}
          >
            {isUpdatingActive
              ? 'Updating…'
              : profile.is_active
                ? 'Deactivate profile'
                : 'Reactivate profile'}
          </button>
        </div>
      </div>

      <div className="safety-people-profile-edit-grid">
        <label className="safety-people-profile-edit-field">
          <span className="safety-label">Name</span>
          <input
            className="safety-input"
            value={fullName}
            disabled={isBusy}
            autoComplete="name"
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        <label className="safety-people-profile-edit-field">
          <span className="safety-label">Email</span>
          <input
            className="safety-input"
            value={profile.email ?? ''}
            readOnly
            aria-readonly="true"
            title="Email cannot be edited here"
          />
        </label>
        <label className="safety-people-profile-edit-field">
          <span className="safety-label">Job title</span>
          <input
            className="safety-input"
            value={jobTitle}
            disabled={isBusy}
            autoComplete="organization-title"
            onChange={(event) => setJobTitle(event.target.value)}
          />
        </label>
        <label className="safety-people-profile-edit-field">
          <span className="safety-label">Phone</span>
          <input
            className="safety-input"
            value={phone}
            disabled={isBusy}
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
      </div>

      <div className="safety-people-profile-edit-actions">
        <button
          type="button"
          className="safety-btn-primary"
          disabled={!isDirty || isBusy}
          onClick={handleSave}
        >
          {isSaving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </section>
  )
}
