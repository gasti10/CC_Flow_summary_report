// Context para el wizard de creación de órdenes

import { createContext } from 'react'
import type {
  OrderFormData,
  ValidationState,
} from './types/wizard.types'

export interface WizardContextType {
  // Estado
  currentStep: number
  formData: OrderFormData
  validation: ValidationState
  isLoading: boolean
  error: string | null
  success: boolean

  // Acciones
  updateFormData: (data: Partial<OrderFormData>) => void
  validateStep: (step: number, data?: OrderFormData) => boolean
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: number) => void
  resetWizard: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSuccess: (success: boolean) => void
}

export const WizardContext = createContext<WizardContextType | undefined>(undefined)
