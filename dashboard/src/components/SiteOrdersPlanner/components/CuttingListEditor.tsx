import type { CuttingLineDraft } from '../types'

interface CuttingListEditorProps {
  rows: CuttingLineDraft[]
  fieldErrors: Record<string, string>
  onAddRow: () => void
  onRemoveRow: (id: string) => void
  onDuplicateRow: (id: string) => void
  onChangeRow: (id: string, field: keyof CuttingLineDraft, value: string) => void
}

function getFieldError(fieldErrors: Record<string, string>, rowId: string, field: string): string | undefined {
  return fieldErrors[`cutting-${rowId}-${field}`]
}

export default function CuttingListEditor({
  rows,
  fieldErrors,
  onAddRow,
  onRemoveRow,
  onDuplicateRow,
  onChangeRow
}: CuttingListEditorProps) {
  return (
    <section className="sop-card">
      <div className="sop-card-header sop-cutting-list-header card-section-header">
        <h2 className="card-section-title sop-cutting-list-title">Cutting List Editor</h2>
        <button type="button" className="sop-btn-secondary sop-cutting-list-add-btn" onClick={onAddRow}>
          + Add line
        </button>
      </div>
      <div className="sop-card-body">
        <div className="sop-table-wrap">
          <table className="sop-table sop-table-cutting">
            <colgroup>
              <col className="sop-cut-col sop-cut-col--idx" />
              <col className="sop-cut-col sop-cut-col--desc" />
              <col className="sop-cut-col sop-cut-col--thick" />
              <col className="sop-cut-col sop-cut-col--size" />
              <col className="sop-cut-col sop-cut-col--uom" />
              <col className="sop-cut-col sop-cut-col--qty" />
              <col className="sop-cut-col sop-cut-col--unit" />
              <col className="sop-cut-col sop-cut-col--actions" />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th className="sop-cutting-col-desc">Description</th>
                <th>Thickness</th>
                <th>Size/Length</th>
                <th>UoM</th>
                <th>Qty</th>
                <th>Unit</th>
                <th className="sop-table-actions-col" aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="sop-empty-cell">No cutting lines yet.</td>
                </tr>
              ) : rows.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td className="sop-cutting-col-desc">
                    <input
                      className="sop-table-input"
                      value={row.description}
                      onChange={(e) => onChangeRow(row.id, 'description', e.target.value)}
                    />
                    {getFieldError(fieldErrors, row.id, 'description') ? <small className="sop-error-text">{getFieldError(fieldErrors, row.id, 'description')}</small> : null}
                  </td>
                  <td>
                    <input
                      className="sop-table-input"
                      value={row.thickness}
                      onChange={(e) => onChangeRow(row.id, 'thickness', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="sop-table-input"
                      value={row.size_length}
                      onChange={(e) => onChangeRow(row.id, 'size_length', e.target.value)}
                    />
                    {getFieldError(fieldErrors, row.id, 'size_length') ? <small className="sop-error-text">{getFieldError(fieldErrors, row.id, 'size_length')}</small> : null}
                  </td>
                  <td>
                    <input
                      className="sop-table-input"
                      value={row.uom}
                      onChange={(e) => onChangeRow(row.id, 'uom', e.target.value)}
                    />
                    {getFieldError(fieldErrors, row.id, 'uom') ? <small className="sop-error-text">{getFieldError(fieldErrors, row.id, 'uom')}</small> : null}
                  </td>
                  <td>
                    <input
                      className="sop-table-input"
                      value={row.qty}
                      onChange={(e) => onChangeRow(row.id, 'qty', e.target.value)}
                    />
                    {getFieldError(fieldErrors, row.id, 'qty') ? <small className="sop-error-text">{getFieldError(fieldErrors, row.id, 'qty')}</small> : null}
                  </td>
                  <td>
                    <input
                      className="sop-table-input"
                      value={row.unit}
                      onChange={(e) => onChangeRow(row.id, 'unit', e.target.value)}
                    />
                    {getFieldError(fieldErrors, row.id, 'unit') ? <small className="sop-error-text">{getFieldError(fieldErrors, row.id, 'unit')}</small> : null}
                  </td>
                  <td className="sop-table-actions-cell">
                    <div className="sop-cutting-row-actions">
                      <button
                        type="button"
                        className="sop-btn-icon sop-icon-btn--muted"
                        onClick={() => onDuplicateRow(row.id)}
                        aria-label="Duplicate row"
                        title="Duplicate row"
                      >
                        <span className="material-icons" aria-hidden>content_copy</span>
                      </button>
                      <button
                        type="button"
                        className="sop-btn-icon sop-btn-icon--danger"
                        onClick={() => onRemoveRow(row.id)}
                        aria-label="Remove row"
                        title="Remove row"
                      >
                        <span className="material-icons" aria-hidden>delete_outline</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
