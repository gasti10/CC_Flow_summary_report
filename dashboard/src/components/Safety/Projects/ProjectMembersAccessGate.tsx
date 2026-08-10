import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { safetyApi } from '../../../services/safetyApi'
import ProjectMembersAccessDenied from './ProjectMembersAccessDenied'

interface ProjectMembersAccessGateProps {
  projectName: string
  backToProjectsPath: string
  loadingMessage?: string
  children: ReactNode
}

/**
 * Manage members requires Manager (or admin). Site Leaders who can run schedules
 * are blocked here with an escalation list of Managers.
 */
export default function ProjectMembersAccessGate({
  projectName,
  backToProjectsPath,
  loadingMessage = 'Checking member management permissions…',
  children
}: ProjectMembersAccessGateProps) {
  const project = projectName.trim()

  const accessQuery = useQuery({
    queryKey: ['safety-can-manage-project-members', project],
    queryFn: () => safetyApi.canManageProjectMembers(project),
    enabled: Boolean(project)
  })

  if (!project) {
    return children
  }

  if (accessQuery.isLoading || accessQuery.isFetching) {
    return <p className="safety-muted">{loadingMessage}</p>
  }

  if (!accessQuery.data) {
    return (
      <ProjectMembersAccessDenied
        projectName={project}
        backToProjectsPath={backToProjectsPath}
      />
    )
  }

  return <>{children}</>
}
