import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer'
import type { MaterialPdfDeliveryMeta } from '../../types/supabase'
import { getAssetPath } from '../../utils/assetUtils'

export interface MaterialOrderCuttingLinePdf {
  description: string
  thickness: string
  size_length: string
  uom: string
  qty: string | number
  unit: string
}

export interface MaterialOrderManufactureStepPdf {
  step_no: number | string
  stage_key: string
  comment: string
}

/** Tamaños de fuente base (pt). La página usa `fontSize` como default para Text sin estilo propio. */
const FONT = {
  page: 12,
  mainTitle: 21,
  section: 13,
  cellLabel: 11,
  cell: 12,
  check: 12,
  checkMark: 9,
  cuttingHead: 9,
  cuttingCell: 11,
  manufactureNum: 11,
  manufacture: 12,
  sketchPh: 11,
  footer: 11
} as const

/**
 * Layout por imagen en la rejilla (react-pdf):
 * - `width` % del contenedor `sketchGrid` (padding ya descontado del flujo flex).
 * - `imgMaxH` acota la altura del `<Image>`; `objectFit: contain` mantiene proporción dentro del rectángulo.
 * - Reglas: 1 → casi ancho completo y mucha altura; 2 → dos columnas grandes; 3 → tres en fila;
 *   4 → 2×2; 5+ → tres columnas (más filas).
 */
function getSketchItemStyle(index: number, total: number): {
  width: string
  minHeight: number
  imgMaxH: number
  marginRight: number
} {
  if (total === 1) {
    return { width: '100%', minHeight: 260, imgMaxH: 248, marginRight: 0 }
  }
  if (total === 2) {
    return {
      width: '48%',
      minHeight: 200,
      imgMaxH: 188,
      marginRight: index % 2 === 1 ? 0 : 8
    }
  }
  if (total === 3) {
    return {
      width: '31%',
      minHeight: 140,
      imgMaxH: 128,
      marginRight: index % 3 === 2 ? 0 : 4
    }
  }
  if (total === 4) {
    return {
      width: '48%',
      minHeight: 168,
      imgMaxH: 156,
      marginRight: index % 2 === 1 ? 0 : 8
    }
  }
  return {
    width: '31%',
    minHeight: 120,
    imgMaxH: 108,
    marginRight: index % 3 === 2 ? 0 : 4
  }
}

export interface WorkMaterialOrderPdfDocumentProps {
  /** AppSheet order Number (visible on PDF). */
  orderNumber: string
  /** If Number is empty, shown in title as fallback. */
  orderIdFallback?: string
  project: string
  deliveryDate: string
  projectAddress: string
  projectManager: string
  projectDescription: string
  area: string
  partialTransfer: boolean
  totalQty: string | number
  delivery: MaterialPdfDeliveryMeta
  cuttingLines: MaterialOrderCuttingLinePdf[]
  manufactureSteps: MaterialOrderManufactureStepPdf[]
  sketchImageUrls: string[]
  logoUrl?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 13,
    fontSize: FONT.page,
    fontFamily: 'Helvetica',
    backgroundColor: '#fff'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#000',
    padding: 5,
    backgroundColor: '#f3f4f6'
  },
  logoWrap: {
    width: 30,
    height: 30,
    flexShrink: 0
  },
  logo: {
    width: 30,
    height: 30
  },
  mainTitle: {
    fontSize: FONT.mainTitle,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    flex: 1
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 22
  },
  tableCell: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableCellLast: {
    flex: 1,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cellLabel: {
    fontSize: FONT.cellLabel,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginRight: 3
  },
  cellValue: {
    fontSize: FONT.cell,
    flex: 1,
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: FONT.section,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    backgroundColor: '#f3f4f6',
    padding: 4,
    marginTop: 2,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#000',
    textAlign: 'center'
  },
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 21,
    justifyContent: 'center'
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 0.5
  },
  checkbox: {
    width: 10,
    height: 10,
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
    fontSize: FONT.checkMark,
    fontWeight: 'bold',
    color: '#fff'
  },
  checkLabel: {
    fontSize: FONT.check
  },
  manufactureTable: {
    marginTop: 0,
    marginBottom: 0
  },
  /** Cutting list: columnas alineadas con encabezado */
  cuttingTable: {
    marginTop: 0,
    marginBottom: 0
  },
  cuttingRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 21,
    alignItems: 'stretch'
  },
  cuttingHeaderRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 23,
    alignItems: 'stretch',
    backgroundColor: '#e5e7eb'
  },
  cuttingCellBase: {
    flexDirection: 'column',
    borderRightWidth: 1,
    borderColor: '#000',
    padding: 4,
    justifyContent: 'center',
    /** Stretch so inner Text can use width 100% and textAlign centers in the cell */
    alignItems: 'stretch'
  },
  cuttingIdx: {
    width: 22,
    backgroundColor: '#f9fafb'
  },
  cuttingDesc: {
    flex: 2.2,
    minWidth: 56,
    flexGrow: 2
  },
  cuttingThick: {
    width: 42
  },
  cuttingSize: {
    flex: 1,
    minWidth: 48,
    flexGrow: 1
  },
  cuttingUom: {
    width: 32
  },
  cuttingQty: {
    width: 36
  },
  cuttingUnit: {
    width: 36,
    borderRightWidth: 0
  },
  cuttingHeaderText: {
    fontSize: FONT.cuttingHead,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    width: '100%'
  },
  cuttingCellText: {
    fontSize: FONT.cuttingCell,
    textAlign: 'center',
    width: '100%'
  },
  cuttingCellTextDesc: {
    fontSize: FONT.cuttingCell,
    textAlign: 'left',
    width: '100%'
  },
  manufactureRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 19,
    alignItems: 'center'
  },
  manufactureNumCell: {
    width: 20,
    borderRightWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb'
  },
  manufactureNumText: {
    fontSize: FONT.manufactureNum,
    fontWeight: 'bold'
  },
  manufactureTextCell: {
    flex: 1,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  manufactureText: {
    fontSize: FONT.manufacture,
    textAlign: 'center'
  },
  sketchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#000',
    padding: 5
  },
  sketchItem: {
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3
  },
  sketchImg: {
    maxWidth: '100%',
    objectFit: 'contain' as unknown as undefined
  },
  sketchPlaceholder: {
    fontSize: FONT.sketchPh,
    color: '#999',
    textAlign: 'center'
  },
  footerSeparator: {
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    marginTop: 6,
    marginBottom: 3
  },
  footerNote: {
    fontSize: FONT.footer,
    color: '#666',
    textAlign: 'center'
  }
})

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

