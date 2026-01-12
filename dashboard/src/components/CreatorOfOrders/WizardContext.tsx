// Context provider para el wizard de creación de órdenes

import { useState, useCallback, useEffect, type ReactNode } from 'react'
import type {
  OrderFormData,
  ValidationState,
} from './types/wizard.types'
import { WizardContext } from './wizardContextTypes'
import type { WizardContextType } from './wizardContextTypes'

// Helper para obtener fecha de hoy en formato ISO
const getTodayISO = () => new Date().toISOString().split('T')[0]

// Estado inicial del formulario
const initialFormData: OrderFormData = {
  project: '',
  orderId: '',
  status: 'Ready to cut',
  responsable: '',
  expectedTo: getTodayISO(),
  priority: 'Normal',
  selectedSheets: [],
  sheets: '',
  colour: '',
  panels: [],
  csvFile: null,
  orderComment: ''
}

// Estado inicial de validación
const initialValidation: ValidationState = {
  step1: { isValid: false, errors: [] },
  step2: { isValid: false, errors: [] },
  step3: { isValid: false, errors: [] },
  step4: { isValid: false, errors: [] }
}

interface WizardProviderProps {
  children: ReactNode
}

export function WizardProvider({ children }: WizardProviderProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OrderFormData>(initialFormData)
  const [validation, setValidation] = useState<ValidationState>(initialValidation)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Validar un step específico
  const validateStep = useCallback((step: number, data?: OrderFormData): boolean => {
    const dataToValidate = data || formData
    const errors: string[] = []
    
    switch (step) {
      case 1:
        if (!dataToValidate.project) errors.push('Project is required')
        if (!dataToValidate.orderId) errors.push('Order ID is required')
        if (!dataToValidate.responsable) errors.push('Responsable is required')
        if (!dataToValidate.expectedTo) errors.push('Expected to is required')
        break
        
      case 2:
        if (dataToValidate.selectedSheets.length === 0) {
          errors.push('Must select at least one sheet')
        } else {
          // Validar que todas las sheets seleccionadas tengan QTY > 0
          const invalidSheets = dataToValidate.selectedSheets.filter(s => s.qty <= 0)
          if (invalidSheets.length > 0) {
            errors.push('All selected sheets must have a quantity greater than 0')
          }
        }
        break
        
      case 3:
        if (dataToValidate.panels.length === 0) {
          errors.push('Must import at least one valid panel')
        }
        break
        
      case 4:
        // Validación final - verificar que todo esté completo
        if (!dataToValidate.project) errors.push('Project is required')
        if (!dataToValidate.orderId) errors.push('Order ID is required')
        if (dataToValidate.selectedSheets.length === 0) errors.push('Must select at least one sheet')
        if (dataToValidate.panels.length === 0) errors.push('Must import at least one valid panel')
        break
    }
    
    const isValid = errors.length === 0
    
    setValidation(prev => ({
      ...prev,
      [`step${step}`]: { isValid, errors }
    }))
    
    return isValid
  }, [formData])

  // Actualizar datos del formulario
  const updateFormData = useCallback((data: Partial<OrderFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...data }
      
      // Si se actualizan selectedSheets, calcular sheets y colour
      if (data.selectedSheets !== undefined) {
        if (data.selectedSheets.length > 0) {
          // La primera sheet determina el colour
          const firstSheet = data.selectedSheets[0]
          updated.colour = firstSheet.colour
          
          // Formatear sheets como "Dimension - Colour"
          const sheetsArray = data.selectedSheets.map(s => `${s.dimension} - ${s.colour}`)
          updated.sheets = sheetsArray.join(', ')
        } else {
          updated.colour = ''
          updated.sheets = ''
        }
      }
      
      return updated
    })
  }, [])

  // Re-validar el step actual cuando cambien los datos del formulario o el step
  useEffect(() => {
    validateStep(currentStep, formData)
  }, [formData, currentStep, validateStep])

  // Avanzar al siguiente step
  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1)
      }
    }
  }, [currentStep, validateStep])

  // Retroceder al step anterior
  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Ir a un step específico
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step)
    }
  }, [])

  // Resetear el wizard
  const resetWizard = useCallback(() => {
    setCurrentStep(1)
    setFormData(initialFormData)
    setValidation(initialValidation)
    setIsLoading(false)
    setError(null)
    setSuccess(false)
  }, [])

  const value: WizardContextType = {
    currentStep,
    formData,
    validation,
    isLoading,
    error,
    success,
    updateFormData,
    validateStep,
    nextStep,
    previousStep,
    goToStep,
    resetWizard,
    setLoading: setIsLoading,
    setError,
    setSuccess
  }

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  )
}
