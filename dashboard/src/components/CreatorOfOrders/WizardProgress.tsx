// Componente para mostrar el progreso del wizard

import { useWizard } from './useWizard'
import './CreatorOfOrders.css'

const steps = [
  { number: 1, label: 'Order Information' },
  { number: 2, label: 'Panels Import' },
  { number: 3, label: 'Sheets Selection' },
  { number: 4, label: 'Upload Documents' },
  { number: 5, label: 'Review & Create' }
]

export function WizardProgress() {
  const { currentStep } = useWizard()

  return (
    <div className="wizard-progress">
      {steps.map((step, index) => (
        <div key={step.number} className="wizard-progress-item">
          {/* Línea de conexión ANTES del círculo (excepto el primero) */}
          {index > 0 && (
            <div className="wizard-progress-line-before">
              <div
                className={`wizard-progress-line-fill ${
                  currentStep >= step.number ? 'completed' : ''
                }`}
              />
            </div>
          )}
          
          <div
            className={`wizard-progress-step ${
              currentStep === step.number
                ? 'active'
                : currentStep > step.number
                ? 'completed'
                : 'pending'
            }`}
          >
            <div className="wizard-progress-step-number">{step.number}</div>
            <div className="wizard-progress-step-label">{step.label}</div>
          </div>
          
          {/* Línea de conexión DESPUÉS del círculo (excepto el último) */}
          {index < steps.length - 1 && (
            <div className="wizard-progress-line-after">
              <div
                className={`wizard-progress-line-fill ${
                  currentStep > step.number ? 'completed' : ''
                }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
