import { Fragment, type KeyboardEvent } from 'react'
import type { Project } from '../../../types/appsheet'
import type { SafetyPeopleDirectoryProfile, SafetyProfileMembership, SafetyProjectMemberRole } from '../../../types/safety'
import PeopleMembershipPanel from './PeopleMembershipPanel'
import '../../SiteOrdersPlanner/SiteOrdersPlanner.css'

interface PeopleDirectoryTableProps {
  rows: SafetyPeopleDirectoryProfile[]
  expandedProfileId: string | null
  projects: Project[]
  savingProfileId: string | null
  updatingProfileActiveId: string | null
  isUpdatingRole: boolean
  removingMemberId: string | null
  isAdding: boolean
  onToggleExpand: (profileId: string) => void
  onSaveProfile: (
    profileId: string,
    payload: { fullName: string | null; jobTitle: string | null; phone: string | null }
  ) => void
  onSetProfileActive: (profileId: string, isActive: boolean) => void
  onRoleChange: (memberId: string, role: SafetyProjectMemberRole) => void
  onRemove: (membership: SafetyProfileMembership, profileLabel: string) => void
  onAddToProject: (profileId: string, projectName: string, role: SafetyProjectMemberRole) => void
}

function profileLabel(profile: SafetyPeopleDirectoryProfile): string {
  return profile.full_name?.trim() || profile.email?.trim() || 'Unknown profile'
}

function membershipSummary(profile: SafetyPeopleDirectoryProfile): string {
  const active = profile.memberships.filter((m) => m.is_active)
  if (active.length === 0) return 'No projects'
  const managerCount = active.filter((m) => m.role === 'manager').length
  const parts = [`${active.length} project${active.length === 1 ? '' : 's'}`]
  if (managerCount > 0) {
    parts.push(`${managerCount} Manager${managerCount === 1 ? '' : 's'}`)
  }
  return parts.join(' · ')
}

function membershipChips(profile: SafetyPeopleDirectoryProfile): string {
  const active = profile.memberships.filter((m) => m.is_active)
  if (active.length === 0) return 'No projects'
  return active
    .slice(0, 3)
    .map((m) => `${m.project_name} (${m.role === 'manager' ? 'Manager' : 'Worker'})`)
    .join(', ')
    + (active.length > 3 ? ` +${active.length - 3} more` : '')
}

export default function PeopleDirectoryTable({
  rows,
  expandedProfileId,
  projects,
  savingProfileId,
  updatingProfileActiveId,
  isUpdatingRole,
  removingMemberId,
  isAdding,
  onToggleExpand,
  onSaveProfile,
  onSetProfileActive,
  onRoleChange,
  onRemove,
  onAddToProject
}: PeopleDirectoryTableProps) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, profileId: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onToggleExpand(profileId)
  }

  return (
    <div className="sop-mfg-table-wrap safety-people-mfg-wrap">
      <table className="sop-mfg-table safety-people-mfg-table" aria-label="Safety people directory">
        <caption className="sop-mfg-sr-only">
          Expand a row to view and edit project memberships for that person.
        </caption>
        <colgroup>
          <col className="safety-people-col-expand" />
          <col className="safety-members-col-name" />
          <col className="safety-members-col-email" />
          <col className="safety-people-col-phone" />
          <col className="safety-members-col-job" />
          <col className="safety-people-col-memberships" />
          <col className="safety-members-col-status" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr" aria-label="Expand" />
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Name</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Email</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Phone</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Job title</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Memberships</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Profile</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((profile) => {
            const isExpanded = expandedProfileId === profile.profile_id
            const label = profileLabel(profile)
            return (
              <Fragment key={profile.profile_id}>
                <tr
                  className={`safety-people-row${isExpanded ? ' is-expanded' : ''}`}
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => onToggleExpand(profile.profile_id)}
                  onKeyDown={(event) => handleRowKeyDown(event, profile.profile_id)}
                >
                  <td className="sop-mfg-td sop-mfg-td--instr safety-people-td-expand">
                    <span className="material-icons safety-people-expand-icon" aria-hidden>
                      {isExpanded ? 'expand_less' : 'chevron_right'}
                    </span>
                  </td>
                  <td className="sop-mfg-td sop-mfg-td--instr">
                    <div className="safety-docs-cell-primary">{label}</div>
                  </td>
                  <td className="sop-mfg-td sop-mfg-td--instr">
                    <div className="safety-docs-cell-primary">{profile.email ?? '—'}</div>
                  </td>
                  <td className="sop-mfg-td sop-mfg-td--instr">
                    <div className="safety-docs-cell-primary">{profile.phone ?? '—'}</div>
                  </td>
                  <td className="sop-mfg-td sop-mfg-td--instr">
                    <div className="safety-docs-cell-primary">{profile.job_title ?? '—'}</div>
                  </td>
                  <td className="sop-mfg-td sop-mfg-td--instr">
                    <div className="safety-docs-cell-primary" title={membershipChips(profile)}>
                      {membershipSummary(profile)}
                    </div>
                    <div className="safety-docs-cell-muted safety-people-membership-chips">
                      {membershipChips(profile)}
                    </div>
                  </td>
                  <td className="sop-mfg-td sop-mfg-td--instr">
                    <span className={`safety-status-pill safety-status-pill--${profile.is_active ? 'active' : 'closed'}`}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="safety-people-detail-row">
                    <td colSpan={7} className="safety-people-detail-cell">
                      <PeopleMembershipPanel
                        profile={profile}
                        projects={projects}
                        isSavingProfile={savingProfileId === profile.profile_id}
                        isUpdatingProfileActive={updatingProfileActiveId === profile.profile_id}
                        isUpdatingRole={isUpdatingRole}
                        removingMemberId={removingMemberId}
                        isAdding={isAdding}
                        onSaveProfile={(payload) => {
                          onSaveProfile(profile.profile_id, payload)
                        }}
                        onSetProfileActive={(isActive) => {
                          onSetProfileActive(profile.profile_id, isActive)
                        }}
                        onRoleChange={onRoleChange}
                        onRemove={onRemove}
                        onAddToProject={(projectName, role) => {
                          onAddToProject(profile.profile_id, projectName, role)
                        }}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
