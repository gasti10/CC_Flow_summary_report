// Hook para usar el contexto del wizard

import { useContext } from 'react'
import { WizardContext, type WizardContextType } from './wizardContextTypes'

export function useWizard(): WizardContextType {
  const context = useContext(WizardContext)
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}
