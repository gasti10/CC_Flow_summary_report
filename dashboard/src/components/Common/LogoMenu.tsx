import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './LogoMenu.css'

interface MenuItem {
  id: string
  label: string
  path: string
  icon?: string
}

interface LogoMenuProps {
  logoPath: string
  menuItems: MenuItem[]
}

const LogoMenu: React.FC<LogoMenuProps> = ({ logoPath, menuItems }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogoClick = () => {
    setIsOpen(!isOpen)
  }

  const handleMenuItemClick = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <div className="logo-menu-container" ref={menuRef}>
      <div className="logo-button" onClick={handleLogoClick}>
        <img src={logoPath} alt="CC Logo" className="logo-image" />
        <div className={`menu-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </div>
      </div>
      
      {isOpen && (
        <div className="menu-dropdown">
          <div className="menu-header">
            <span>Other Functions</span>
          </div>
          <div className="menu-items">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className="menu-item"
                onClick={() => handleMenuItemClick(item.path)}
              >
                {item.icon && <span className="menu-item-icon">{item.icon}</span>}
                <span className="menu-item-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LogoMenu 