// UI only: modal para edição de dados do corredor com fluxo Continuar -> Sim/Não.
import React, { useState } from 'react'
import { maskCpf } from './runner-formatter.service.js'
import { IconClose } from '../../shared/Icons.jsx'

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
  const [confirming, setConfirming] = useState(false)
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

  const handleContinue = (e) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Por favor, informe o nome do corredor.')
      return
    }
    if (!number.trim()) {
      setError('Por favor, informe o número de peito do corredor.')
      return
    }
    setConfirming(true)
  }

  const handleConfirmSave = async () => {
    setError(null)
    setSaving(true)

    try {
      const targetId = runner.id || runner.token
      const success = await onSave(targetId, {
        name: name.trim(),
        number: number.trim(),
        cpf: cpf.trim() || undefined,
        raceId
      })
      if (success) {
        onClose()
      } else {
        setConfirming(false)
      }
    } catch (err) {
      setError(err?.message || 'Falha ao salvar alterações.')
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  const handleInputFocus = (e) => {
    // Garante que o campo em edição role para o centro visível mesmo com teclado aberto no celular
    setTimeout(() => {
      e.target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
  }

  const targetRaceName = races.find(r => r.id === raceId)?.name || 'Corrida'

  return (
    <div
      className="modal-overlay edit-runner-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="edit-runner-modal" onClick={e => e.stopPropagation()}>
        <div className="runner-history-header">
          <div>
            <h2>Editar Corredor</h2>
            {runner.cpf ? (
              <p className="runner-history-subtitle">CPF: <strong>{runner.cpf}</strong></p>
            ) : null}
          </div>
          <button type="button" className="menu-close-btn" onClick={onClose} aria-label="Fechar">
            <IconClose size={16} />
          </button>
        </div>

        {confirming ? (
          <div className="form-confirm-prompt">
            <h3 className="form-confirm-title">Confirmar alterações</h3>
            <p className="form-confirm-desc">
              Deseja confirmar as alterações deste corredor?
            </p>
            <div className="form-confirm-summary">
              <p><strong>Nome:</strong> {name}</p>
              <p><strong>Número:</strong> {number}</p>
              {cpf && <p><strong>CPF:</strong> {cpf}</p>}
              <p><strong>Corrida:</strong> {targetRaceName}</p>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="form-confirm-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setConfirming(false)}
                disabled={saving}
              >
                Não
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Sim'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleContinue} className="edit-runner-form">
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
                onFocus={handleInputFocus}
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
                onFocus={handleInputFocus}
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
                onFocus={handleInputFocus}
                onChange={e => setCpf(maskCpf(e.target.value))}
                maxLength={14}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="edit-runner-actions">
              <button type="submit" className="primary-btn continue-btn" disabled={saving}>
                Continuar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
