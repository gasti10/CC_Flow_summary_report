/**
 * Opciones para TAG TYPE y STIFFENER TYPE (imágenes en el Work Order Form).
 * Sustituir imageSrc por las rutas reales de las imágenes del PDF cuando estén disponibles.
 */

export interface FormOptionWithImage {
  id: string
  label: string
  /** Ruta a la imagen (public/ o import). Dejar vacío para mostrar solo label. */
  imageSrc?: string
}

/** Tres tipos de TAG (selección única). Imágenes en public/work-order-form/ */
export const TAG_TYPE_OPTIONS: FormOptionWithImage[] = [
  { id: 'tag_type_1', label: 'Type 1', imageSrc: '/work-order-form/tag-type-1.png' },
  { id: 'tag_type_2', label: 'Type 2', imageSrc: '/work-order-form/tag-type-2.png' },
  { id: 'tag_type_3', label: 'Type 3', imageSrc: '/work-order-form/tag-type-3.png' }
]

/** Opciones de TAG THICKNESS (checkboxes) */
export const TAG_THICKNESS_OPTIONS: Array<'0mm' | '1.6mm' | '3mm'> = ['0mm', '1.6mm', '3mm']

/** Tipos de STIFFENER (selección múltiple). Imágenes en public/work-order-form/ */
export const STIFFENER_TYPE_OPTIONS: FormOptionWithImage[] = [
  { id: 'stiffener_1', label: 'ST', imageSrc: '/work-order-form/stiffener-type-1.png' },
  { id: 'stiffener_2', label: 'STB', imageSrc: '/work-order-form/stiffener-type-2.png' },
  { id: 'stiffener_3', label: 'ANGLE', imageSrc: '/work-order-form/stiffener-type-3.png' }
]
