// UI only: modal para edição de dados do corredor (nome, número de peito, CPF e corrida)
import React, { useState } from 'react'
import { maskCpf } from './runner-formatter.service.js'

/**
 * @param {{
 *   runner: import('./runners.types.js').Runner,
 *   races: Array<import('../races/races.types.js').Race>,
 *   onSave: (id: string, updates: { name: string, number: string, cpf?: string, raceId: string }) => Promise<boolean|null|undefined>,
 *   onClose: () => void
 * }} props
 */
export default function EditRunnerModal({ runner, races, onSave, onClose }) {
  const [name, setName] = useState(runner.name || '')
  const [number, setNumber] = useState(runner.number || '')
  const [cpf, setCpf] = useState(runner.cpf || '')
  const [raceId, setRaceId] = useState(runner.raceId || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleNumberKeyDown = (e) => {
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End'
      ].includes(e.key)
    ) {
      return
    }
    if (e.ctrlKey || e.metaKey) {
      return
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handleNumberPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const digitsOnly = pasted.replace(/\D/g, '')
    if (digitsOnly) {
      setNumber(prev => `${prev}${digitsOnly}`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const success = await onSave(runner.id, {
        name,
        number,
        cpf,
        raceId
      })
      if (success) {
        onClose()
      }
    } catch (err) {
      setError(err?.message || 'Falha ao salvar alterações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="edit-runner-modal" onClick={e => e.stopPropagation()}>
        <div className="runner-history-header">
          <div>
            <h2>Editar Corredor</h2>
            {runner.cpf ? (
              <p className="runner-history-subtitle">CPF: <strong>{runner.cpf}</strong></p>
            ) : null}
          </div>
          <button type="button" className="menu-close-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-runner-form">
          <div className="edit-runner-field">
            <label htmlFor="edit-runner-race">Corrida:</label>
            <select
              id="edit-runner-race"
              value={raceId}
              onChange={e => setRaceId(e.target.value)}
              required
            >
              {races.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-runner-field">
            <label htmlFor="edit-runner-number">
              Número de peito:
              <span className="field-hint"> (Salvo com 4 dígitos: ex: 8 vira 0008)</span>
            </label>
            <input
              id="edit-runner-number"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="ex: 104 ou 8"
              value={number}
              onKeyDown={handleNumberKeyDown}
              onPaste={handleNumberPaste}
              onChange={e => setNumber(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="edit-runner-field">
            <label htmlFor="edit-runner-name">
              Nome completo:
              <span className="field-hint"> (Iniciais ajustadas automaticamente)</span>
            </label>
            <input
              id="edit-runner-name"
              type="text"
              placeholder="ex: Carlos Silva"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="edit-runner-field">
            <label htmlFor="edit-runner-cpf">
              CPF do corredor:
              <span className="field-hint"> (Evita cadastros duplicados)</span>
            </label>
            <input
              id="edit-runner-cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={e => setCpf(maskCpf(e.target.value))}
              maxLength={14}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="edit-runner-actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
