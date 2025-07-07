import React, { useState, useEffect, useCallback } from 'react'
import './PerformanceMonitor.css'

interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface PerformanceWithMemory extends Performance {
  memory: PerformanceMemory
}

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  domSize: number
  jsHeapSize: number
  timestamp: number
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
  showDetails?: boolean
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  onMetricsUpdate, 
  showDetails = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    domSize: 0,
    jsHeapSize: 0,
    timestamp: Date.now()
  })
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [showFullDetails, setShowFullDetails] = useState(showDetails)

  // Measure actual page load time using modern API
  const measureLoadTime = useCallback(() => {
    if (performance && performance.getEntriesByType) {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigationEntry) {
        return navigationEntry.loadEventEnd - navigationEntry.fetchStart
      }
    }
    // Fallback to DOMContentLoaded if navigation timing not available
    return performance.now()
  }, [])

  // Measure real memory usage
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as PerformanceWithMemory).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      }
    }
    return { used: 0, total: 0, limit: 0 }
  }, [])

  // Measure DOM size
  const measureDOMSize = useCallback(() => {
    return document.querySelectorAll('*').length
  }, [])

  // Measure render performance using requestAnimationFrame
  const measureRenderPerformance = useCallback(() => {
    return new Promise<number>((resolve) => {
      const start = performance.now()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const end = performance.now()
          resolve(end - start)
        })
      })
    })
  }, [])

  const startMonitoring = useCallback(async () => {
    setIsMonitoring(true)
    
    try {
      // Measure load time
      const loadTime = measureLoadTime()
      
      // Measure render performance
      const renderTime = await measureRenderPerformance()
      
      // Measure memory usage
      const memory = measureMemoryUsage()
      
      // Measure DOM size
      const domSize = measureDOMSize()
      
      const newMetrics: PerformanceMetrics = {
        loadTime: Math.round(loadTime),
        renderTime: Math.round(renderTime),
        memoryUsage: memory.used,
        domSize,
        jsHeapSize: memory.total,
        timestamp: Date.now()
      }
      
      setMetrics(newMetrics)
      
      if (onMetricsUpdate) {
        onMetricsUpdate(newMetrics)
      }
      
    } catch (error) {
      console.error('Error measuring performance:', error)
    } finally {
      setIsMonitoring(false)
    }
  }, [measureLoadTime, measureRenderPerformance, measureMemoryUsage, measureDOMSize, onMetricsUpdate])

  // Auto-monitoring every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMonitoring) {
        startMonitoring()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [startMonitoring, isMonitoring])

  // Initial monitoring
  useEffect(() => {
    const timer = setTimeout(() => {
      startMonitoring()
    }, 1000)

    return () => clearTimeout(timer)
  }, [startMonitoring])

  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.warning) return 'warning'
    return 'poor'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✅'
      case 'warning': return '⚠️'
      case 'poor': return '❌'
      default: return '❓'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'good': return 'performance-good'
      case 'warning': return 'performance-warning'
      case 'poor': return 'performance-poor'
      default: return 'performance-unknown'
    }
  }

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <h3>📊 Performance Monitor</h3>
        <div className="monitor-controls">
          <button 
            onClick={startMonitoring} 
            disabled={isMonitoring}
            className="monitor-btn"
          >
            {isMonitoring ? '🔄 Monitoring...' : '📊 Measure Performance'}
          </button>
          <button 
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="toggle-details-btn"
          >
            {showFullDetails ? '📋 Hide Details' : '📋 Show Details'}
          </button>
        </div>
      </div>

      <div className="performance-metrics">
        <div className="metric-grid">
          <div className={`metric-item ${getStatusClass(getPerformanceStatus(metrics.loadTime, { good: 2000, warning: 5000 }))}`}>
            <div className="metric-icon">
              {getStatusIcon(getPerformanceStatus(metrics.loadTime, { good: 2000, warning: 5000 }))}
            </div>
            <div className="metric-content">
              <div className="metric-label">Load Time</div>
              <div className="metric-value">{metrics.loadTime}ms</div>
            </div>
          </div>

          <div className={`metric-item ${getStatusClass(getPerformanceStatus(metrics.renderTime, { good: 16, warning: 33 }))}`}>
            <div className="metric-icon">
              {getStatusIcon(getPerformanceStatus(metrics.renderTime, { good: 16, warning: 33 }))}
            </div>
            <div className="metric-content">
              <div className="metric-label">Render Time</div>
              <div className="metric-value">{metrics.renderTime}ms</div>
            </div>
          </div>

          <div className={`metric-item ${getStatusClass(getPerformanceStatus(metrics.memoryUsage, { good: 50, warning: 100 }))}`}>
            <div className="metric-icon">
              {getStatusIcon(getPerformanceStatus(metrics.memoryUsage, { good: 50, warning: 100 }))}
            </div>
            <div className="metric-content">
              <div className="metric-label">Memory Usage</div>
              <div className="metric-value">{metrics.memoryUsage}MB</div>
            </div>
          </div>

          <div className={`metric-item ${getStatusClass(getPerformanceStatus(metrics.domSize, { good: 1000, warning: 3000 }))}`}>
            <div className="metric-icon">
              {getStatusIcon(getPerformanceStatus(metrics.domSize, { good: 1000, warning: 3000 }))}
            </div>
            <div className="metric-content">
              <div className="metric-label">DOM Elements</div>
              <div className="metric-value">{metrics.domSize}</div>
            </div>
          </div>

          <div className={`metric-item ${getStatusClass(getPerformanceStatus(metrics.jsHeapSize, { good: 100, warning: 200 }))}`}>
            <div className="metric-icon">
              {getStatusIcon(getPerformanceStatus(metrics.jsHeapSize, { good: 100, warning: 200 }))}
            </div>
            <div className="metric-content">
              <div className="metric-label">JS Heap Size</div>
              <div className="metric-value">{metrics.jsHeapSize}MB</div>
            </div>
          </div>
        </div>

        {showFullDetails && (
          <div className="performance-details">
            <h4>Performance Recommendations</h4>
            <div className="recommendations">
              {metrics.loadTime > 5000 && (
                <div className="recommendation warning">
                  <span>⚠️</span>
                  <span>High load time. Consider optimizing bundle size or implementing lazy loading.</span>
                </div>
              )}
              
              {metrics.renderTime > 33 && (
                <div className="recommendation warning">
                  <span>⚠️</span>
                  <span>High render time. Review heavy components or implement React.memo.</span>
                </div>
              )}
              
              {metrics.memoryUsage > 100 && (
                <div className="recommendation warning">
                  <span>⚠️</span>
                  <span>High memory usage. Check for memory leaks or optimize state management.</span>
                </div>
              )}
              
              {metrics.domSize > 3000 && (
                <div className="recommendation warning">
                  <span>⚠️</span>
                  <span>Large DOM tree. Consider virtualizing lists or reducing component complexity.</span>
                </div>
              )}
              
              {metrics.jsHeapSize > 200 && (
                <div className="recommendation warning">
                  <span>⚠️</span>
                  <span>Large JS heap. Review object allocations and garbage collection.</span>
                </div>
              )}
              
              {metrics.loadTime <= 2000 && metrics.renderTime <= 16 && metrics.memoryUsage <= 50 && (
                <div className="recommendation good">
                  <span>✅</span>
                  <span>Excellent performance! The application is running optimally.</span>
                </div>
              )}
            </div>
            
            <div className="performance-info">
              <h5>Measurement Details</h5>
              <ul>
                <li><strong>Load Time:</strong> Time from fetch start to load event end</li>
                <li><strong>Render Time:</strong> Time for two animation frames (real render measurement)</li>
                <li><strong>Memory Usage:</strong> Current JavaScript heap usage</li>
                <li><strong>DOM Elements:</strong> Total number of DOM nodes</li>
                <li><strong>JS Heap Size:</strong> Total allocated JavaScript heap</li>
              </ul>
              <p><em>Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}</em></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceMonitor 