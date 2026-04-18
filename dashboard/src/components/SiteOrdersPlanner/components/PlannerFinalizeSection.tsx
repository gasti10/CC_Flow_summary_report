import type { RefObject } from 'react'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import type { MaterialPdfDeliveryMeta, MaterialPdfMeta } from '../../../types/supabase'
import { emptyMaterialDelivery } from '../materialPdfMeta'
import WorkMaterialOrderPdfDocument, { type WorkMaterialOrderPdfDocumentProps } from '../WorkMaterialOrderPdfDocument'
import { getAssetPath } from '../../../utils/assetUtils'
import type { OrderCutPdfOption } from '../types'

interface PlannerFinalizeSectionProps {
  materialPdfMeta: MaterialPdfMeta
  onMaterialPdfMetaChange: (next: MaterialPdfMeta) => void
  sketchEntries: Array<{ id: string; url: string }>
  onAddSketchFiles: (files: FileList | null) => void
  onRemoveSketch: (id: string) => void
  selectedProject: string
  orderLabel: string
  /** Orders cut con status distinto de Delivered (más el seleccionado si hiciera falta). */
  pdfUploadOrderOptions: OrderCutPdfOption[]
  isLoadingOrderCuts: boolean
  pdfUploadOrderId: string
  onPdfUploadOrderIdChange: (orderId: string) => void
  blockingErrors: string[]
  warnings: string[]
  isSaving: boolean
  saveAndUploadDone: boolean
  saveFeedback: { type: 'success' | 'error'; message: string } | null
  finalizeBottomRef: RefObject<HTMLDivElement | null>
  onBackToHub: () => void
  onSave: () => void
  /** Props for the live PDF (same object used for preview and download). */
  pdfDocumentProps: WorkMaterialOrderPdfDocumentProps
  /** Used in downloaded filename when order number is empty. */
  planIdFallbackForFilename: string
  showPdfPreview: boolean
  onTogglePdfPreview: () => void
}

