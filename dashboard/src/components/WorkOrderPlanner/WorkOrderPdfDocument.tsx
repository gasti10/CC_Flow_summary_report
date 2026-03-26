import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer'
import type { Specification } from '../../types/supabase'
import type { WorkflowStageItem } from './workflowConfig'
import { TAG_TYPE_OPTIONS, STIFFENER_TYPE_OPTIONS } from './workOrderFormOptions'
import { getWorkOrderFormImageUrl, getAssetPath } from '../../utils/assetUtils'
import { formatDateTime } from '../../utils/dateUtils'

type OrderForPdf = {
  'Order ID': string
  Project: string
  ProjectManager?: string
  ProjectAddress?: string
  ProjectDescription?: string
  Colour?: string
  'Expected to'?: string
  Sheets?: string
}

// Estilos tipo Google Sheets: tabla compacta con labels inline
// Fuentes +1pt respecto a la versión anterior; paddings/margins reducidos para caber en 1 página A4.
const styles = StyleSheet.create({
  page: {
    padding: 10,
    fontSize: 8,
    fontFamily: 'Helvetica',
    backgroundColor: '#fff'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#000',
    padding: 4,
    backgroundColor: '#f3f4f6'
  },
  logoWrap: {
    width: 24,
    height: 24,
    flexShrink: 0
  },
  logo: {
    width: 24,
    height: 24
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    flex: 1
  },
  // Fila de tabla con celdas
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 15
  },
  // Celda de tabla (con label inline)
  tableCell: {
    flex: 1,
    padding: 2,
    borderRightWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableCellLast: {
    flex: 1,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Label inline (negrita, mayúsculas)
  cellLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginRight: 3
  },
  // Valor inline
  cellValue: {
    fontSize: 8,
    flex: 1,
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    backgroundColor: '#f3f4f6',
    padding: 2,
    marginTop: 2,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#000',
    textAlign: 'center'
  },
  // Fila de checkboxes compacta
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 14,
    justifyContent: 'center'
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 0.5
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 0.8,
    borderColor: '#000',
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  checkboxChecked: {
    backgroundColor: '#000'
  },
  checkMark: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#fff'
  },
  checkLabel: {
    fontSize: 8
  },
  // Manufacture process: solo mostrar los que existen
  manufactureTable: {
    marginTop: 0,
    marginBottom: 0
  },
  manufactureRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 12,
    alignItems: 'center'
  },
  manufactureNumCell: {
    width: 16,
    borderRightWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb'
  },
  manufactureNumText: {
    fontSize: 7,
    fontWeight: 'bold'
  },
  manufactureTextCell: {
    flex: 1,
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  manufactureText: {
    fontSize: 8,
    textAlign: 'center'
  },
  // Secciones de detalles más compactas
  detailsBlock: {
    marginBottom: 0
  },
  detailRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 12,
    alignItems: 'center',
    padding: 1,
    flexWrap: 'wrap'
  },
  /** Fila de 2 celdas iguales (50/50) con borde entre ellas */
  detailRow2Col: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 13,
    alignItems: 'center'
  },
  /** Fila de 3 celdas iguales (33/33/33) */
  detailRow3Col: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 13,
    alignItems: 'center'
  },
  /** Celda dentro de una fila multi-columna */
  detailCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 1,
    borderRightWidth: 1,
    borderRightColor: '#000',
    flexWrap: 'wrap'
  },
  detailCellLast: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 1,
    flexWrap: 'wrap'
  },
  detailLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginRight: 3
  },
  footerSeparator: {
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    marginTop: 6,
    marginBottom: 3
  },
  footerNote: {
    fontSize: 7,
    color: '#666',
    textAlign: 'center'
  },
  imageOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'center',
    padding: 2,
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 34
  },
  imageOptionItem: {
    alignItems: 'center',
    width: 44,
    padding: 1,
    borderWidth: 0.5,
    borderColor: '#ccc',
    borderRadius: 2
  },
  imageOptionItemSelected: {
    borderColor: '#000',
    borderWidth: 1,
    backgroundColor: '#f0fdf4'
  },
  imageOptionImg: {
    width: 36,
    height: 26,
    objectFit: 'contain' as unknown as undefined
  },
  imageOptionLabel: {
    fontSize: 6,
    textAlign: 'center',
    marginTop: 1
  }
})

