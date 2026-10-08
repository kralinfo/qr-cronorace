// UI only: menu de ações em dropdown (acionado pelo ícone "⋮"), para listas com múltiplas ações por item.
import React, { useEffect, useRef, useState } from 'react'

/** @param {{ items: Array<{ label: string, onClick: () => void, danger?: boolean }> }} props */
export default function ActionsMenu({ items }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleItemClick = (onClick) => {
    setOpen(false)
    onClick()
  }

  return (
    <div className="actions-menu" ref={containerRef}>
      <button
        type="button"
        className="actions-menu-trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Mais opções"
      >
        ⋮
      </button>
      {open && (
        <div className="actions-menu-dropdown">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`actions-menu-item ${item.danger ? 'danger' : ''}`}
              onClick={() => handleItemClick(item.onClick)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
