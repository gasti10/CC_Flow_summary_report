import { dailyPreStartChecklist } from '../PreStart/schema/dailyPreStartChecklist'
import { isFieldAnswered, isFieldRequired } from './preStartFormProgress'

type TriState = 'yes' | 'no' | 'na' | ''

export interface PreStartFieldRef {
  id: string
  sectionId: string
  type: 'tri_state' | 'textarea' | 'selectable_tree'
}

export function flattenPreStartFields(): PreStartFieldRef[] {
  return dailyPreStartChecklist.sections.flatMap((section) => (
    section.fields.map((field) => ({
      id: field.id,
      sectionId: section.id,
      type: field.type
    }))
  ))
}

export function findSectionIdForField(fieldId: string): string | null {
  for (const section of dailyPreStartChecklist.sections) {
    if (section.fields.some((field) => field.id === fieldId)) return section.id
  }
  return null
}

export function getFirstUnansweredFieldId(
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): string | null {
  return getUnansweredRequiredFieldIds(triStateValues, textValues, treeValues)[0] ?? null
}

export function getUnansweredRequiredFieldIds(
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): string[] {
  const ids: string[] = []
  for (const section of dailyPreStartChecklist.sections) {
    for (const field of section.fields) {
      if (!isFieldRequired(field)) continue
      if (!isFieldAnswered(field, triStateValues, textValues, treeValues)) {
        ids.push(field.id)
      }
    }
  }
  return ids
}

export function getNextUnansweredFieldId(
  currentFieldId: string,
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): string | null {
  const fields = flattenPreStartFields()
  const currentIndex = fields.findIndex((field) => field.id === currentFieldId)
  if (currentIndex === -1) {
    return getFirstUnansweredFieldId(triStateValues, textValues, treeValues)
  }

  for (let index = currentIndex + 1; index < fields.length; index += 1) {
    const ref = fields[index]
    const section = dailyPreStartChecklist.sections.find((entry) => entry.id === ref.sectionId)
    const field = section?.fields.find((entry) => entry.id === ref.id)
    if (field && isFieldRequired(field) && !isFieldAnswered(field, triStateValues, textValues, treeValues)) {
      return ref.id
    }
  }

  return null
}

export function buildCollapsedOpenSections(): Record<string, boolean> {
  return Object.fromEntries(
    dailyPreStartChecklist.sections.map((section) => [section.id, false])
  )
}

export const PRESTART_ENTRY_SECTION_ID = 'general'

export function buildInitialOpenSections(): Record<string, boolean> {
  return Object.fromEntries(
    dailyPreStartChecklist.sections.map((section) => [
      section.id,
      section.id === PRESTART_ENTRY_SECTION_ID
    ])
  )
}

export function isSectionComplete(
  sectionId: string,
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): boolean {
  const section = dailyPreStartChecklist.sections.find((entry) => entry.id === sectionId)
  if (!section) return false
  return section.fields.filter(isFieldRequired).every((field) => (
    isFieldAnswered(field, triStateValues, textValues, treeValues)
  ))
}

export function getFirstIncompleteSectionId(
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): string | null {
  for (const section of dailyPreStartChecklist.sections) {
    if (!isSectionComplete(section.id, triStateValues, textValues, treeValues)) {
      return section.id
    }
  }
  return null
}

export function getNextIncompleteSectionId(
  afterSectionId: string,
  triStateValues: Record<string, TriState>,
  textValues: Record<string, string>,
  treeValues: Record<string, string[]>
): string | null {
  const sections = dailyPreStartChecklist.sections
  const startIndex = sections.findIndex((section) => section.id === afterSectionId)
  if (startIndex === -1) {
    return getFirstIncompleteSectionId(triStateValues, textValues, treeValues)
  }

  for (let index = startIndex + 1; index < sections.length; index += 1) {
    const section = sections[index]
    if (!isSectionComplete(section.id, triStateValues, textValues, treeValues)) {
      return section.id
    }
  }

  return null
}
