import { useMemo, useState, type MouseEvent } from 'react'
import type { Project } from '../../../types/appsheet'
import type {
  SafetyPeopleDirectoryProfile,
  SafetyProfileMembership,
  SafetyProjectMemberRole
} from '../../../types/safety'
import { formatSafetyEnumLabel } from '../Schedules/scheduleRecipientFromProfile'
import PeopleProjectSelect from './PeopleProjectSelect'
import PeopleProfileEditPanel from './PeopleProfileEditPanel'
import '../../SiteOrdersPlanner/SiteOrdersPlanner.css'

interface PeopleMembershipPanelProps {
  profile: SafetyPeopleDirectoryProfile
  projects: Project[]
  isSavingProfile: boolean
  isUpdatingProfileActive: boolean
  isUpdatingRole: boolean
  removingMemberId: string | null
  isAdding: boolean
  onSaveProfile: (payload: {
    fullName: string | null
    jobTitle: string | null
    phone: string | null
  }) => void
  onSetProfileActive: (isActive: boolean) => void
  onRoleChange: (memberId: string, role: SafetyProjectMemberRole) => void
  onRemove: (membership: SafetyProfileMembership, profileLabel: string) => void
  onAddToProject: (projectName: string, role: SafetyProjectMemberRole) => void
}

function profileLabel(profile: SafetyPeopleDirectoryProfile): string {
  return profile.full_name?.trim() || profile.email?.trim() || 'Unknown profile'
}

function stopPanelClick(event: MouseEvent) {
  event.stopPropagation()
}

export default function PeopleMembershipPanel({
  profile,
  projects,
  isSavingProfile,
  isUpdatingProfileActive,
  isUpdatingRole,
  removingMemberId,
  isAdding,
  onSaveProfile,
  onSetProfileActive,
  onRoleChange,
  onRemove,
  onAddToProject
}: PeopleMembershipPanelProps) {
  const [addProjectName, setAddProjectName] = useState('')
  const [addRole, setAddRole] = useState<SafetyProjectMemberRole>('worker')

  const activeMembershipProjects = useMemo(
    () => new Set(profile.memberships.filter((m) => m.is_active).map((m) => m.project_name)),
    [profile.memberships]
  )

  const availableProjectNames = useMemo(
    () => projects
      .map((project) => project.Name)
      .filter((name): name is string => Boolean(name?.trim()) && !activeMembershipProjects.has(name))
      .sort((a, b) => a.localeCompare(b)),
    [activeMembershipProjects, projects]
  )

  const label = profileLabel(profile)
  const canSubmit = Boolean(addProjectName.trim()) && !isAdding

  function handleAdd() {
    const projectName = addProjectName.trim()
    if (!projectName || isAdding) return
    onAddToProject(projectName, addRole)
    setAddProjectName('')
  }

  return (
    <div className="safety-people-membership-panel" onClick={stopPanelClick}>
      <PeopleProfileEditPanel
        profile={profile}
        isSaving={isSavingProfile}
        isUpdatingActive={isUpdatingProfileActive}
        onSave={onSaveProfile}
        onSetActive={onSetProfileActive}
      />

      <h4 className="safety-people-section-title">Project memberships</h4>
      <p className="safety-muted safety-inline-help">
        Managers can create schedules, daily pre-starts, and toolbox talks. Workers receive and sign assignments only.
      </p>

      {profile.memberships.length === 0 ? (
        <p className="safety-muted">No active project memberships yet.</p>
      ) : (
        <div className="sop-mfg-table-wrap safety-members-mfg-wrap safety-people-membership-table-wrap">
          <table className="sop-mfg-table safety-members-mfg-table" aria-label={`Project memberships for ${label}`}>
            <colgroup>
              <col className="safety-people-membership-col-project" />
              <col className="safety-members-col-role" />
              <col className="safety-members-col-source" />
              <col className="safety-members-col-status" />
              <col className="safety-members-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Project</th>
                <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Role</th>
                <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Source</th>
                <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Status</th>
                <th scope="col" className="sop-mfg-th sop-mfg-th--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profile.memberships.map((membership) => {
                const isRemoving = removingMemberId === membership.member_id
                return (
                  <tr key={membership.member_id}>
                    <td className="sop-mfg-td sop-mfg-td--instr">
                      <div className="safety-docs-cell-primary">{membership.project_name}</div>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr safety-members-td-role">
                      <div className="safety-members-role-cell">
                        <select
                          className="safety-input safety-members-role-select"
                          value={membership.role}
                          disabled={!membership.is_active || isUpdatingRole || isRemoving}
                          onChange={(event) => {
                            onRoleChange(membership.member_id, event.target.value as SafetyProjectMemberRole)
                          }}
                          aria-label={`Role for ${label} on ${membership.project_name}`}
                        >
                          <option value="manager">Manager</option>
                          <option value="worker">Worker</option>
                        </select>
                      </div>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr">
                      <div className="safety-docs-cell-primary">{formatSafetyEnumLabel(membership.source_role)}</div>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr">
                      <span className={`safety-status-pill safety-status-pill--${membership.is_active ? 'active' : 'closed'}`}>
                        {membership.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--actions">
                      <div className="sop-mfg-row-actions safety-docs-row-actions" role="group" aria-label="Membership actions">
                        <button
                          type="button"
                          className="sop-btn-icon safety-docs-icon-action safety-docs-icon-action--disable"
                          title="Remove from project"
                          disabled={!membership.is_active || isUpdatingRole || (removingMemberId != null && !isRemoving)}
                          onClick={() => onRemove(membership, label)}
                        >
                          <span className="material-icons" aria-hidden>
                            {isRemoving ? 'hourglass_empty' : 'person_remove'}
                          </span>
                          <span className="sop-mfg-sr-only">
                            {isRemoving ? 'Removing membership' : `Remove ${label} from ${membership.project_name}`}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="safety-people-add-membership">
        <h4 className="safety-people-add-membership-title">Add to project</h4>
        <div className="safety-people-add-membership-row">
          <PeopleProjectSelect
            id={`safety-people-project-${profile.profile_id}`}
            ariaLabel="Project to add membership"
            options={availableProjectNames}
            value={addProjectName}
            disabled={isAdding}
            onChange={setAddProjectName}
          />
          <select
            className="safety-input"
            value={addRole}
            disabled={isAdding}
            onChange={(event) => setAddRole(event.target.value as SafetyProjectMemberRole)}
            aria-label="Role for new membership"
          >
            <option value="manager">Manager</option>
            <option value="worker">Worker</option>
          </select>
          <button
            type="button"
            className="safety-btn-primary"
            disabled={!canSubmit}
            onClick={handleAdd}
          >
            {isAdding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
