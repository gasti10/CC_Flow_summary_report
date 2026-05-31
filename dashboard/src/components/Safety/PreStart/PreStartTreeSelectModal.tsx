import { useMemo, useState } from 'react'
import { dailyPreStartTrees } from './schema/dailyPreStartTrees'

type TreeKey = keyof typeof dailyPreStartTrees

interface PreStartTreeSelectModalProps {
  title: string
  treeKey: TreeKey
  selectedIds: string[]
  suggestedIds?: Set<string>
  onClose: () => void
  onSave: (nextIds: string[]) => void
}

export default function PreStartTreeSelectModal({
  title,
  treeKey,
  selectedIds,
  suggestedIds,
  onClose,
  onSave
}: PreStartTreeSelectModalProps) {
  const tree = dailyPreStartTrees[treeKey]
  const [draft, setDraft] = useState<string[]>(selectedIds)
  const [search, setSearch] = useState('')
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set())

  const normalizedSearch = search.trim().toLowerCase()

  const flatItems = useMemo(() => (
    tree.categories.flatMap((category) => (
      category.items.map((item) => ({
        categoryId: category.id,
        categoryTitle: category.title,
        itemId: item.id,
        itemTitle: item.title
      }))
    ))
  ), [tree.categories])

  const filteredItems = useMemo(() => {
    if (!normalizedSearch) return []
    return flatItems.filter((entry) => (
      entry.itemTitle.toLowerCase().includes(normalizedSearch)
      || entry.categoryTitle.toLowerCase().includes(normalizedSearch)
    ))
  }, [flatItems, normalizedSearch])

  function toggleItem(itemId: string) {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return [...next]
    })
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function renderItemRow(itemId: string, itemTitle: string, recommended = false) {
    const checked = draft.includes(itemId)
    return (
      <label
        key={itemId}
        className={`safety-doc-pick-row safety-prestart-tree-modal-item${recommended ? ' is-recommended' : ''}${checked ? ' is-selected' : ''}`}
      >
        <span className="safety-doc-pick-main">
          <span className="safety-doc-pick-titleline">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleItem(itemId)}
            />
            <span className="safety-doc-pick-title">{itemTitle}</span>
          </span>
        </span>
      </label>
    )
  }

  return (
    <div className="safety-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="safety-modal safety-prestart-tree-modal">
        <div className="safety-modal-header">
          <div className="safety-modal-header-copy">
            <h3 className="safety-modal-title">{title}</h3>
          </div>
          <button type="button" className="safety-modal-close" onClick={onClose} aria-label="Close">
            <span className="material-icons" aria-hidden>close</span>
          </button>
        </div>

        <div className="safety-prestart-tree-modal-search-wrap">
          <span className="material-icons safety-prestart-tree-modal-search-icon" aria-hidden>search</span>
          <input
            type="search"
            className="safety-input safety-prestart-tree-modal-search"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="safety-doc-pick-list safety-prestart-tree-modal-list">
          {normalizedSearch ? (
            filteredItems.length === 0 ? (
              <p className="safety-muted safety-prestart-tree-modal-empty">No matches.</p>
            ) : (
              filteredItems.map((entry) => renderItemRow(
                entry.itemId,
                entry.itemTitle,
                suggestedIds?.has(entry.itemId)
              ))
            )
          ) : (
            tree.categories.map((category) => {
              if (category.items.length === 0) return null
              const expanded = expandedCategoryIds.has(category.id)
              const selectedInCategory = category.items.filter((item) => draft.includes(item.id)).length
              return (
                <div key={category.id} className="safety-prestart-tree-modal-group">
                  <button
                    type="button"
                    className={`safety-doc-pick-row safety-prestart-tree-modal-category${expanded ? ' is-selected' : ''}`}
                    aria-expanded={expanded}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span className="safety-doc-pick-main">
                      <span className="safety-doc-pick-titleline">
                        <span className="safety-doc-pick-title">{category.title}</span>
                        <span className="safety-prestart-tree-modal-category-meta">
                          {selectedInCategory > 0 ? `${selectedInCategory} selected · ` : ''}
                          <span className="material-icons" aria-hidden>
                            {expanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                  {expanded ? (
                    <div className="safety-prestart-tree-modal-items">
                      {category.items.map((item) => renderItemRow(
                        item.id,
                        item.title,
                        suggestedIds?.has(item.id)
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>

        <div className="safety-modal-footer safety-modal-footer--center">
          <button
            type="button"
            className="safety-btn-primary"
            onClick={() => onSave(draft)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
