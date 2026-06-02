import { useMemo, useRef, useState } from 'react'
import { dailyPreStartTrees } from './schema/dailyPreStartTrees'
import PreStartTreeSelectModal from './PreStartTreeSelectModal'

type TreeKey = keyof typeof dailyPreStartTrees

interface PreStartTreeSelectFieldProps {
  fieldId: string
  treeKey: TreeKey
  selectedIds: string[]
  suggestedIds?: Set<string>
  isActive?: boolean
  isIncompleteHighlight?: boolean
  isOptional?: boolean
  onChange: (nextIds: string[]) => void
  onAnswered?: () => void
  onOptionalAdvance?: () => void
}

function resolveSelectedLabels(treeKey: TreeKey, selectedIds: string[]): string[] {
  const tree = dailyPreStartTrees[treeKey]
  const labels: string[] = []
  for (const category of tree.categories) {
    for (const item of category.items) {
      if (selectedIds.includes(item.id)) labels.push(item.title)
    }
  }
  return labels
}

export default function PreStartTreeSelectField({
  fieldId,
  treeKey,
  selectedIds,
  suggestedIds,
  isActive = false,
  isIncompleteHighlight = false,
  isOptional = false,
  onChange,
  onAnswered,
  onOptionalAdvance
}: PreStartTreeSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  openRef.current = open
  const tree = dailyPreStartTrees[treeKey]
  const selectedLabels = useMemo(
    () => resolveSelectedLabels(treeKey, selectedIds),
    [treeKey, selectedIds]
  )

  return (
    <>
      <div
        id={`prestart-field-${fieldId}`}
        className={`safety-prestart-tree-row${isActive ? ' is-active-field' : ''}${selectedLabels.length > 0 ? ' is-answered' : ''}${isIncompleteHighlight ? ' is-incomplete-pulse' : ''}`}
      >
        <div className="safety-prestart-tree-row-head">
          <div className="safety-prestart-tree-action">
            <span className="safety-prestart-tree-label">
              {tree.name}
            </span>
            <button
              type="button"
              id={fieldId}
              className="safety-btn-secondary safety-prestart-tree-select-btn"
              onClick={() => setOpen(true)}
              onBlur={() => {
                if (!isOptional || selectedIds.length > 0) return
                window.setTimeout(() => {
                  if (openRef.current) return
                  onOptionalAdvance?.()
                }, 0)
              }}
            >
              <span className="material-icons" aria-hidden>checklist</span>
              Select multiple
            </button>
          </div>
        </div>
        {selectedLabels.length > 0 ? (
          <p className="safety-prestart-tree-summary">
            {selectedLabels.length} selected · {selectedLabels.slice(0, 2).join(', ')}
            {selectedLabels.length > 2 ? '…' : ''}
          </p>
        ) : (
          <p className="safety-prestart-tree-summary">Tap to select options</p>
        )}
      </div>

      {open ? (
        <PreStartTreeSelectModal
          title={tree.name}
          treeKey={treeKey}
          selectedIds={selectedIds}
          suggestedIds={suggestedIds}
          onClose={() => {
            setOpen(false)
            if (isOptional && selectedIds.length === 0) onOptionalAdvance?.()
          }}
          onSave={(nextIds) => {
            onChange(nextIds)
            setOpen(false)
            if (nextIds.length > 0) onAnswered?.()
          }}
        />
      ) : null}
    </>
  )
}