function CuttingListHeaderRow() {
  return (
    <View style={styles.cuttingHeaderRow} wrap={false}>
      <View style={[styles.cuttingCellBase, styles.cuttingIdx]}>
        <Text style={styles.cuttingHeaderText}>#</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingDesc]}>
        <Text style={styles.cuttingHeaderText}>DESCRIPTION</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingThick]}>
        <Text style={styles.cuttingHeaderText}>THICKNESS</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingSize]}>
        <Text style={styles.cuttingHeaderText}>SIZES/LENGTHS</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingUom]}>
        <Text style={styles.cuttingHeaderText}>UoM</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingQty]}>
        <Text style={styles.cuttingHeaderText}>QTY</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingUnit]}>
        <Text style={styles.cuttingHeaderText}>UNIT</Text>
      </View>
    </View>
  )
}

function CuttingLineDataRow({ line, index }: { line: MaterialOrderCuttingLinePdf; index: number }) {
  const t = line.thickness?.trim() || '—'
  const desc = line.description?.trim() || '—'
  const size = line.size_length?.trim() || '—'
  const uom = line.uom?.trim() || '—'
  const qty = line.qty === '' || line.qty === undefined ? '—' : String(line.qty)
  const unit = line.unit?.trim() || '—'
  return (
    <View style={styles.cuttingRow} wrap={false}>
      <View style={[styles.cuttingCellBase, styles.cuttingIdx]}>
        <Text style={styles.cuttingCellText}>{index + 1}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingDesc, { alignItems: 'flex-start' }]}>
        <Text style={styles.cuttingCellTextDesc}>{desc}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingThick]}>
        <Text style={styles.cuttingCellText}>{t}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingSize, { alignItems: 'flex-start' }]}>
        <Text style={styles.cuttingCellTextDesc}>{size}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingUom]}>
        <Text style={styles.cuttingCellText}>{uom}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingQty]}>
        <Text style={styles.cuttingCellText}>{qty}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingUnit]}>
        <Text style={styles.cuttingCellText}>{unit}</Text>
      </View>
    </View>
  )
}

function CuttingListEmptyRow() {
  const dash = '—'
  return (
    <View style={styles.cuttingRow} wrap={false}>
      <View style={[styles.cuttingCellBase, styles.cuttingIdx]}>
        <Text style={styles.cuttingCellText}>{dash}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingDesc]}>
        <Text style={styles.cuttingCellText}>{dash}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingThick]}>
        <Text style={styles.cuttingCellText}>{dash}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingSize]}>
        <Text style={styles.cuttingCellText}>{dash}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingUom]}>
        <Text style={styles.cuttingCellText}>{dash}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingQty]}>
        <Text style={styles.cuttingCellText}>{dash}</Text>
      </View>
      <View style={[styles.cuttingCellBase, styles.cuttingUnit]}>
        <Text style={styles.cuttingCellText}>{dash}</Text>
      </View>
    </View>
  )
}

