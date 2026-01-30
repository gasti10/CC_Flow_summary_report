// Componente para navegación del wizard (botones Anterior/Siguiente)

import { useWizard } from './useWizard'
import './CreatorOfOrders.css'
import type { ValidationState } from './types/wizard.types'

export function WizardNavigation() {
  const { currentStep, previousStep, nextStep, validateStep, isLoading, validation, success } = useWizard()

  const handleNext = () => {
    if (validateStep(currentStep)) {
      nextStep()
    }
  }

  const handlePrevious = () => {
    previousStep()
  }

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === 5
  const isCurrentStepValid = validation[`step${currentStep}` as keyof ValidationState]?.isValid ?? false
  const disableNext = isLoading || !isCurrentStepValid
  // Deshabilitar Previous si es el primer step, está cargando, o la orden fue creada exitosamente
  const disablePrevious = isFirstStep || isLoading || success

  return (
    <div className="wizard-navigation">
      <button
        type="button"
        onClick={handlePrevious}
        disabled={disablePrevious}
        className="wizard-nav-button wizard-nav-button-prev"
      >
        Previous
      </button>
      
      {!isLastStep ? (
        <button
          type="button"
          onClick={handleNext}
          disabled={disableNext}
          className="wizard-nav-button wizard-nav-button-next"
        >
          Next
        </button>
      ) : null}
    </div>
  )
}
