import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getLogoPath, getFaviconPath } from '../../utils/assetUtils'
import AppSheetAPI from '../../services/appsheetApi'
import { supabaseApi } from '../../services/supabaseApi'
import './OrderDelivery.css'

// Interface for order details
interface OrderDetails {
  '_RowNumber': string
  'Order ID': string
  'Project': string
  'Status': string
  'Responsable': string
  'Colour': string
  'Meters Square': string
  'Expected to': string
  'Creation Date': string
  'End Date': string
  'Priority': string
  'Comment': string
}

const OrderDelivery: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [orderId, setOrderId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [orderPreview, setOrderPreview] = useState<Awaited<ReturnType<typeof supabaseApi.getOrderById>>>(null)
  const [isCheckingOrder, setIsCheckingOrder] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [watermarkCount, setWatermarkCount] = useState(12)

  const appSheetAPI = new AppSheetAPI()

  // Set dynamic document title
  useDocumentTitle('CC Delivery')

  // Determine watermark count based on screen size
  useEffect(() => {
    const updateWatermarkCount = () => {
      if (window.innerWidth <= 480) {
        setWatermarkCount(12) // 2x6 grid for mobile
      } else if (window.innerWidth <= 768) {
        setWatermarkCount(12) // 3x4 grid for tablet
      } else {
        setWatermarkCount(12) // 4x3 grid for desktop
      }
    }

    updateWatermarkCount()
    window.addEventListener('resize', updateWatermarkCount)
    return () => window.removeEventListener('resize', updateWatermarkCount)
  }, [])

  // Get Order_ID from URL parameter when component loads
  useEffect(() => {
    const urlOrderId = searchParams.get('Order_ID') || searchParams.get('order_ID')
    if (urlOrderId) {
      setOrderId(urlOrderId.toUpperCase())
      setMessage('')
      setMessageType('')
      setOrderDetails(null)
      setOrderPreview(null)
    }
  }, [searchParams])

  // Check if order exists in Supabase when orderId changes (debounced)
  useEffect(() => {
    const trimmed = orderId.trim()
    if (!trimmed) {
      setOrderPreview(null)
      setIsCheckingOrder(false)
      return
    }

    setIsCheckingOrder(true)
    const timer = setTimeout(async () => {
      try {
        const order = await supabaseApi.getOrderById(trimmed)
        setOrderPreview(order)
      } catch {
        setOrderPreview(null)
      } finally {
        setIsCheckingOrder(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [orderId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orderId.trim()) {
      setMessage('Please enter a valid Order ID')
      setMessageType('error')
      return
    }

    if (!orderPreview) {
      setMessage('Order not found. Please check the Order ID.')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')
    setMessageType('')
    setOrderDetails(null)

    try {
      // Call AppSheet action to mark as delivered
      const response = await appSheetAPI.markOrderAsDelivered(orderId.trim())
      
      if (response && response.length > 0) {
        // Get order details from the response
        setOrderDetails(response[0] as unknown as OrderDetails)
        setMessage('') // Clear any previous messages
        setMessageType('success')
        setOrderId('') // Clear field after success
      } else {
        setMessage('Error marking order as delivered')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error marking order as delivered:', error)
      setMessage('Error processing request. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upperCaseValue = e.target.value.toUpperCase()
    setOrderId(upperCaseValue)
    if (message) {
      setMessage('')
      setMessageType('')
    }
    if (orderDetails) {
      setOrderDetails(null)
    }
    setOrderPreview(null)
  }

  return (
    <div className="order-delivery-container">
      <div className="order-delivery-card">
        {/* Background watermark pattern */}
        <div className="watermark-pattern">
          <div className="watermark-grid">
            {Array.from({ length: watermarkCount }, (_, index) => (
              <img 
                key={index} 
                src={getLogoPath()} 
                alt="CC Logo Watermark" 
                className="watermark" 
                style={{ '--i': index } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        
        <div className="page-heading order-delivery-header">
          <h1 className="page-heading-title">Mark Order as Delivered</h1>
          <p className="page-heading-desc">Enter the Order ID to mark it as delivered</p>
        </div>

        <form onSubmit={handleSubmit} className="order-delivery-form">
          <div className="form-group">
            <label htmlFor="orderId">Order ID:</label>
            <div className="input-container">
              <input
                type="text"
                id="orderId"
                value={orderId}
                onChange={handleInputChange}
                placeholder="Enter Order ID (e.g., FL-1)"
                className={`form-input ${!isCheckingOrder && orderId.trim() && !orderPreview ? 'invalid' : orderPreview ? 'valid' : ''}`}
                disabled={isLoading}
                required
                aria-describedby="orderId-help"
                style={{ textTransform: 'uppercase' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading && orderPreview) {
                    e.preventDefault()
                    const form = e.currentTarget.form
                    if (form) {
                      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
                      form.dispatchEvent(submitEvent)
                    }
                  }
                }}
              />
              {isCheckingOrder && orderId.trim() && (
                <span className="validation-icon checking" aria-hidden>⟳</span>
              )}
              {!isCheckingOrder && orderPreview && (
                <span className="validation-icon valid">✓</span>
              )}
              {!isCheckingOrder && orderId.trim() && !orderPreview && (
                <span className="validation-icon invalid">✗</span>
              )}
            </div>
            <div id="orderId-help" className="help-text">
              Enter Order ID (e.g., FL-1, ABC-123).
            </div>
            {orderPreview && (
              <div className="order-preview-card">
                <div className="detail-row">
                  <span className="detail-label">Project:</span>
                  <span className="detail-value">{orderPreview.Project}</span>
                </div>
                {orderPreview.ProjectAddress && (
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{orderPreview.ProjectAddress}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || isCheckingOrder || !orderPreview}
            aria-label="Mark order as delivered"
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <img src={getFaviconPath()} alt="CC Favicon" className="button-favicon" />
                Mark as Delivered
                <img src={getFaviconPath()} alt="CC Favicon" className="button-favicon" />
              </>
            )}
          </button>
        </form>

        {message && !orderDetails && (
          <div className={`message ${messageType}`} role="alert">
            {message}
          </div>
        )}

        {orderDetails && messageType === 'success' && (
          <div className="order-details-card">
            <div className="order-details-header">
              <span className="success-icon">✓</span>
              <h3>Order Successfully Delivered</h3>
            </div>
            <div className="order-details-content">
              <div className="detail-row">
                <span className="detail-label">Order ID:</span>
                <span className="detail-value">{orderDetails['Order ID']}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Project:</span>
                <span className="detail-value">{orderDetails.Project}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Responsible:</span>
                <span className="detail-value">{orderDetails.Responsable}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Color:</span>
                <span className="detail-value">{orderDetails.Colour}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Square Meters:</span>
                <span className="detail-value">{orderDetails['Meters Square']} m²</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Delivery Date:</span>
                <span className="detail-value">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="order-delivery-info">
          <button 
            className="info-toggle-button"
            onClick={() => setShowInfo(!showInfo)}
            aria-expanded={showInfo}
            aria-controls="info-content"
          >
            <div className="info-toggle-left">
              <div className="info-icon">ℹ️</div>
              <span className="info-toggle-text">Help & Information</span>
            </div>
            <span className={`info-toggle-icon ${showInfo ? 'open' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>
          
          <div 
            id="info-content"
            className={`info-content ${showInfo ? 'show' : ''}`}
            aria-hidden={!showInfo}
          >
            <div className="info-content-inner">
              <div className="info-section">
                <h4 className="info-section-title">How to use</h4>
                <ul className="info-list">
                  <li>Enter the Order ID in the field above</li>
                  <li>We check if the order exists (e.g., FL-1, ABC-123)</li>
                  <li>Click "Mark as Delivered" to confirm</li>
                </ul>
              </div>
              
              <div className="info-section">
                <h4 className="info-section-title">Important notes</h4>
                <ul className="info-list">
                  <li>Once confirmed, the order cannot be undone</li>
                  <li>Delivery date will be automatically recorded</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderDelivery