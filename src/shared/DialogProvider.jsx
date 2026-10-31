// UI only: provider global de diálogos (alert/confirm/prompt) baseados em componentes, evitando modais nativos.
import React, { createContext, useCallback, useContext, useState } from 'react'
import Modal from './Modal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

const DialogContext = createContext(null)

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error('useDialog deve ser usado dentro de DialogProvider')
  }
  return ctx
}

export function DialogProvider({ children }) {
  const [alertState, setAlertState] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [promptState, setPromptState] = useState(null)
  const [promptValue, setPromptValue] = useState('')

  const alert = useCallback((message) => {
    return new Promise((resolve) => {
      setAlertState({ message, resolve })
    })
  }, [])

  const confirm = useCallback((message, confirmLabel) => {
    return new Promise((resolve) => {
      setConfirmState({ message, confirmLabel, resolve })
    })
  }, [])

  const prompt = useCallback((message, defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptValue(defaultValue ?? '')
      setPromptState({ message, defaultValue: defaultValue ?? '', resolve })
    })
  }, [])

  const closeAlert = () => {
    if (alertState?.resolve) alertState.resolve()
    setAlertState(null)
  }

  const closeConfirm = (result) => {
    if (confirmState?.resolve) confirmState.resolve(result)
    setConfirmState(null)
  }

  const closePrompt = (result) => {
    if (promptState?.resolve) promptState.resolve(result)
    setPromptState(null)
  }

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}

      {alertState && (
        <Modal title="Aviso" onClose={closeAlert} maxWidth={420}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{alertState.message}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="primary-btn" onClick={closeAlert}>OK</button>
          </div>
        </Modal>
      )}

      {confirmState && (
        <ConfirmDialog
          isOpen
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel || 'Confirmar'}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      )}

      {promptState && (
        <Modal title="Informe" onClose={() => closePrompt(null)} maxWidth={460}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{promptState.message}</p>
          <input
            autoFocus
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') closePrompt(promptValue)
              if (e.key === 'Escape') closePrompt(null)
            }}
            style={{ width: '100%', marginTop: 12, padding: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="secondary-btn" onClick={() => closePrompt(null)}>Cancelar</button>
            <button type="button" className="primary-btn" onClick={() => closePrompt(promptValue)}>OK</button>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  )
}