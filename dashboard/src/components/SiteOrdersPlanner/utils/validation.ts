import type { CuttingLineDraft, ManufactureStepDraft, SitePlannerValidationResult } from '../types'

function toPositiveNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

export function validateSitePlannerForm(
  project: string,
  orderId: string,
  cuttingLines: CuttingLineDraft[],
  manufactureSteps: ManufactureStepDraft[]
): SitePlannerValidationResult {
  const blockingErrors: string[] = []
  const warnings: string[] = []
  const fieldErrors: Record<string, string> = {}

  if (!project.trim()) {
    blockingErrors.push('Project is required.')
    fieldErrors.project = 'Project is required.'
  }
  if (!orderId.trim()) {
    warnings.push(
      'No site/material order selected.'
    )
  }

  if (cuttingLines.length === 0 && manufactureSteps.length === 0) {
    blockingErrors.push('Add at least one cutting line or one manufacture step.')
  }

  const duplicateLineKey = new Set<string>()
  cuttingLines.forEach((line, index) => {
    const row = index + 1
    const keyPrefix = `cutting-${line.id}`
    if (!line.description.trim()) {
      fieldErrors[`${keyPrefix}-description`] = 'Required'
      blockingErrors.push(`Cutting line ${row}: description is required.`)
    }
    if (!line.size_length.trim()) {
      fieldErrors[`${keyPrefix}-size_length`] = 'Required'
      blockingErrors.push(`Cutting line ${row}: size/length is required.`)
    }
    if (!line.uom.trim()) {
      fieldErrors[`${keyPrefix}-uom`] = 'Required'
      blockingErrors.push(`Cutting line ${row}: UoM is required.`)
    }
    if (!line.unit.trim()) {
      fieldErrors[`${keyPrefix}-unit`] = 'Required'
      blockingErrors.push(`Cutting line ${row}: unit is required.`)
    }
    const qty = toPositiveNumber(line.qty)
    if (!Number.isFinite(qty) || qty <= 0) {
      fieldErrors[`${keyPrefix}-qty`] = 'Qty must be greater than 0'
      blockingErrors.push(`Cutting line ${row}: qty must be greater than 0.`)
    }

    if (line.item_request_id?.trim() && line.size_length.trim()) {
      const duplicateKey = `${line.item_request_id.trim()}::${line.size_length.trim().toLowerCase()}`
      if (duplicateLineKey.has(duplicateKey)) {
        warnings.push(`Potential duplicate cutting line detected on row ${row}.`)
      } else {
        duplicateLineKey.add(duplicateKey)
      }
    }
  })

  const usedStepNumbers = new Set<number>()
  manufactureSteps.forEach((step, index) => {
    const row = index + 1
    const keyPrefix = `step-${step.id}`
    const stepNo = Number(step.step_no)
    if (!Number.isInteger(stepNo) || stepNo < 1) {
      fieldErrors[`${keyPrefix}-step_no`] = 'Step no must be >= 1'
      blockingErrors.push(`Manufacture step ${row}: step no must be an integer >= 1.`)
    } else if (usedStepNumbers.has(stepNo)) {
      fieldErrors[`${keyPrefix}-step_no`] = 'Duplicate step no'
      blockingErrors.push(`Manufacture step ${row}: duplicate step no ${stepNo}.`)
    } else {
      usedStepNumbers.add(stepNo)
    }

    if (!step.stage_key.trim()) {
      fieldErrors[`${keyPrefix}-stage_key`] = 'Required'
      blockingErrors.push(`Manufacture step ${row}: stage label is required.`)
    }
    if (!step.comment.trim()) {
      fieldErrors[`${keyPrefix}-comment`] = 'Required'
      blockingErrors.push(`Manufacture step ${row}: instruction is required.`)
    }
  })

  return {
    blockingErrors: [...new Set(blockingErrors)],
    warnings: [...new Set(warnings)],
    fieldErrors
  }
}