/** Formatea profundidad sin duplicar "mm". Ej: "0.7 mm" → "0.7 mm", "4" → "4mm" */
function formatDepth(value: unknown): string {
  if (!value) return ''
  const s = String(value).trim()
  if (!s) return ''
  if (/mm/i.test(s)) return s
  return `${s}mm`
}

/** Resuelve TAG TYPE id → label (Type 1, Type 2, Type 3) */
function resolveTagTypeLabel(id: unknown): string {
  if (!id) return ''
  const opt = TAG_TYPE_OPTIONS.find(o => o.id === String(id))
  return opt?.label ?? String(id)
}

/** Resuelve STIFFENER stiffenerTypes { id: true } → lista de labels */
function resolveStiffenerLabels(types: unknown): string {
  if (!types || typeof types !== 'object') return ''
  const selected = Object.entries(types as Record<string, boolean>)
    .filter(([, v]) => v)
    .map(([k]) => {
      const opt = STIFFENER_TYPE_OPTIONS.find(o => o.id === k)
      return opt?.label ?? k
    })
  return selected.join(', ')
}

// Componente: celda de tabla con label inline
function TableCell({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={isLast ? styles.tableCellLast : styles.tableCell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value || ' '}</Text>
    </View>
  )
}

function CheckboxCell({ label, checked }: { label: string; checked: boolean | unknown }) {
  const isChecked = checked === true || (typeof checked === 'string' && checked.toLowerCase() === 'true')
  return (
    <View style={styles.checkboxItem}>
      <View style={[styles.checkbox, ...(isChecked ? [styles.checkboxChecked] : [])]}>
        {isChecked && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  )
}

export interface WorkOrderPdfDocumentProps {
  order: OrderForPdf
  spec: Specification
  workflowStages: WorkflowStageItem[]
  panelCount?: number
  /** URL absoluta del logo (ej. origin + getLogoPath()). Opcional. */
  logoUrl?: string
}

export default function WorkOrderPdfDocument({
  order,
  spec,
  workflowStages,
  panelCount,
  logoUrl
}: WorkOrderPdfDocumentProps) {
  const mat = (spec.material ?? {}) as Record<string, unknown>
  const materialType = (mat.type ?? {}) as Record<string, boolean>
  const materialThickness = (mat.thickness ?? {}) as Record<string, boolean>
  const rivet = (spec.rivet ?? {}) as Record<string, boolean>
  const cnc = (spec.cnc ?? {}) as Record<string, unknown>
  const fold = (spec.fold ?? {}) as Record<string, unknown>
  const tag = (spec.tag ?? {}) as Record<string, unknown>
  const stiffener = (spec.stiffener ?? {}) as Record<string, unknown>
  const delivery = (spec.delivery ?? {}) as Record<string, unknown>
  const headerDetails = (spec.header_details ?? {}) as Record<string, unknown>

  const deliveryDate = formatDateTime(order['Expected to'] ?? undefined)

  // Solo stages que existen (filtrar vacíos)
  const activeStages = workflowStages.filter(s => s && s.label)

  // Favicon PNG (soportado por react-pdf). URL absoluta.
  const faviconUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${getAssetPath('favicon.png')}`
    : logoUrl ?? ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: favicon izq + WORK ORDER - [ORDER-ID] + favicon der */}
        <View style={styles.headerRow}>
          <View style={styles.logoWrap}>
            {faviconUrl ? <Image src={faviconUrl} style={styles.logo} /> : null}
          </View>
          <Text style={styles.mainTitle}>WORK ORDER - {order['Order ID'] ?? ''}</Text>
          <View style={styles.logoWrap}>
            {faviconUrl ? <Image src={faviconUrl} style={styles.logo} /> : null}
          </View>
        </View>

        {/* Fila 1: PROJECT + DELIVERY DATE */}
        <View style={styles.tableRow}>
          <TableCell label="PROJECT" value={order.Project ?? ''} />
          <TableCell label="DELIVERY DATE" value={deliveryDate} isLast />
        </View>

        {/* Fila 2: PROJECT ADDRESS + PROJECT MANAGER */}
        <View style={styles.tableRow}>
          <TableCell label="PROJECT ADDRESS" value={order.ProjectAddress ?? ''} />
          <TableCell label="PROJECT MANAGER" value={order.ProjectManager ?? ''} isLast />
        </View>

        {/* Fila 3: PROJECT DESCRIPTION */}
        <View style={styles.tableRow}>
          <TableCell label="PROJECT DESCRIPTION" value={String(headerDetails.project_description ?? order.ProjectDescription ?? '')} isLast />
        </View>

        {/* ORDER DETAILS */}
        <Text style={styles.sectionTitle}>ORDER DETAILS</Text>

        {/* Fila: ORDER NUMBER + TOTAL QTY */}
        <View style={styles.tableRow}>
          <TableCell label="ORDER NUMBER" value={order['Order ID'] ?? ''} />
          <TableCell label="TOTAL QTY" value={panelCount != null ? String(panelCount) : ''} isLast />
        </View>

        {/* Fila: AREA + PARTIAL TRANSFER — desde spec.header_details si existen */}
        <View style={styles.tableRow}>
          <TableCell label="AREA" value={typeof headerDetails.area === 'string' ? headerDetails.area : ''} />
          <TableCell label="PARTIAL TRANSFER" value={headerDetails.partial_transfer === true ? 'YES' : 'NO'} isLast />
        </View>

        {/* MATERIAL TYPE */}
        <Text style={styles.sectionTitle}>MATERIAL TYPE</Text>
        <View style={styles.checkboxRow}>
          <CheckboxCell label="SAP" checked={!!materialType.sap} />
          <CheckboxCell label="NCP" checked={!!materialType.ncp} />
          <CheckboxCell label="SS" checked={!!materialType.ss} />
          <CheckboxCell label="MILL FINISH" checked={!!materialType.millFinish} />
        </View>

        {/* MATERIAL THICKNESS */}
        <Text style={styles.sectionTitle}>MATERIAL THICKNESS</Text>
        <View style={styles.checkboxRow}>
          {['2mm', '3mm', '4mm', '5mm', '6mm', '7mm', '8mm'].map(k => (
            <CheckboxCell key={k} label={k} checked={!!materialThickness[k]} />
          ))}
        </View>

        {/* Fila: MATERIAL COLOUR/FINISH + MATERIAL SIZE */}
        <View style={styles.tableRow}>
          <TableCell label="MATERIAL COLOUR/FINISH" value={(mat.colourFinish as string) ?? order.Colour ?? ''} />
          <TableCell label="MATERIAL SIZE" value={(mat.materialSize as string) ?? order.Sheets ?? ''} isLast />
        </View>

        {/* RIVET SPECIFICATIONS */}
        <Text style={styles.sectionTitle}>RIVET SPECIFICATIONS</Text>
        <View style={styles.checkboxRow}>
          <CheckboxCell label="ALUMINIUM" checked={!!rivet.aluminium} />
          <CheckboxCell label="STAINLESS" checked={!!rivet.stainless} />
          <CheckboxCell label="STEEL" checked={!!rivet.steel} />
          <CheckboxCell label="DOME HEAD" checked={!!rivet.domeHead} />
          <CheckboxCell label="C/SUNK" checked={!!rivet.cSunk} />
          <CheckboxCell label="FLANGE" checked={!!rivet.flange} />
          <CheckboxCell label="ø3.2mm" checked={!!rivet.diameter32} />
          <CheckboxCell label="ø4mm" checked={!!rivet.diameter4} />
          <CheckboxCell label="ø4.8mm" checked={!!rivet.diameter48} />
          <CheckboxCell label="ø5mm" checked={!!rivet.diameter5} />
        </View>

        {/* MANUFACTURE PROCESS: solo los stages activos */}
        <Text style={styles.sectionTitle}>MANUFACTURE PROCESS</Text>
        <View style={styles.manufactureTable}>
          {activeStages.map((stage, i) => {
            const text = `${stage.outsourced ? '*' : ''}${stage.label}${stage.comment ? ` - ${stage.comment}` : ''}`
            return (
              <View key={i} style={styles.manufactureRow}>
                <View style={styles.manufactureNumCell}>
                  <Text style={styles.manufactureNumText}>{i + 1}</Text>
                </View>
                <View style={styles.manufactureTextCell}>
                  <Text style={styles.manufactureText}>{text}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* CNC DETAILS */}
        <Text style={styles.sectionTitle}>CNC DETAILS</Text>
        <View style={styles.detailsBlock}>
          {/* Fila 1: STANDARD GROOVE | SPECIAL V-GROOVE | OVERFOLD */}
          <View style={styles.detailRow3Col}>
            <View style={styles.detailCell}>
              <CheckboxCell label="STANDARD GROOVE" checked={!!cnc.standardGroove} />
              {cnc.depthMm ? <Text style={{ marginLeft: 3, fontSize: 8 }}>{formatDepth(cnc.depthMm)} DEPTH</Text> : null}
            </View>
            <View style={styles.detailCell}>
              <CheckboxCell label="SPECIAL V-GROOVE" checked={!!cnc.specialVGroove} />
            </View>
            <View style={styles.detailCellLast}>
              <CheckboxCell label="OVERFOLD" checked={!!cnc.overfold} />
              {cnc.overfoldDepth ? <Text style={{ marginLeft: 3, fontSize: 8 }}>DEPTH {formatDepth(cnc.overfoldDepth)}</Text> : null}
            </View>
          </View>
          {/* Fila 2: ROTATE PANEL | BRIDGES */}
          <View style={styles.detailRow2Col}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>ROTATE PANEL RELATIVE TO SHEET</Text>
              <CheckboxCell label="YES" checked={cnc.rotatePanel === 'YES'} />
              <CheckboxCell label="NO" checked={cnc.rotatePanel === 'NO'} />
              <CheckboxCell label="N/A" checked={cnc.rotatePanel === 'N/A'} />
            </View>
            <View style={styles.detailCellLast}>
              <Text style={styles.detailLabel}>BRIDGES</Text>
              <CheckboxCell label="YES" checked={!!cnc.bridges} />
              <CheckboxCell label="NO" checked={!!cnc.bridgesNo} />
            </View>
          </View>
          {/* Fila 3: TRIM STICKER | SECURE SMALL PARTS */}
          <View style={styles.detailRow2Col}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>TRIM STICKER</Text>
              <CheckboxCell label="YES" checked={cnc.trimSticker === 'YES' || cnc.trimSticker === 'HEIGHT'} />
              <CheckboxCell label="N/A" checked={cnc.trimSticker === 'N/A'} />
              {(cnc.trimSticker === 'YES' || cnc.trimSticker === 'HEIGHT') && cnc.trimStickerHeight ? (
                <Text style={{ marginLeft: 3, fontSize: 8 }}>{String(cnc.trimStickerHeight)}</Text>
              ) : null}
            </View>
            <View style={styles.detailCellLast}>
              <Text style={styles.detailLabel}>SECURE SMALL PARTS</Text>
              <CheckboxCell label="YES" checked={!!cnc.secureSmallParts} />
              <CheckboxCell label="NO" checked={!!cnc.secureSmallPartsNo} />
            </View>
          </View>
          {cnc.additionalInfo ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ADDITIONAL INFO</Text>
              <Text style={{ fontSize: 8 }}>{String(cnc.additionalInfo)}</Text>
            </View>
          ) : null}
        </View>

        {/* FOLD DETAILS */}
        <Text style={styles.sectionTitle}>FOLD DETAILS</Text>
        <View style={styles.detailsBlock}>
          {/* Fila 1: FOLD RETURN | SPECIAL FOLD */}
          <View style={styles.detailRow2Col}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>FOLD RETURN</Text>
              <CheckboxCell label="YES" checked={!!fold.foldReturn} />
              <CheckboxCell label="NO" checked={!!fold.foldReturnNo} />
            </View>
            <View style={styles.detailCellLast}>
              <Text style={styles.detailLabel}>SPECIAL FOLD</Text>
              <CheckboxCell label="OVERFOLD" checked={!!fold.overfold} />
              <CheckboxCell label="UPFOLD" checked={!!fold.upfold} />
              <CheckboxCell label="N/A" checked={!!fold.foldNa} />
            </View>
          </View>
          {/* Fila 2: FOLD PANEL | SPECIAL CUT */}
          <View style={styles.detailRow2Col}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>FOLD PANEL</Text>
              <CheckboxCell label="YES" checked={!!fold.foldPanel} />
              <CheckboxCell label="NO" checked={!!fold.foldPanelNo} />
            </View>
            <View style={styles.detailCellLast}>
              <Text style={styles.detailLabel}>SPECIAL CUT</Text>
              <CheckboxCell label="FLUSH CUT" checked={!!fold.flushCut} />
              <CheckboxCell label="CAP ROUTE" checked={!!fold.capRoute} />
              <CheckboxCell label="FACTORY EDGE" checked={!!fold.factoryEdge} />
            </View>
          </View>
          {fold.additionalInfo ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ADDITIONAL INFO</Text>
              <Text style={{ fontSize: 8 }}>{String(fold.additionalInfo)}</Text>
            </View>
          ) : null}
        </View>

        {/* TAG DETAILS — con imágenes de tipos */}
        <Text style={styles.sectionTitle}>TAG DETAILS</Text>
        <View style={styles.tableRow}>
          <TableCell label="TAG TYPE" value={resolveTagTypeLabel(tag.tagType)} />
          <TableCell label="TAG THICKNESS" value="" isLast />
        </View>
        <View style={styles.imageOptionRow}>
          {TAG_TYPE_OPTIONS.map(opt => {
            const selected = tag.tagType === opt.id
            return (
              <View key={opt.id} style={[styles.imageOptionItem, ...(selected ? [styles.imageOptionItemSelected] : [])]}>
                {opt.imageSrc ? (
                  <Image src={getWorkOrderFormImageUrl(opt.imageSrc.replace(/^\/work-order-form\//, ''))} style={styles.imageOptionImg} />
                ) : null}
                <Text style={styles.imageOptionLabel}>{opt.label}{selected ? ' ✓' : ''}</Text>
              </View>
            )
          })}
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>TAG THICKNESS</Text>
          <CheckboxCell label="0mm" checked={!!(tag.tagThickness as Record<string, boolean>)?.['0mm']} />
          <CheckboxCell label="1.6mm" checked={!!(tag.tagThickness as Record<string, boolean>)?.['1.6mm']} />
          <CheckboxCell label="3mm" checked={!!(tag.tagThickness as Record<string, boolean>)?.['3mm']} />
        </View>
        {tag.additionalInfo ? (
          <View style={styles.tableRow}>
            <TableCell label="ADDITIONAL INFO" value={String(tag.additionalInfo)} isLast />
          </View>
        ) : null}

        {/* STIFFENER DETAILS — con imágenes de tipos */}
        <Text style={styles.sectionTitle}>STIFFENER DETAILS</Text>
        <View style={styles.tableRow}>
          <TableCell label="STIFFENER TYPE" value={resolveStiffenerLabels(stiffener.stiffenerTypes)} />
          <TableCell label="ANGLE SIZE" value={String(stiffener.angleSize ?? '')} isLast />
        </View>
        <View style={styles.imageOptionRow}>
          {STIFFENER_TYPE_OPTIONS.map(opt => {
            const selected = !!(stiffener.stiffenerTypes as Record<string, boolean>)?.[opt.id]
            return (
              <View key={opt.id} style={[styles.imageOptionItem, ...(selected ? [styles.imageOptionItemSelected] : [])]}>
                {opt.imageSrc ? (
                  <Image src={getWorkOrderFormImageUrl(opt.imageSrc.replace(/^\/work-order-form\//, ''))} style={styles.imageOptionImg} />
                ) : null}
                <Text style={styles.imageOptionLabel}>{opt.label}{selected ? ' ✓' : ''}</Text>
              </View>
            )
          })}
        </View>
        {stiffener.additionalInfo ? (
          <View style={styles.tableRow}>
            <TableCell label="ADDITIONAL INFO" value={String(stiffener.additionalInfo)} isLast />
          </View>
        ) : null}

        {/* DELIVERY DETAILS */}
        <Text style={styles.sectionTitle}>DELIVERY DETAILS</Text>
        <View style={styles.checkboxRow}>
          <CheckboxCell label="BIG TRUCK" checked={!!delivery.bigTruck} />
          <CheckboxCell label="SMALL TRUCK" checked={!!delivery.smallTruck} />
          <CheckboxCell label="UTE" checked={!!delivery.ute} />
          <CheckboxCell label="PALLET" checked={!!delivery.pallet} />
          <CheckboxCell label="A-FRAME" checked={!!delivery.aFrame} />
          <CheckboxCell label="OTHER" checked={!!delivery.other} />
        </View>
        {delivery.additionalInfo ? (
          <View style={styles.tableRow}>
            <TableCell label="ADDITIONAL INFO" value={String(delivery.additionalInfo)} isLast />
          </View>
        ) : null}

        <View style={styles.footerSeparator} />
        <View style={styles.footerNote}>
          <Text>Specification: {spec.Panel ?? ''}  |  Project: {spec['Project']}</Text>
        </View>
      </Page>
    </Document>
  )
}
