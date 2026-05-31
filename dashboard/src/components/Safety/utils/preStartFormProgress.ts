import { dailyPreStartChecklist } from '../PreStart/schema/dailyPreStartChecklist'

type TriState = 'yes' | 'no' | 'na' | ''

type ChecklistField = (typeof dailyPreStartChecklist.sections)[number]['fields'][number]

export function isFieldOptional(field: ChecklistField): boolean {
  return 'optional' in field && field.optional === true
}

export function isFieldRequired(field: ChecklistField): boolean {
  return !isFieldOptional(field)
}

export function isFieldAnswered(
  field: ChecklistField,
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): boolean {
  if (field.type === 'tri_state') {
    const value = triStateValues[field.id]
    return value === 'yes' || value === 'no' || value === 'na'
  }
  if (field.type === 'textarea') {
    return (textValues[field.id] ?? '').trim().length > 0
  }
  if (field.type === 'selectable_tree') {
    return (treeValues[field.id] ?? []).length > 0
  }
  return false
}

export function sectionProgress(
  sectionId: string,
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): { answered: number; total: number } {
  const section = dailyPreStartChecklist.sections.find((entry) => entry.id === sectionId)
  if (!section) return { answered: 0, total: 0 }
  const requiredFields = section.fields.filter(isFieldRequired)
  const total = requiredFields.length
  const answered = requiredFields.filter((field) => (
    isFieldAnswered(field, triStateValues, textValues, treeValues)
  )).length
  return { answered, total }
}

export function formProgress(
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): { answered: number; total: number } {
  return dailyPreStartChecklist.sections.reduce(
    (acc, section) => {
      const progress = sectionProgress(section.id, triStateValues, textValues, treeValues)
      return {
        answered: acc.answered + progress.answered,
        total: acc.total + progress.total
      }
    },
    { answered: 0, total: 0 }
  )
}
