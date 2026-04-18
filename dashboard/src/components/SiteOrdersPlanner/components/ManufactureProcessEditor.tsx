import type { ManufactureStepDraft } from '../types'

const STAGE_KEY_OPTIONS = [
  'Bandsaw Machine',
  'Drill',
  'Sand',
  'Weld',
  'Pack',
  'Deliver'
]

interface ManufactureProcessEditorProps {
  steps: ManufactureStepDraft[]
  fieldErrors: Record<string, string>
  onAddStep: () => void
  onRemoveStep: (id: string) => void
  onMoveStep: (id: string, direction: 'up' | 'down') => void
  onChangeStep: (id: string, field: keyof ManufactureStepDraft, value: string) => void
}

function getFieldError(fieldErrors: Record<string, string>, stepId: string, field: string): string | undefined {
  return fieldErrors[`step-${stepId}-${field}`]
}

export default function ManufactureProcessEditor({
  steps,
  fieldErrors,
  onAddStep,
  onRemoveStep,
  onMoveStep,
  onChangeStep
}: ManufactureProcessEditorProps) {
  return (
    <section className="sop-card">
      <div className="sop-card-header sop-cutting-list-header card-section-header">
        <h2 className="card-section-title sop-cutting-list-title">Manufacture Process Editor</h2>
        <button type="button" className="sop-btn-secondary sop-cutting-list-add-btn" onClick={onAddStep}>
          + Add step
        </button>
      </div>
      <div className="sop-card-body">
        {steps.length === 0 ? (
          <p className="sop-empty-hint">No manufacture steps yet. Use &quot;+ Add step&quot; to add rows (same layout as the PDF).</p>
        ) : (
          <div className="sop-mfg-table-wrap">
            <table className="sop-mfg-table" aria-label="Manufacture process (aligned with PDF columns)">
              <colgroup>
                <col className="sop-mfg-col-num" />
                <col className="sop-mfg-col-stage" />
                <col className="sop-mfg-col-instr" />
                <col className="sop-mfg-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="sop-mfg-th sop-mfg-th--num">
                    Step no.
                  </th>
                  <th scope="col" className="sop-mfg-th sop-mfg-th--stage">
                    Stage
                  </th>
                  <th scope="col" className="sop-mfg-th sop-mfg-th--instr">
                    Instruction
                  </th>
                  <th scope="col" className="sop-mfg-th sop-mfg-th--actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => (
                  <tr key={step.id}>
                    <td className="sop-mfg-td sop-mfg-td--num">
                      <label className="sop-mfg-cell-label">
                        <span className="sop-mfg-sr-only">Step no.</span>
                        <input
                          className="sop-mfg-input"
                          value={step.step_no}
                          onChange={(e) => onChangeStep(step.id, 'step_no', e.target.value)}
                          inputMode="numeric"
                        />
                      </label>
                      {getFieldError(fieldErrors, step.id, 'step_no') ? (
                        <small className="sop-error-text sop-mfg-cell-error">{getFieldError(fieldErrors, step.id, 'step_no')}</small>
                      ) : null}
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--stage">
                      <label className="sop-mfg-cell-label">
                        <span className="sop-mfg-sr-only">Stage</span>
                        <input
                          className="sop-mfg-input"
                          list="sop-stage-key-options"
                          value={step.stage_key}
                          onChange={(e) => onChangeStep(step.id, 'stage_key', e.target.value)}
                          placeholder="e.g. Weld"
                        />
                      </label>
                      {getFieldError(fieldErrors, step.id, 'stage_key') ? (
                        <small className="sop-error-text sop-mfg-cell-error">{getFieldError(fieldErrors, step.id, 'stage_key')}</small>
                      ) : null}
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr">
                      <label className="sop-mfg-cell-label">
                        <span className="sop-mfg-sr-only">Instruction</span>
                        <input
                          className="sop-mfg-input"
                          value={step.comment}
                          onChange={(e) => onChangeStep(step.id, 'comment', e.target.value)}
                          placeholder="Detail"
                        />
                      </label>
                      {getFieldError(fieldErrors, step.id, 'comment') ? (
                        <small className="sop-error-text sop-mfg-cell-error">{getFieldError(fieldErrors, step.id, 'comment')}</small>
                      ) : null}
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--actions">
                      <div className="sop-mfg-row-actions">
                        <button
                          type="button"
                          className="sop-btn-icon"
                          title="Move up"
                          onClick={() => onMoveStep(step.id, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="sop-btn-icon"
                          title="Move down"
                          onClick={() => onMoveStep(step.id, 'down')}
                          disabled={index === steps.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="sop-btn-danger sop-mfg-btn-remove"
                          onClick={() => onRemoveStep(step.id)}
                          title="Remove step"
                          aria-label="Remove step"
                        >
                          <span className="material-icons" aria-hidden>
                            delete_outline
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <datalist id="sop-stage-key-options">
          {STAGE_KEY_OPTIONS.map(option => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
    </section>
  )
}
