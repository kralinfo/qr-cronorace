// UI only: modal centralizado reutilizável com overlay escuro e fechamento por Esc/clique fora.
import React, { useEffect } from 'react'
import { IconClose } from './Icons.jsx'

/**
 * @param {{
 *   title?: string,
 *   onClose: () => void,
 *   children: React.ReactNode,
 *   maxWidth?: number|string
 * }} props
 */
export default function Modal({ title, onClose, children, maxWidth = 520 }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-sheet" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
