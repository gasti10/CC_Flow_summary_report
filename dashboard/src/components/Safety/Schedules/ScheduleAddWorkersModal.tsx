import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { safetyApi } from '../../../services/safetyApi'
import type { SafetyActiveProfile, SafetyScheduleRecipientInput, SafetyScheduleWorkerRow } from '../../../types/safety'
import ScheduleRecipientsStep from './ScheduleRecipientsStep'
import { recipientFromActiveProfile } from './scheduleRecipientFromProfile'
import { scheduleRecipientKey, scheduleWorkerRecipientKey } from './scheduleWorkerRecipientKey'

interface ScheduleAddWorkersModalProps {
  projectName: string
  existingWorkers: SafetyScheduleWorkerRow[]
  isPending?: boolean
  onClose: () => void
  onConfirm: (recipients: SafetyScheduleRecipientInput[]) => Promise<void> | void
}

export default function ScheduleAddWorkersModal({
  projectName,
  existingWorkers,
  isPending = false,
  onClose,
  onConfirm
}: ScheduleAddWorkersModalProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<SafetyScheduleRecipientInput[]>([])
  const [profileSearch, setProfileSearch] = useState('')
  const [profileJobTitle, setProfileJobTitle] = useState('')

  const assignedKeys = useMemo(
    () => new Set(existingWorkers.map(scheduleWorkerRecipientKey)),
    [existingWorkers]
  )

  const profilesQuery = useQuery({
    queryKey: ['safety-active-profiles-add-workers', projectName, profileSearch, profileJobTitle],
    queryFn: () => safetyApi.listActiveProfiles({
      projectName,
      search: profileSearch,
      jobTitle: profileJobTitle
    }),
    enabled: projectName.trim().length > 0
  })

  const availableProfiles = useMemo(
    () => (profilesQuery.data ?? []).filter((profile) => {
      const recipient = recipientFromActiveProfile(profile)
      return !assignedKeys.has(scheduleRecipientKey(recipient))
    }),
    [profilesQuery.data, assignedKeys]
  )

  function mergeRecipient(recipient: SafetyScheduleRecipientInput) {
    const key = scheduleRecipientKey(recipient)
    if (assignedKeys.has(key)) return
    setSelectedRecipients((prev) => {
      const filtered = prev.filter((item) => scheduleRecipientKey(item) !== key)
      return [...filtered, recipient]
    })
  }

  return (
    <div className="safety-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add workers to schedule">
      <div className="safety-modal safety-modal--add-workers">
        <div className="safety-modal-header">
          <div className="safety-modal-header-copy">
            <h3 className="safety-modal-title">Add workers</h3>
            <p className="safety-modal-subtitle">
              Select workers to assign to this schedule. Existing workers are excluded from the list.
            </p>
          </div>
          <button
            type="button"
            className="safety-modal-close"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
          >
            <span className="material-icons" aria-hidden>close</span>
          </button>
        </div>

        <ScheduleRecipientsStep
          projectName={projectName}
          selectedRecipients={selectedRecipients}
          profiles={availableProfiles}
          isLoadingProfiles={profilesQuery.isLoading || profilesQuery.isFetching}
          profileSearch={profileSearch}
          profileJobTitle={profileJobTitle}
          shouldAutoFocusSearch
          onProfileSearchChange={setProfileSearch}
          onProfileJobTitleChange={setProfileJobTitle}
          onToggleProfile={(profile: SafetyActiveProfile) => {
            const next = recipientFromActiveProfile(profile)
            const key = scheduleRecipientKey(next)
            setSelectedRecipients((prev) => {
              const exists = prev.some((item) => scheduleRecipientKey(item) === key)
              if (exists) return prev.filter((item) => scheduleRecipientKey(item) !== key)
              return [...prev, next]
            })
          }}
          onSelectVisibleProfiles={(profiles) => {
            for (const profile of profiles) mergeRecipient(recipientFromActiveProfile(profile))
          }}
          onClearRecipients={() => setSelectedRecipients([])}
          onRemoveRecipient={(recipientKeyStr) => {
            setSelectedRecipients((prev) => prev.filter((item) => scheduleRecipientKey(item) !== recipientKeyStr))
          }}
          onAddRecipientByEmail={(email, displayName) => {
            const norm = email.trim().toLowerCase()
            if (!norm || !norm.includes('@')) return
            mergeRecipient({
              recipient_user_id: null,
              profile_id: null,
              recipient_email: norm,
              recipient_full_name: displayName?.trim() || null,
              membership_state: 'non_member',
              invitation_status: 'invited'
            })
          }}
          onBackToDetails={onClose}
          onCreateSchedule={() => {
            if (selectedRecipients.length === 0) return
            void onConfirm(selectedRecipients)
          }}
          isCreatingSchedule={isPending}
          primaryActionLabel="Add workers"
          primaryActionPendingLabel="Adding workers..."
        />
      </div>
    </div>
  )
}
