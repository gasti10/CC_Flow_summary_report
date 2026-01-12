// Componente para navegación del wizard (botones Anterior/Siguiente)

import { useWizard } from './useWizard'
import './CreatorOfOrders.css'

export function WizardNavigation() {
  const { currentStep, previousStep, nextStep, validateStep, isLoading } = useWizard()

  const handleNext = () => {
    if (validateStep(currentStep)) {
      nextStep()
    }
  }

  const handlePrevious = () => {
    previousStep()
  }

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === 4

  return (
    <div className="wizard-navigation">
      <button
        type="button"
        onClick={handlePrevious}
        disabled={isFirstStep || isLoading}
        className="wizard-nav-button wizard-nav-button-prev"
      >
        Previous
      </button>
      
      {!isLastStep ? (
        <button
          type="button"
          onClick={handleNext}
          disabled={isLoading}
          className="wizard-nav-button wizard-nav-button-next"
        >
          Next
        </button>
      ) : null}
    </div>
  )
}
