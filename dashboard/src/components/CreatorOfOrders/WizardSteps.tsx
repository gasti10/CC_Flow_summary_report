// Componente que renderiza el step actual del wizard

import { useWizard } from './useWizard'
import { Step1Order } from './steps/Step1Order'
import { Step2Panels } from './steps/Step2Panels'
import { Step3Sheets } from './steps/Step3Sheets'
import { Step4Documents } from './steps/Step4Documents'
import { Step5Review } from './steps/Step5Review'

export function WizardSteps() {
  const { currentStep } = useWizard()

  switch (currentStep) {
    case 1:
      return <Step1Order />
    case 2:
      return <Step2Panels />
    case 3:
      return <Step3Sheets />
    case 4:
      return <Step4Documents />
    case 5:
      return <Step5Review />
    default:
      return <Step1Order />
  }
}
