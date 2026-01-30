// Step 4: Upload Documents

import { useState, useRef, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWizard } from '../useWizard'
import type { UploadedDocument, SelectedExistingDocument } from '../types/wizard.types'
import type { Document } from '../../../types/appsheet'
import AppSheetAPI from '../../../services/appsheetApi'
import LoadingSpinner from '../../Common/LoadingSpinner'
import './Step4Documents.css'

const appsheetApi = new AppSheetAPI()

// Función para parsear fecha en formato DD/MM/YYYY HH:mm:ss
function parseDocumentDate(dateStr: string): Date {
  if (!dateStr) return new Date(0)
  
  // Formato: "DD/MM/YYYY HH:mm:ss"
  const parts = dateStr.split(' ')
  if (parts.length !== 2) return new Date(0)
  
  const [datePart, timePart] = parts
  const [day, month, year] = datePart.split('/').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)
  
  return new Date(year, month - 1, day, hour, minute, second)
}

// Función para generar un ID único temporal
function generateTempId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Categorías que no se muestran en el step (no se utilizan para la orden)
const EXCLUDED_DOCUMENT_CATEGORIES = new Set(['Cut List', 'Delivery Docket'])

export function Step4Documents() {
  const { formData, updateFormData, validation, setLoading, setError, isLoading, creationResult } = useWizard()
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set())
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map())
  const [linkingDocs, setLinkingDocs] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categorySearchTerms, setCategorySearchTerms] = useState<Map<string, string>>(new Map())
  const [showCategoryDropdowns, setShowCategoryDropdowns] = useState<Map<string, boolean>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar documentos existentes del proyecto
  const { data: existingDocumentsRaw, isLoading: loadingExisting } = useQuery<Document[]>({
    queryKey: ['documents-by-project', formData.project],
    queryFn: () => appsheetApi.getDocumentsByProject(formData.project || ''),
    enabled: !!formData.project,
    staleTime: 0 // Sin cache, siempre obtener datos frescos
  })

  // Excluir documentos con categoría 'Cut List' y 'Delivery Docket' para la vista del step
  const existingDocuments = useMemo(() => {
    if (!existingDocumentsRaw?.length) return existingDocumentsRaw ?? []
    return existingDocumentsRaw.filter(
      (doc) => !EXCLUDED_DOCUMENT_CATEGORIES.has((doc['Category'] || '').trim())
    )
  }, [existingDocumentsRaw])

  // Función para filtrar documentos por búsqueda
  const matchesSearch = (doc: Document, query: string): boolean => {
    if (!query.trim()) return true
    
    const lowerQuery = query.toLowerCase()
    return (
      doc['Name']?.toLowerCase().includes(lowerQuery) ||
      doc['File']?.toLowerCase().includes(lowerQuery) ||
      doc['Comments']?.toLowerCase().includes(lowerQuery) ||
      doc['Category']?.toLowerCase().includes(lowerQuery)
    )
  }

  // Agrupar documentos por categoría, filtrar por búsqueda y ordenar por fecha (más recientes primero)
  const groupedDocuments = useMemo(() => {
    if (!existingDocuments || existingDocuments.length === 0) {
      return []
    }

    // Filtrar documentos por búsqueda
    const filteredDocs = searchQuery.trim()
      ? existingDocuments.filter(doc => matchesSearch(doc, searchQuery))
      : existingDocuments

    if (filteredDocs.length === 0) {
      return []
    }

    // Crear un mapa para agrupar por categoría
    const grouped = new Map<string, Document[]>()

    filteredDocs.forEach(doc => {
      const category = doc['Category'] || 'Uncategorized'
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(doc)
    })

    // Ordenar cada grupo por fecha de creación (más recientes primero)
    grouped.forEach((docs) => {
      docs.sort((a, b) => {
        const dateA = parseDocumentDate(a['Created at'] || '')
        const dateB = parseDocumentDate(b['Created at'] || '')
        return dateB.getTime() - dateA.getTime() // Más recientes primero
      })
    })

    // Convertir a array de objetos con categoría y documentos
    return Array.from(grouped.entries())
      .map(([category, docs]) => ({
        category,
        documents: docs
      }))
      .sort((a, b) => {
        // Ordenar categorías alfabéticamente, pero "Uncategorized" al final
        if (a.category === 'Uncategorized') return 1
        if (b.category === 'Uncategorized') return -1
        return a.category.localeCompare(b.category)
      })
  }, [existingDocuments, searchQuery])

  // Categorías disponibles para nuevos documentos (incluye Cut List y Delivery Docket)
  const existingCategories = useMemo(() => {
    if (!existingDocumentsRaw || existingDocumentsRaw.length === 0) {
      return []
    }
    const categories = new Set<string>()
    existingDocumentsRaw.forEach(doc => {
      const category = doc['Category']
      if (category && category.trim()) {
        categories.add(category)
      }
    })
    return Array.from(categories).sort()
  }, [existingDocumentsRaw])

  // Toggle expandir/colapsar categoría
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Agregar documento a la lista
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newDocuments: UploadedDocument[] = Array.from(files).map(file => ({
      id: generateTempId(),
      file,
      name: file.name,
      comments: '',
      category: '',
      uploaded: false,
      saved: false
    }))

    updateFormData({
      documents: [...formData.documents, ...newDocuments]
    })

    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Eliminar documento de la lista
  const handleRemoveDocument = (docId: string) => {
    updateFormData({
      documents: formData.documents.filter(doc => doc.id !== docId)
    })
    uploadErrors.delete(docId)
    setUploadErrors(new Map(uploadErrors))
  }

  // Actualizar nombre del documento
  const handleDocumentNameChange = (docId: string, name: string) => {
    updateFormData({
      documents: formData.documents.map(doc =>
        doc.id === docId ? { ...doc, name } : doc
      )
    })
  }

  // Actualizar comentarios del documento
  const handleCommentsChange = (docId: string, comments: string) => {
    updateFormData({
      documents: formData.documents.map(doc =>
        doc.id === docId ? { ...doc, comments } : doc
      )
    })
  }

  // Inicializar términos de búsqueda de categoría con el valor actual
  useEffect(() => {
    setCategorySearchTerms(prev => {
      const next = new Map(prev)
      const existingIds = new Set(formData.documents.map(d => d.id))
      
      // Agregar términos de búsqueda para documentos nuevos
      formData.documents.forEach(doc => {
        if (!next.has(doc.id)) {
          next.set(doc.id, doc.category || '')
        }
      })
      
      // Limpiar términos de búsqueda para documentos que ya no existen
      for (const [id] of next) {
        if (!existingIds.has(id)) {
          next.delete(id)
        }
      }
      
      return next
    })
  }, [formData.documents])

  // Manejar cambio en el input de categoría (similar a handleProjectSearchChange)
  const handleCategorySearchChange = (docId: string, value: string) => {
    setCategorySearchTerms(prev => {
      const next = new Map(prev)
      next.set(docId, value)
      return next
    })
    setShowCategoryDropdowns(prev => {
      const next = new Map(prev)
      next.set(docId, true)
      return next
    })
    // Actualizar la categoría del documento con lo que se escribe (siempre se guarda)
    updateFormData({
      documents: formData.documents.map(doc =>
        doc.id === docId ? { ...doc, category: value } : doc
      )
    })
  }

  // Seleccionar categoría del dropdown
  const handleCategorySelect = (docId: string, category: string) => {
    setCategorySearchTerms(prev => {
      const next = new Map(prev)
      next.set(docId, category)
      return next
    })
    setShowCategoryDropdowns(prev => {
      const next = new Map(prev)
      next.set(docId, false)
      return next
    })
    // Actualizar la categoría del documento
    updateFormData({
      documents: formData.documents.map(doc =>
        doc.id === docId ? { ...doc, category } : doc
      )
    })
  }

  // Filtrar categorías según el término de búsqueda (similar a filteredProjects)
  const getFilteredCategories = (docId: string): string[] => {
    const searchTerm = categorySearchTerms.get(docId) || ''
    if (!searchTerm.trim()) {
      return existingCategories
    }
    const searchLower = searchTerm.toLowerCase().trim()
    return existingCategories.filter(cat => cat.toLowerCase().includes(searchLower))
  }

  // Subir documento a Google Drive y crear registro en AppSheet (todo en un solo paso)
  const handleUploadDocument = async (doc: UploadedDocument) => {
    if (doc.uploaded && doc.saved) {
      return // Ya está subido y guardado
    }

    // Validar que tenga categoría antes de subir
    if (!doc.category || !doc.category.trim()) {
      const errorMessage = 'Category is required before uploading'
      uploadErrors.set(doc.id, errorMessage)
      setUploadErrors(new Map(uploadErrors))
      setError(errorMessage)
      return
    }

    setUploadingDocs(prev => new Set(prev).add(doc.id))
    uploadErrors.delete(doc.id)
    setUploadErrors(new Map(uploadErrors))

    try {
      setLoading(true)
      
      // addDocument se encarga de subir a Drive y guardar en AppSheet
      await appsheetApi.addDocument({
        file: doc.file,
        'Project': formData.project,
        'Name': doc.name,
        'Orders': formData.orderId,
        'Comments': doc.comments || '',
        'Category': doc.category || ''
      })

      // Actualizar documento como subido y guardado
      updateFormData({
        documents: formData.documents.map(d =>
          d.id === doc.id
            ? { ...d, uploaded: true, saved: true }
            : d
        )
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error uploading document'
      uploadErrors.set(doc.id, errorMessage)
      setUploadErrors(new Map(uploadErrors))
      setError(errorMessage)
    } finally {
      setUploadingDocs(prev => {
        const next = new Set(prev)
        next.delete(doc.id)
        return next
      })
      setLoading(false)
    }
  }

  // Subir todos los documentos
  const handleUploadAll = async () => {
    const docsToUpload = formData.documents.filter(
      doc => !doc.uploaded || !doc.saved
    )

    for (const doc of docsToUpload) {
      await handleUploadDocument(doc)
    }
  }

  // Seleccionar documento existente
  const handleSelectExistingDocument = (doc: Document) => {
    // Verificar si ya está seleccionado
    const alreadySelected = formData.selectedExistingDocuments.some(
      sel => sel.documentId === doc['Document ID']
    )

    if (alreadySelected) {
      // Deseleccionar
      updateFormData({
        selectedExistingDocuments: formData.selectedExistingDocuments.filter(
          sel => sel.documentId !== doc['Document ID']
        )
      })
    } else {
      // Agregar a la lista de seleccionados
      const selectedDoc: SelectedExistingDocument = {
        id: generateTempId(),
        documentId: doc['Document ID'],
        name: doc['Name'],
        file: doc['File'],
        comments: doc['Comments'] || '',
        category: doc['Category'] || '',
        createdAt: doc['Created at'] || '',
        linked: false
      }

      updateFormData({
        selectedExistingDocuments: [...formData.selectedExistingDocuments, selectedDoc]
      })
    }
  }

  // Vincular documento existente a la orden
  const handleLinkExistingDocument = async (doc: SelectedExistingDocument) => {
    if (doc.linked) {
      return // Ya está vinculado
    }

    setLinkingDocs(prev => new Set(prev).add(doc.id))
    uploadErrors.delete(doc.id)
    setUploadErrors(new Map(uploadErrors))

    try {
      setLoading(true)
      await appsheetApi.linkDocumentToOrder(doc.documentId, formData.orderId)

      // Actualizar documento como vinculado
      updateFormData({
        selectedExistingDocuments: formData.selectedExistingDocuments.map(d =>
          d.id === doc.id ? { ...d, linked: true } : d
        )
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error linking document'
      uploadErrors.set(doc.id, errorMessage)
      setUploadErrors(new Map(uploadErrors))
      setError(errorMessage)
    } finally {
      setLinkingDocs(prev => {
        const next = new Set(prev)
        next.delete(doc.id)
        return next
      })
      setLoading(false)
    }
  }

  // Vincular todos los documentos existentes seleccionados
  const handleLinkAllExisting = async () => {
    const docsToLink = formData.selectedExistingDocuments.filter(doc => !doc.linked)

    for (const doc of docsToLink) {
      await handleLinkExistingDocument(doc)
    }
  }

  // Verificar si un documento existente está seleccionado
  const isExistingDocumentSelected = (documentId: string): boolean => {
    return formData.selectedExistingDocuments.some(sel => sel.documentId === documentId)
  }

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.category-selector-wrapper')) {
        setShowCategoryDropdowns(new Map())
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const stepValidation = validation.step4
  const hasDocuments = formData.documents.length > 0
  const hasUnuploaded = formData.documents.some(doc => !doc.uploaded || !doc.saved)

  return (
    <div className="step-container step4-documents">
      <h2 className="step-title">Upload Documents</h2>
      <p className="step-description">
        Upload or select documents related to this order. Documents will be saved to CC Flow App and
        registered in Documents section.
      </p>

      {creationResult?.success && creationResult.orderId && (
        <div className="step4-order-banner" role="status">
          Adding documents to order: <strong>{creationResult.orderId}</strong>
        </div>
      )}

      {/* Sección de documentos existentes */}
      {formData.project && (
        <div className="step4-existing-documents">
          <div className="step4-existing-header">
            <div>
              <h3 className="step4-section-title">Existing Documents</h3>
              <p className="step4-section-description">
                Select existing documents from this project to link to this order.
              </p>
            </div>
            {/* Buscador */}
            <div className="step4-search-container">
              <div className="step4-search-input-wrapper">
                <span className="step4-search-icon">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="step4-search-input"
                  placeholder="Search documents..."
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="step4-search-clear"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {loadingExisting ? (
            <div className="step-loading">
              <LoadingSpinner />
              <span>Loading existing documents...</span>
            </div>
          ) : existingDocuments && existingDocuments.length > 0 ? (
            <>
              <div className="step4-existing-list">
                {groupedDocuments.length === 0 ? (
                  <div className="step-empty">
                    <p>
                      {searchQuery
                        ? `No documents found matching "${searchQuery}"`
                        : 'No documents found for this project.'}
                    </p>
                  </div>
                ) : (
                  groupedDocuments.map(({ category, documents }) => {
                    const isExpanded = expandedCategories.has(category)
                    return (
                      <div key={category} className="document-category-group">
                        <div
                          className="document-category-header"
                          onClick={() => toggleCategory(category)}
                        >
                          <div className="document-category-header-content">
                            <span className={`document-category-chevron ${isExpanded ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            <h4 className="document-category-title">{category}</h4>
                            <span className="document-category-count">
                              ({documents.length} {documents.length === 1 ? 'document' : 'documents'})
                            </span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="document-category-items">
                      {documents.map(doc => {
                        const isSelected = isExistingDocumentSelected(doc['Document ID'])
                        const selectedDoc = formData.selectedExistingDocuments.find(
                          sel => sel.documentId === doc['Document ID']
                        )
                        const isLinking = selectedDoc ? linkingDocs.has(selectedDoc.id) : false
                        const error = selectedDoc ? uploadErrors.get(selectedDoc.id) : undefined

                        return (
                          <div
                            key={doc['Document ID']}
                            className={`existing-document-item ${isSelected ? 'selected' : ''} ${
                              selectedDoc?.linked ? 'linked' : ''
                            } ${error ? 'error' : ''}`}
                            onClick={() => handleSelectExistingDocument(doc)}
                          >
                            <div className="existing-document-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectExistingDocument(doc)}
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                            <div className="existing-document-info">
                              <div className="existing-document-name">{doc['Name']}</div>
                              <div className="existing-document-file">{doc['File']}</div>
                              {doc['Comments'] && (
                                <div className="existing-document-comments">{doc['Comments']}</div>
                              )}
                              {doc['Created at'] && (
                                <div className="existing-document-date">
                                  Created: {doc['Created at']}
                                </div>
                              )}
                            </div>
                            {isSelected && selectedDoc && (
                              <div className="existing-document-actions">
                                {!selectedDoc.linked ? (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleLinkExistingDocument(selectedDoc)
                                    }}
                                    disabled={isLinking || isLoading}
                                    className="link-document-button"
                                  >
                                    {isLinking ? (
                                      <>
                                        <LoadingSpinner />
                                        Linking...
                                      </>
                                    ) : (
                                      'Link to Order'
                                    )}
                                  </button>
                                ) : (
                                  <div className="document-status">
                                    <span className="status-icon">✅</span>
                                    <span>Linked</span>
                                  </div>
                                )}
                                {error && <div className="document-error">{error}</div>}
                              </div>
                            )}
                          </div>
                          )
                        })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {formData.selectedExistingDocuments.length > 0 && (
                <div className="step4-existing-actions">
                  <button
                    type="button"
                    onClick={handleLinkAllExisting}
                    disabled={
                      isLoading ||
                      linkingDocs.size > 0 ||
                      formData.selectedExistingDocuments.every(doc => doc.linked)
                    }
                    className="link-all-button"
                  >
                    {isLoading || linkingDocs.size > 0 ? (
                      <>
                        <LoadingSpinner />
                        Linking...
                      </>
                    ) : (
                      `Link All Selected (${formData.selectedExistingDocuments.filter(d => !d.linked).length})`
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="step-empty">
              <p>No existing documents found for this project.</p>
            </div>
          )}
        </div>
      )}

      {/* Área de carga de archivos */}
      <div className="step4-upload-section">
        <h3 className="step4-section-title">Upload New Documents</h3>
      <div className="step4-upload-area">
        <input
          ref={fileInputRef}
          type="file"
          id="document-upload"
          className="file-input"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />
        <label htmlFor="document-upload" className="upload-label">
          <span className="upload-icon">📄</span>
          <div className="upload-text">
            <strong>Click to select files</strong>
            <span>or drag and drop</span>
            <span className="upload-hint">
              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 50MB per file)
            </span>
          </div>
        </label>
      </div>
      </div>

      {/* Lista de documentos nuevos */}
      {hasDocuments && (
        <div className="step4-documents-list">
          <div className="step4-documents-header">
            <h3>Documents ({formData.documents.length})</h3>
            {hasUnuploaded && (
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isLoading || uploadingDocs.size > 0}
                className="upload-all-button"
              >
                {isLoading || uploadingDocs.size > 0 ? (
                  <>
                    <LoadingSpinner />
                    Uploading...
                  </>
                ) : (
                  'Upload All'
                )}
              </button>
            )}
          </div>

          {formData.documents.map(doc => {
            const isUploading = uploadingDocs.has(doc.id)
            const error = uploadErrors.get(doc.id)

            return (
              <div
                key={doc.id}
                className={`document-item ${doc.uploaded && doc.saved ? 'uploaded' : ''} ${
                  error ? 'error' : ''
                }`}
              >
                <div className="document-item-header">
                  <div className="document-item-info">
                    <span className="document-icon">
                      {doc.uploaded && doc.saved ? '✅' : '📄'}
                    </span>
                    <div className="document-details">
                      <input
                        type="text"
                        value={doc.name}
                        onChange={e => handleDocumentNameChange(doc.id, e.target.value)}
                        className="document-name-input"
                        placeholder="Document name"
                        disabled={doc.saved}
                      />
                      <span className="document-file-name">{doc.file.name}</span>
                      {doc.filePath && (
                        <span className="document-path">{doc.filePath}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="remove-document-button"
                    disabled={isUploading}
                  >
                    ✕
                  </button>
                </div>

                <div className="document-item-body">
                  <div className="document-fields-row">
                    <div className="document-field">
                      <label className="document-field-label">
                        Category <span className="required-asterisk">*</span>
                      </label>
                      <div className="category-selector-wrapper">
                        <input
                          type="text"
                          value={categorySearchTerms.get(doc.id) || doc.category || ''}
                          onChange={e => handleCategorySearchChange(doc.id, e.target.value)}
                          onFocus={() => {
                            if (!doc.saved) {
                              setShowCategoryDropdowns(prev => {
                                const next = new Map(prev)
                                next.set(doc.id, true)
                                return next
                              })
                            }
                          }}
                          onBlur={() => {
                            // Delay para permitir click en dropdown
                            setTimeout(() => {
                              setShowCategoryDropdowns(prev => {
                                const next = new Map(prev)
                                next.set(doc.id, false)
                                return next
                              })
                            }, 200)
                          }}
                          className={`document-category-input ${!doc.category && !doc.saved ? 'error' : ''}`}
                          placeholder="Add or select a category"
                          disabled={doc.saved}
                          autoComplete="off"
                          required
                        />
                        {!doc.saved && showCategoryDropdowns.get(doc.id) && getFilteredCategories(doc.id).length > 0 && (
                          <div className="category-selector-dropdown">
                            <div className="category-selector-options">
                              {getFilteredCategories(doc.id).slice(0, 10).map(category => (
                                <div
                                  key={category}
                                  className={`category-selector-option ${doc.category === category ? 'selected' : ''}`}
                                  onMouseDown={e => e.preventDefault()} // Prevenir blur del input
                                  onClick={() => handleCategorySelect(doc.id, category)}
                                >
                                  {category}
                                </div>
                              ))}
                            </div>
                            {getFilteredCategories(doc.id).length > 10 && (
                              <div className="category-selector-footer">
                                Showing 10 of {getFilteredCategories(doc.id).length} categories
                              </div>
                            )}
                          </div>
                        )}
                        {!doc.saved && showCategoryDropdowns.get(doc.id) && 
                         categorySearchTerms.get(doc.id)?.trim() && 
                         getFilteredCategories(doc.id).length === 0 && (
                          <div className="category-selector-dropdown">
                            <div className="category-selector-empty">
                              No categories found. The text you type will be used as the category.
                            </div>
                          </div>
                        )}
                      </div>
                      {!doc.category && !doc.saved && (
                        <span className="field-error">Category is required</span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={doc.comments}
                    onChange={e => handleCommentsChange(doc.id, e.target.value)}
                    className="document-comments"
                    placeholder="Comments (optional)"
                    rows={2}
                    disabled={doc.saved}
                  />

                  {error && <div className="document-error">{error}</div>}

                  <div className="document-actions">
                    {!doc.uploaded || !doc.saved ? (
                      <button
                        type="button"
                        onClick={() => handleUploadDocument(doc)}
                        disabled={isUploading || isLoading || !doc.category || !doc.category.trim()}
                        className="upload-document-button"
                      >
                        {isUploading ? (
                          <>
                            <LoadingSpinner />
                            Uploading...
                          </>
                        ) : (
                          'Upload to CC Flow 2026'
                        )}
                      </button>
                    ) : (
                      <div className="document-status">
                        <span className="status-icon">✅</span>
                        <span>Uploaded and saved on CC Flow App 2026</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mensaje cuando no hay documentos */}
      {!hasDocuments && (
        <div className="step-empty">
          <p>No documents added yet. Select files above to get started.</p>
        </div>
      )}

      {/* Errores de validación */}
      {stepValidation.errors.length > 0 && (
        <div className="step-validation-errors">
          <ul>
            {stepValidation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Info adicional */}
      <div className="step4-info">
        <p>
          <strong>Note:</strong> Documents are optional. You can skip this step or add documents
          later. All uploaded documents will be associated with this order.
        </p>
      </div>
    </div>
  )
}
