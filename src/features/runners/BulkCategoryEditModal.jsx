// UI only: edição em lote da categoria (sexo, local/visitante, condição especial)
// de vários corredores selecionados ao mesmo tempo.
import React, { useState } from 'react'
import Modal from '../../shared/Modal.jsx'

const KEEP = '__KEEP__'

function ToggleOption({ active, onClick, label }) {
  return (
    <button
      type="button"
      className={`cat-toggle ${active ? 'cat-toggle--active' : ''}`}
      style={active ? { background: 'rgba(124, 58, 237, 0.25)', borderColor: '#7c3aed', color: '#c4b5fd' } : {}}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/**
 * @param {{
 *   isOpen: boolean,
 *   count: number,
 *   onApply: (overrides: { gender?: 'MASCULINO'|'FEMININO', isLocal?: boolean, special?: ''|'PCD'|'+50'|'45-49' }) => Promise<{ updated: number, failed: number, total: number }>,
 *   onClose: () => void
 * }} props
 */
export default function BulkCategoryEditModal({ isOpen, count, onApply, onClose }) {
  const [genderChoice, setGenderChoice] = useState(KEEP)
  const [localChoice, setLocalChoice] = useState(KEEP)
  const [specialChoice, setSpecialChoice] = useState(KEEP)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const hasChanges = genderChoice !== KEEP || localChoice !== KEEP || specialChoice !== KEEP

  const handleClose = () => {
    setGenderChoice(KEEP)
    setLocalChoice(KEEP)
    setSpecialChoice(KEEP)
    setResult(null)
    setError(null)
    onClose()
  }

  const handleApply = async () => {
    if (!hasChanges) return
    setApplying(true)
    setError(null)
    try {
      const overrides = {}
      if (genderChoice !== KEEP) overrides.gender = genderChoice
      if (localChoice !== KEEP) overrides.isLocal = localChoice === 'LOCAL'
      if (specialChoice !== KEEP) overrides.special = specialChoice === 'NONE' ? '' : specialChoice

      const summary = await onApply(overrides)
      setResult(summary)
    } catch (err) {
      setError(err?.message || 'Falha ao aplicar as alterações.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal title={`Editar categoria (${count} selecionado${count === 1 ? '' : 's'})`} onClose={handleClose} maxWidth={480}>
      {result ? (
        <div>
          <p>
            ✓ {result.updated} corredor(es) atualizado(s)
            {result.failed > 0 ? ` · ${result.failed} falharam` : ''} de {result.total} selecionado(s).
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="primary-btn" onClick={handleClose}>Fechar</button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Escolha apenas o que deseja alterar. Em "Não alterar", cada corredor mantém o valor que já tinha.
          </p>

          <div className="edit-runner-field">
            <label>Sexo</label>
            <div className="cat-group">
              <ToggleOption active={genderChoice === KEEP} onClick={() => setGenderChoice(KEEP)} label="Não alterar" />
              <ToggleOption active={genderChoice === 'MASCULINO'} onClick={() => setGenderChoice('MASCULINO')} label="Masculino" />
              <ToggleOption active={genderChoice === 'FEMININO'} onClick={() => setGenderChoice('FEMININO')} label="Feminino" />
            </div>
          </div>

          <div className="edit-runner-field">
            <label>Origem</label>
            <div className="cat-group">
              <ToggleOption active={localChoice === KEEP} onClick={() => setLocalChoice(KEEP)} label="Não alterar" />
              <ToggleOption active={localChoice === 'LOCAL'} onClick={() => setLocalChoice('LOCAL')} label="Local" />
              <ToggleOption active={localChoice === 'VISITANTE'} onClick={() => setLocalChoice('VISITANTE')} label="Visitante" />
            </div>
          </div>

          <div className="edit-runner-field">
            <label>Condição especial</label>
            <div className="cat-group">
              <ToggleOption active={specialChoice === KEEP} onClick={() => setSpecialChoice(KEEP)} label="Não alterar" />
              <ToggleOption active={specialChoice === 'NONE'} onClick={() => setSpecialChoice('NONE')} label="Nenhuma" />
              <ToggleOption active={specialChoice === 'PCD'} onClick={() => setSpecialChoice('PCD')} label="PCD" />
              <ToggleOption active={specialChoice === '+50'} onClick={() => setSpecialChoice('+50')} label="+50" />
              <ToggleOption active={specialChoice === '45-49'} onClick={() => setSpecialChoice('45-49')} label="45-49" />
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button type="button" className="secondary-btn" onClick={handleClose} disabled={applying}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleApply}
              disabled={applying || !hasChanges || count === 0}
            >
              {applying ? 'Aplicando...' : `Aplicar a ${count} corredor(es)`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