export default function WorkMaterialOrderPdfDocument({
  orderNumber,
  orderIdFallback = '',
  project,
  deliveryDate,
  projectAddress,
  projectManager,
  projectDescription,
  area,
  partialTransfer,
  totalQty,
  delivery,
  cuttingLines,
  manufactureSteps,
  sketchImageUrls,
  logoUrl
}: WorkMaterialOrderPdfDocumentProps) {
  const displayOrder = orderNumber.trim() || orderIdFallback.trim() || ''
  const titleOrder = orderNumber.trim() || orderIdFallback.trim() || ''

  const sortedSteps = [...manufactureSteps].sort(
    (a, b) => Number(a.step_no) - Number(b.step_no)
  )

  const faviconUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${getAssetPath('favicon.png')}`
    : logoUrl ?? ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.logoWrap}>
            {faviconUrl ? <Image src={faviconUrl} style={styles.logo} /> : null}
          </View>
          <Text style={styles.mainTitle}>WORK MATERIAL ORDER - {titleOrder}</Text>
          <View style={styles.logoWrap}>
            {faviconUrl ? <Image src={faviconUrl} style={styles.logo} /> : null}
          </View>
        </View>

        <View style={styles.tableRow}>
          <TableCell label="PROJECT" value={project} />
          <TableCell label="DELIVERY DATE" value={deliveryDate} isLast />
        </View>

        <View style={styles.tableRow}>
          <TableCell label="PROJECT ADDRESS" value={projectAddress} />
          <TableCell label="PROJECT MANAGER" value={projectManager} isLast />
        </View>

        <View style={styles.tableRow}>
          <TableCell label="PROJECT DESCRIPTION" value={projectDescription} isLast />
        </View>

        <Text style={styles.sectionTitle}>ORDER DETAILS</Text>
        <View style={styles.tableRow}>
          <TableCell label="ORDER NUMBER" value={displayOrder} />
          <TableCell label="TOTAL QTY" value={String(totalQty)} isLast />
        </View>
        <View style={styles.tableRow}>
          <TableCell label="AREA" value={area} />
          <TableCell label="PARTIAL TRANSFER" value={partialTransfer ? 'YES' : 'NO'} isLast />
        </View>

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

        <Text style={styles.sectionTitle}>CUTTING LIST</Text>
        <View style={styles.cuttingTable}>
          <CuttingListHeaderRow />
          {cuttingLines.length === 0 ? (
            <CuttingListEmptyRow />
          ) : (
            cuttingLines.map((line, i) => <CuttingLineDataRow key={i} line={line} index={i} />)
          )}
        </View>

        <Text style={styles.sectionTitle}>MANUFACTURE PROCESS</Text>
        <View style={styles.manufactureTable}>
          {sortedSteps.length === 0 ? (
            <View style={styles.manufactureRow}>
              <View style={styles.manufactureTextCell}>
                <Text style={styles.manufactureText}>—</Text>
              </View>
            </View>
          ) : (
            sortedSteps.map((step, i) => {
              const text = `${step.stage_key}${step.comment ? ` - ${step.comment}` : ''}`
              return (
                <View key={i} style={styles.manufactureRow} wrap={false}>
                  <View style={styles.manufactureNumCell}>
                    <Text style={styles.manufactureNumText}>{step.step_no}</Text>
                  </View>
                  <View style={styles.manufactureTextCell}>
                    <Text style={styles.manufactureText}>{text}</Text>
                  </View>
                </View>
              )
            })
          )}
        </View>

        <Text style={styles.sectionTitle}>DRAWING / SKETCH</Text>
        <View style={styles.sketchGrid}>
          {sketchImageUrls.length === 0 ? (
            <Text style={styles.sketchPlaceholder}>No images attached (session preview).</Text>
          ) : (
            sketchImageUrls.map((src, i) => {
              const sk = getSketchItemStyle(i, sketchImageUrls.length)
              return (
                <View
                  key={i}
                  style={[
                    styles.sketchItem,
                    {
                      width: sk.width,
                      minHeight: sk.minHeight,
                      marginRight: sk.marginRight
                    }
                  ]}
                >
                  <Image src={src} style={[styles.sketchImg, { maxHeight: sk.imgMaxH }]} />
                </View>
              )
            })
          )}
        </View>

        <View style={styles.footerSeparator} />
        <View style={styles.footerNote}>
          <Text>Material order plan  |  Project: {project}</Text>
        </View>
      </Page>
    </Document>
  )
}
