import React, { useState, useMemo } from 'react'
import type { MaterialsData } from '../../types/appsheet'
import './MaterialsTable.css'
import { formatDateTime } from '../../utils/dateUtils'

interface MaterialsTableProps {
  materials: MaterialsData
  isLoading?: boolean
}

// Mapeo de categorías con emojis (fuera del componente para evitar re-renders)
const categoryEmojis: Record<string, string> = {
  'Top hat': '📏', // Z-bars
  'Angles': '📐',
  'Screws': '🔩',
  'Caulking Glue': '🧴',
  'Packers': '📦',
  'Tapes': '🎞️',
  'Others': '📋'
};

const MaterialsTable: React.FC<MaterialsTableProps> = ({ materials, isLoading = false }) => {
  const [activeView, setActiveView] = useState<'summary' | 'details' | null>(null)

  // Procesar datos para la vista de resumen
  const summaryData = useMemo(() => {
    return materials.summary.map(category => ({
      ...category,
      category: `${categoryEmojis[category.category] || '📋'} ${category.category} ${categoryEmojis[category.category] || '📋'}`
    }))
  }, [materials.summary])

  // Procesar datos para la vista detallada
  const detailedData = useMemo(() => {
    return materials.details.map(category => ({
      ...category,
      category: `${categoryEmojis[category.category] || '📋'} ${category.category} ${categoryEmojis[category.category] || '📋'}`
    }))
  }, [materials.details])

  if (isLoading) {
    return (
      <div className="materials-table-container">
        <div className="loading-spinner" />
        <p>Loading materials...</p>
      </div>
    )
  }

  if (materials.summary.length === 0 && materials.details.length === 0) {
    return (
      <div className="materials-table-container">
        <h2>📦 Material Tables</h2>
        <p>No materials available for this project.</p>
      </div>
    )
  }

  return (
    <div className="materials-table-container">
      <h2 id="material-tables">Material Tables</h2>
      
      {/* Botones de control */}
      <div id="materialsTablesContainer">
        <button 
          id="btnSummary"
          className={activeView === 'summary' ? 'active' : ''}
          onClick={() => setActiveView(activeView === 'summary' ? null : 'summary')}
        >
          📊 Summary Table
        </button>
        <button 
          id="btnDetails"
          className={activeView === 'details' ? 'active' : ''}
          onClick={() => setActiveView(activeView === 'details' ? null : 'details')}
        >
          📋 Detailed Table
        </button>
      </div>

      {/* Vista de Resumen */}
      <div className="table-scroll-container">
        <table id="materialsTable" className={activeView === 'summary' ? '' : 'hidden'}>
          <thead>
            <tr>
              <th colSpan={4}>Summary materials</th>
            </tr>
            <tr>
              <th>🏷️ Name</th>
              <th>📂 Sub Category</th>
              <th>📝 Description</th>
              <th>🔢 Total</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((category) => {
              if (category.items.length === 0) return null
              
              return (
                <React.Fragment key={category.category}>
                  <tr>
                    <td colSpan={4} className="category">{category.category}</td>
                  </tr>
                  {category.items.map((item) => (
                    <tr key={item.ItemID} className="item">
                      <td>{item.Name}</td>
                      <td>{item.SubCategory}</td>
                      <td>{item.Description}</td>
                      <td>{item.Total}</td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Detallada */}
      <div className="table-scroll-container">
        <table id="materialsTable_details" className={activeView === 'details' ? '' : 'hidden'}>
          <thead>
            <tr>
              <th colSpan={8}>Summary detailed materials</th>
            </tr>
            <tr>
              <th>📋 Order</th>
              <th>📦 Status</th>
              <th>📅 Date</th>
              <th>🏷️ Name</th>
              <th>📝 Description</th>
              <th>⚙️ User Spec</th>
              <th>👤 Request by</th>
              <th>🔢 Quantity</th>
            </tr>
          </thead>
          <tbody>
            {detailedData.map((category) => {
              if (category.items.length === 0) return null
              
              return (
                <React.Fragment key={category.category}>
                  <tr>
                    <td colSpan={8} className="category">{category.category}</td>
                  </tr>
                  {category.items.map((item, index) => (
                    <tr key={`${item['Item ID']}-${index}`} className="item">
                      <td>{item['Order Number']}</td>
                      <td>{item['Order Status'] === 'Delivered' ? '✅' : '⏳'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(item['Order Date'])}</td>
                      <td>{item.Name}</td>
                      <td>{item['Description Material']}</td>
                      <td>{item.Description}</td>
                      <td>{item['Request by']}</td>
                      <td>{item.Quantity}</td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MaterialsTable 