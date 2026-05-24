import type { SafetyProjectMember, SafetyProjectMemberRole } from '../../../types/safety'
import { formatSafetyEnumLabel } from '../Schedules/scheduleRecipientFromProfile'
import '../../SiteOrdersPlanner/SiteOrdersPlanner.css'

interface ProjectMembersTableProps {
  rows: SafetyProjectMember[]
  isUpdatingRole: boolean
  removingMemberId: string | null
  onRoleChange: (memberId: string, role: SafetyProjectMemberRole) => void
  onRemove: (member: SafetyProjectMember) => void
}

function memberLabel(fullName: string | null, email: string | null): string {
  return fullName?.trim() || email?.trim() || 'Unknown member'
}

export default function ProjectMembersTable({
  rows,
  isUpdatingRole,
  removingMemberId,
  onRoleChange,
  onRemove
}: ProjectMembersTableProps) {
  return (
    <div className="sop-mfg-table-wrap safety-members-mfg-wrap">
      <table className="sop-mfg-table safety-members-mfg-table" aria-label="Project members">
        <caption className="sop-mfg-sr-only">
          Project members list. Change role with the dropdown or remove a member from the project.
        </caption>
        <colgroup>
          <col className="safety-members-col-name" />
          <col className="safety-members-col-email" />
          <col className="safety-members-col-job" />
          <col className="safety-members-col-role" />
          <col className="safety-members-col-source" />
          <col className="safety-members-col-status" />
          <col className="safety-members-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Name</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Email</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Job title</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Role</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Source</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Status</th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((member) => {
            const isRemoving = removingMemberId === member.member_id
            return (
              <tr key={member.member_id}>
                <td className="sop-mfg-td sop-mfg-td--instr">
                  <div className="safety-docs-cell-primary">{memberLabel(member.full_name, member.email)}</div>
                </td>
                <td className="sop-mfg-td sop-mfg-td--instr">
                  <div className="safety-docs-cell-primary">{member.email ?? '—'}</div>
                </td>
                <td className="sop-mfg-td sop-mfg-td--instr">
                  <div className="safety-docs-cell-primary">{member.job_title ?? '—'}</div>
                </td>
                <td className="sop-mfg-td sop-mfg-td--instr safety-members-td-role">
                  <div className="safety-members-role-cell">
                  <select
                    className="safety-input safety-members-role-select"
                    value={member.role}
                    disabled={isUpdatingRole || isRemoving}
                    onChange={(event) => {
                      onRoleChange(member.member_id, event.target.value as SafetyProjectMemberRole)
                    }}
                    aria-label={`Role for ${memberLabel(member.full_name, member.email)}`}
                  >
                    <option value="manager">Manager</option>
                    <option value="worker">Worker</option>
                  </select>
                  </div>
                </td>
                <td className="sop-mfg-td sop-mfg-td--instr">
                  <div className="safety-docs-cell-primary">{formatSafetyEnumLabel(member.source_role)}</div>
                </td>
                <td className="sop-mfg-td sop-mfg-td--instr">
                  <span className={`safety-status-pill safety-status-pill--${member.is_active ? 'active' : 'closed'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="sop-mfg-td sop-mfg-td--actions">
                  <div className="sop-mfg-row-actions safety-docs-row-actions" role="group" aria-label="Member actions">
                    <button
                      type="button"
                      className="sop-btn-icon safety-docs-icon-action safety-docs-icon-action--disable"
                      title="Remove member from project"
                      disabled={isUpdatingRole || (removingMemberId != null && !isRemoving)}
                      onClick={() => onRemove(member)}
                    >
                      <span className="material-icons" aria-hidden>
                        {isRemoving ? 'hourglass_empty' : 'person_remove'}
                      </span>
                      <span className="sop-mfg-sr-only">
                        {isRemoving ? 'Removing member' : `Remove ${memberLabel(member.full_name, member.email)}`}
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
  )
}
