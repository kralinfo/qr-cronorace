// UI only: modal simples de confirmação para ações destrutivas (ex.: excluir corrida).
import React from 'react'

/** @param {{ message: string, onConfirm: () => void, onCancel: () => void, confirmLabel?: string }} props */
export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Excluir' }) {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button className="secondary-btn" onClick={onCancel}>Cancelar</button>
          <button className="danger-btn" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