export default function PlannerFinalizeSection({
  materialPdfMeta,
  onMaterialPdfMetaChange,
  sketchEntries,
  onAddSketchFiles,
  onRemoveSketch,
  selectedProject,
  orderLabel,
  pdfUploadOrderOptions,
  isLoadingOrderCuts,
  pdfUploadOrderId,
  onPdfUploadOrderIdChange,
  blockingErrors,
  warnings,
  isSaving,
  saveAndUploadDone,
  saveFeedback,
  finalizeBottomRef,
  onBackToHub,
  onSave,
  pdfDocumentProps,
  planIdFallbackForFilename,
  showPdfPreview,
  onTogglePdfPreview
}: PlannerFinalizeSectionProps) {
  const d = materialPdfMeta.delivery ?? emptyMaterialDelivery()
  const canSave = blockingErrors.length === 0 && !isSaving && !saveAndUploadDone

  const patchDelivery = (patch: Partial<MaterialPdfDeliveryMeta>) => {
    onMaterialPdfMetaChange({
      ...materialPdfMeta,
      delivery: { ...d, ...patch }
    })
  }

  const downloadPdf = async () => {
    const logoUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${getAssetPath('favicon.png')}` : undefined
    const doc = <WorkMaterialOrderPdfDocument {...pdfDocumentProps} logoUrl={logoUrl} />
    const blob = await pdf(doc).toBlob()
    const a = document.createElement('a')
    const name = orderLabel.trim() || planIdFallbackForFilename.slice(0, 8)
    a.href = URL.createObjectURL(blob)
    a.download = `Material_Order_${name}.pdf`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="sop-card sop-finalize-card">
      <div className="sop-card-header sop-finalize-header card-section-header">
        <div className="sop-finalize-header-text">
          <h2 className="card-section-title sop-finalize-title">Review &amp; save</h2>
          <p className="sop-finalize-lead">
            Complete the PDF fields, preview the material order PDF, then save the plan and upload the PDF to AppSheet
            (project folder in Drive).
          </p>
        </div>
      </div>

      <div className="sop-card-body sop-finalize-body">
        <div className="sop-finalize-summary" aria-label="Plan summary">
          <div className="sop-finalize-pill">
            <span className="sop-finalize-pill-label">Project</span>
            <span className="sop-finalize-pill-value">{selectedProject.trim() || '—'}</span>
          </div>
          <div className="sop-finalize-pill">
            <span className="sop-finalize-pill-label">Order no.</span>
            <span className="sop-finalize-pill-value">{orderLabel.trim() || '—'}</span>
          </div>
        </div>

        <div className="sop-finalize-panel">
          <h3 className="sop-finalize-subheading">PDF — order details</h3>
          <p className="sop-finalize-hint">
            These values appear in the exported PDF. Delivery date defaults from the order (or today) and can be changed.
          </p>
          <div className="sop-finalize-grid-3">
            <label className="sop-field">
              <span>Area</span>
              <input
                value={materialPdfMeta.area ?? ''}
                onChange={(e) => onMaterialPdfMetaChange({ ...materialPdfMeta, area: e.target.value })}
                placeholder="e.g. m² or scope reference"
                disabled={saveAndUploadDone}
              />
            </label>
            <label className="sop-field">
              <span>Delivery date</span>
              <input
                type="date"
                value={materialPdfMeta.delivery_date ?? ''}
                onChange={(e) =>
                  onMaterialPdfMetaChange({ ...materialPdfMeta, delivery_date: e.target.value })
                }
                disabled={saveAndUploadDone}
              />
            </label>
            <div className="sop-field sop-finalize-toggle-field">
              <span>Partial transfer</span>
              <label className="sop-finalize-switch">
                <input
                  type="checkbox"
                  checked={!!materialPdfMeta.partial_transfer}
                  disabled={saveAndUploadDone}
                  onChange={(e) =>
                    onMaterialPdfMetaChange({ ...materialPdfMeta, partial_transfer: e.target.checked })
                  }
                />
                <span className="sop-finalize-switch-label">
                  {materialPdfMeta.partial_transfer ? 'Yes' : 'No'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="sop-finalize-panel">
          <h3 className="sop-finalize-subheading">PDF — delivery</h3>
          <p className="sop-finalize-hint">Select how material should arrive on site (shown on the PDF).</p>
          <div className="sop-finalize-delivery-grid">
            {(
              [
                ['bigTruck', 'Big truck'],
                ['smallTruck', 'Small truck'],
                ['ute', 'Ute'],
                ['pallet', 'Pallet'],
                ['aFrame', 'A-frame'],
                ['other', 'Other']
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="sop-finalize-check-card">
                <input
                  type="checkbox"
                  checked={!!d[key]}
                  disabled={saveAndUploadDone}
                  onChange={(e) => patchDelivery({ [key]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <label className="sop-field sop-field-grow sop-finalize-field-tight">
            <span>Delivery — additional instructions</span>
            <textarea
              rows={2}
              value={d.additionalInfo ?? ''}
              disabled={saveAndUploadDone}
              onChange={(e) => patchDelivery({ additionalInfo: e.target.value })}
              placeholder="Access, crane, time windows…"
            />
          </label>
        </div>

        <div className="sop-finalize-panel sop-finalize-panel--sketch">
          <h3 className="sop-finalize-subheading">PDF — drawings / sketches</h3>
          <p className="sop-finalize-hint">
            Optional images for this export only (not stored). Use for mark-ups or reference photos.
          </p>
          <label className="sop-finalize-file-trigger">
            <span className="sop-btn-secondary">Choose images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sop-finalize-file-input"
              disabled={saveAndUploadDone}
              onChange={(e) => {
                onAddSketchFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          {sketchEntries.length > 0 ? (
            <ul className="sop-sketch-list sop-sketch-list--finalize">
              {sketchEntries.map(entry => (
                <li key={entry.id}>
                  <span className="sop-sketch-thumb-wrap">
                    <img src={entry.url} alt="" className="sop-sketch-thumb" />
                  </span>
                  <button
                    type="button"
                    className="sop-btn-secondary sop-btn-sm"
                    disabled={saveAndUploadDone}
                    onClick={() => onRemoveSketch(entry.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sop-finalize-empty-sketch">No images attached.</p>
          )}
        </div>

        {blockingErrors.length > 0 ? (
          <div className="sop-alert sop-alert-error" role="alert">
            <p>Fix the following before saving:</p>
            <ul>
              {blockingErrors.map(err => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="sop-alert sop-alert-warning">
            <p>Warnings</p>
            <ul>
              {warnings.map(warn => (
                <li key={warn}>{warn}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="sop-finalize-preview">
          <div className="sop-finalize-preview-toolbar">
            <div className="sop-finalize-preview-toolbar-text">
              <h3 className="sop-finalize-subheading sop-finalize-subheading--inline">PDF preview</h3>
              <p className="sop-finalize-hint sop-finalize-hint--tight">
                Matches the downloadable material order PDF.
              </p>
            </div>
            <div className="sop-pdf-preview-actions">
              <button type="button" className="wod-btn-secondary wod-btn-sm" onClick={() => void downloadPdf()}>
                Download PDF
              </button>
              <button type="button" className="wod-btn-secondary wod-btn-sm" onClick={onTogglePdfPreview}>
                {showPdfPreview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
          </div>
          {showPdfPreview ? (
            <div className="wod-pdf-viewer-wrap">
              <PDFViewer width="100%" height={842}>
                <WorkMaterialOrderPdfDocument {...pdfDocumentProps} />
              </PDFViewer>
            </div>
          ) : null}
        </div>

        <div className="sop-finalize-panel sop-finalize-panel--upload-target">
          <h3 className="sop-finalize-subheading">Save &amp; upload — CC Flow</h3>
          <p className="sop-finalize-hint">
            The PDF is stored under the project <strong>{selectedProject.trim() || '—'}</strong> in Documents. Optionally
            link the uploaded PDF to a <strong>Panel Order</strong>; leave as “No order” to keep only the project path.
          </p>
          <label className="sop-field sop-finalize-order-cut-field">
            <span>Panel Order - Optional</span>
            <select
              value={pdfUploadOrderId}
              onChange={(e) => onPdfUploadOrderIdChange(e.target.value)}
              disabled={
                saveAndUploadDone || (!isLoadingOrderCuts && pdfUploadOrderOptions.length === 0)
              }
            >
              <option value="">— No order (project only) —</option>
              {pdfUploadOrderOptions.map(o => (
                <option key={o['Order ID']} value={o['Order ID']}>
                  {o.displayLabel}
                </option>
              ))}
            </select>
          </label>
          {pdfUploadOrderOptions.length === 0 && selectedProject.trim() && !isLoadingOrderCuts ? (
            <p className="sop-finalize-hint sop-finalize-hint--tight">
              No Panel Orders not delivered for this project — PDF upload uses project folder only.
            </p>
          ) : null}
        </div>

        <div className="sop-finalize-save">
          <button
            type="button"
            className="sop-btn-primary sop-finalize-save-btn"
            onClick={onSave}
            disabled={!canSave}
          >
            {isSaving ? 'Saving & uploading…' : 'Save & Upload PDF'}
          </button>
          {!canSave && blockingErrors.length > 0 ? (
            <p className="sop-finalize-save-hint">Resolve validation errors above to enable save.</p>
          ) : null}
        </div>

        <div ref={finalizeBottomRef} className="sop-finalize-bottom-anchor">
          {saveFeedback ? (
            <div
              className={`sop-banner ${saveFeedback.type === 'error' ? 'sop-banner-error' : 'sop-banner-success'} sop-finalize-bottom-banner`}
              role={saveFeedback.type === 'error' ? 'alert' : 'status'}
            >
              {saveFeedback.message}
            </div>
          ) : null}
          {saveAndUploadDone ? (
            <div className="sop-finalize-back-row">
              <button type="button" className="sop-btn-secondary sop-finalize-back-btn" onClick={onBackToHub}>
                ← Back to Site Orders
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
