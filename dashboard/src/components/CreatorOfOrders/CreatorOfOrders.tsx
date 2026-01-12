// Componente principal Creator of Orders con wizard multi-step

import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { WizardProvider } from './WizardContext'
import { useWizard } from './useWizard'
import { WizardProgress } from './WizardProgress'
import { WizardNavigation } from './WizardNavigation'
import { WizardSteps } from './WizardSteps'
import './CreatorOfOrders.css'

// Logo desde public folder
const ccLogo = '/CC-logo-NEW_1.webp'

// Componente interno que usa el contexto
const CreatorOfOrdersContent = () => {
  const { user, signOut } = useAuth()
  const { currentStep } = useWizard()

  // Set dynamic document title
  useDocumentTitle('Creator of Orders - Cladding Creations')

  // Aplicar clase para Step 2 y Step 3 para usar más espacio
  const isStep2 = currentStep === 2
  const isStep3 = currentStep === 3
  const useFullWidth = isStep2 || isStep3

  return (
    <div className="creator-of-orders">
      <div className="creator-header">
        <div className="creator-header-left">
          <img src={ccLogo} alt="Cladding Creations" className="creator-logo" />
          <h1>Creator of Orders</h1>
        </div>
        <div className="user-info">
          <span>Welcome, {user?.email}</span>
          <button onClick={() => signOut()} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className={`creator-content ${useFullWidth ? 'step2-full-width' : ''}`}>
        <div className={`wizard-container ${useFullWidth ? 'step2-full-width' : ''}`}>
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
