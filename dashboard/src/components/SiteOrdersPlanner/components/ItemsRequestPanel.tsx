import type { ItemCatalog, ItemRequest } from '../../../types/appsheet'

interface ItemsRequestPanelProps {
  itemsRequests: ItemRequest[]
  itemsCatalog: ItemCatalog[]
  /** AppSheet order "Created By" (who raised the site order). */
  orderCreatedBy: string
  isLoadingRequests: boolean
  isLoadingCatalog: boolean
  onAddToCuttingList: (item: ItemRequest, description: string) => void
}

function catalogByItemId(catalog: ItemCatalog[]): Map<string, ItemCatalog> {
  return new Map(catalog.map(c => [c['Item ID'], c]))
}

/** Label for the cutting list row: prefer catalog item name, then stored material description. */
function resolveCuttingListDescription(item: ItemRequest, cat: ItemCatalog | undefined): string {
  return (
    cat?.Name?.trim() ||
    item['Description Material']?.trim() ||
    item.Description?.trim() ||
    'Item'
  )
}

/** Description field on the cutting list line: Category + Material (table columns). */
function descriptionForCuttingListLine(item: ItemRequest, cat: ItemCatalog | undefined): string {
  const material = resolveCuttingListDescription(item, cat)
  const category = item.Category?.trim() || ''
  if (!category) return material
  return `${category} ${material}`
}

/** "Description Material" column: catalog detailed spec first, then name, then request field. */
function resolveDescriptionMaterial(item: ItemRequest, cat: ItemCatalog | undefined): string {
  return (
    cat?.['Detailed Specification']?.trim() ||
    cat?.Name?.trim() ||
    item['Description Material']?.trim() ||
    '—'
  )
}

function resolveSubCategory(item: ItemRequest, cat: ItemCatalog | undefined): string {
  return item['Sub Category']?.trim() || cat?.['Sub Category']?.trim() || '—'
}

function formatStock(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return String(value)
}

export default function ItemsRequestPanel({
  itemsRequests,
  itemsCatalog,
  orderCreatedBy,
  isLoadingRequests,
  isLoadingCatalog,
  onAddToCuttingList
}: ItemsRequestPanelProps) {
  const byId = catalogByItemId(itemsCatalog)
  const loading = isLoadingRequests || (itemsRequests.length > 0 && isLoadingCatalog)

  const titleSuffix = orderCreatedBy.trim() || '—'

  return (
    <section className="sop-card sop-item-requests-card">
      <div className="sop-card-header card-section-header">
        <h2 className="card-section-title sop-item-requests-title">
          Items requested by {titleSuffix}
        </h2>
        <p className="sop-item-requests-hint">
          Select lines to add to the cutting list. Change the site order above to compare what was requested on other orders.
        </p>
      </div>
      <div className="sop-card-body">
        {loading ? (
          <p className="sop-empty-hint">Loading items…</p>
        ) : itemsRequests.length === 0 ? (
          <p className="sop-empty-hint">No item requests for this order.</p>
        ) : (
          <div className="sop-table-wrap sop-table-wrap--items-request">
            <table className="sop-table sop-table-items-request">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Sub Category</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Description Material</th>
                  <th>Total Stock Available</th>
                  <th>Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {itemsRequests.map(item => {
                  const cat = item['Item ID'] ? byId.get(item['Item ID']) : undefined
                  const cuttingLabel = resolveCuttingListDescription(item, cat)
                  const lineDescription = descriptionForCuttingListLine(item, cat)
                  return (
                    <tr key={item['Item Request ID']}>
                      <td>{cuttingLabel}</td>
                      <td>{item.Category?.trim() || '—'}</td>
                      <td>{resolveSubCategory(item, cat)}</td>
                      <td>{item.Quantity ?? '—'}</td>
                      <td>{item.Status?.trim() || '—'}</td>
                      <td className="sop-cell-multiline">{resolveDescriptionMaterial(item, cat)}</td>
                      <td>{formatStock(item['Total Stock Available'])}</td>
                      <td className="sop-cell-multiline">{item.Description?.trim() || '—'}</td>
                      <td className="sop-table-actions-cell">
                        <button
                          type="button"
                          className="sop-btn-secondary sop-btn-add-from-order"
                          onClick={() => onAddToCuttingList(item, lineDescription)}
                        >
                          <span className="material-icons" aria-hidden>playlist_add</span>
                          Add to cutting list
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
