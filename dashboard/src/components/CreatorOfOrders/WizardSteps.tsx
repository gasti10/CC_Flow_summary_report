// Componente que renderiza el step actual del wizard

import { useWizard } from './useWizard'
import { Step1Order } from './steps/Step1Order'
import { Step2Sheets } from './steps/Step2Sheets'
import { Step3Panels } from './steps/Step3Panels'
import { Step4Review } from './steps/Step4Review'
import { Step5Documents } from './steps/Step5Documents'

export function WizardSteps() {
  const { currentStep } = useWizard()

  switch (currentStep) {
    case 1:
      return <Step1Order />
    case 2:
      return <Step3Panels />
    case 3:
      return <Step2Sheets />
    case 4:
      return <Step5Documents />
    case 5:
      return <Step4Review />
    default:
      return <Step1Order />
  }
}
