// Componente principal Creator of Orders con wizard multi-step

import { useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { WizardProvider } from './WizardContext'
import { useWizard } from './useWizard'
import { WizardProgress } from './WizardProgress'
import { WizardNavigation } from './WizardNavigation'
import { WizardSteps } from './WizardSteps'
import { getLogoPath } from '../../utils/assetUtils'
import './CreatorOfOrders.css'

// Componente interno que usa el contexto
const CreatorOfOrdersContent = () => {
  const { user, signOut } = useAuth()
  const { currentStep, creationResult } = useWizard()
  const wizardContainerRef = useRef<HTMLDivElement>(null)

  // Set dynamic document title
  useDocumentTitle('Creator of Orders - Cladding Creations')

  // Scroll automático al inicio cuando cambia el step o cuando se muestra la pantalla de éxito
  useEffect(() => {
    // Scroll suave al inicio del contenedor del wizard cuando cambia el step
    // Usamos un delay para asegurar que el DOM se haya actualizado
    // Si viene de un reset (step 1), usamos un delay un poco mayor para asegurar que todo se haya renderizado
    const delay = currentStep === 1 ? 200 : 100
    const timeoutId = setTimeout(() => {
      if (wizardContainerRef.current) {
        wizardContainerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      } else {
        // Fallback: scroll a la parte superior de la página
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [currentStep, creationResult?.success])

  // Aplicar clase para Step 2 y Step 3 para usar más espacio
  const isStep2 = currentStep === 2
  const isStep3 = currentStep === 3
  const useFullWidth = isStep2 || isStep3

  return (
    <div className="creator-of-orders">
      <div className="creator-header">
        <div className="creator-header-left">
          <img src={getLogoPath()} alt="Cladding Creations" className="creator-logo" />
          <h1>Panel Order Creator</h1>
        </div>
        <div className="user-info">
          <span>Welcome, {user?.email}</span>
          <button onClick={() => signOut()} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className={`creator-content ${useFullWidth ? 'step2-full-width' : ''}`}>
        <div 
          ref={wizardContainerRef}
          className={`wizard-container ${useFullWidth ? 'step2-full-width' : ''}`}
        >
          <WizardProgress />
          <div className="wizard-steps-container">
            <WizardSteps />
          </div>
          <WizardNavigation />
        </div>
      </div>
    </div>
  )
}

const CreatorOfOrders = () => {
  return (
    <WizardProvider>
      <CreatorOfOrdersContent />
    </WizardProvider>
  )
}

export default CreatorOfOrders
