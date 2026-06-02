import type { ReactNode } from 'react'
import { useSafetyManagerProjectAccess } from './hooks/useSafetyManagerProjectAccess'
import SafetyManagerAccessDenied from './SafetyManagerAccessDenied'

interface SafetyManagerAccessGateProps {
  projectName: string
  backToProjectsPath: string
  featureDescription: string
  loadingMessage?: string
  children: ReactNode
}

export default function SafetyManagerAccessGate({
  projectName,
  backToProjectsPath,
  featureDescription,
  loadingMessage = 'Checking permissions…',
  children
}: SafetyManagerAccessGateProps) {
  const { project, isChecking, isDenied } = useSafetyManagerProjectAccess(projectName)

  if (!project) {
    return children
  }

  if (isChecking) {
    return (
      <section className="safety-card">
        <p className="safety-muted">{loadingMessage}</p>
      </section>
    )
  }

  if (isDenied) {
    return (
      <SafetyManagerAccessDenied
        projectName={project}
        backToProjectsPath={backToProjectsPath}
        featureDescription={featureDescription}
      />
    )
  }

  return children
}
