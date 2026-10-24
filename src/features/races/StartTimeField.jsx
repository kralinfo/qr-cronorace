// UI only: definição/edição do horário de largada com design Apple HIG e fluxo Continuar -> Sim/Não.
import React, { useState } from 'react'
import { formatDateTimeBR } from '../results/date.formatter.js'
import { IconClock } from '../../shared/Icons.jsx'

/** @param {Date} date @returns {string} valor compatível com <input type="datetime-local"> */
function toDateTimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * @param {{
 *   race: import('./races.types.js').Race,
 *   onSave: (raceId: string, startTimeIso: string) => Promise<void>,
 *   onClose?: () => void,
 *   runnerCount?: number
 * }} props
 */
export default function StartTimeField({ race, onSave, onClose, runnerCount = 0 }) {
  const [value, setValue] = useState(race.startTime ? toDateTimeLocalValue(new Date(race.startTime)) : '')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleContinue = (e) => {
    e.preventDefault()
    setError(null)
    if (!value) {
      setError('Por favor, informe a data e a hora da largada.')
      return
    }
    setConfirming(true)
  }

  const handleConfirmSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(race.id, new Date(value).toISOString())
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Falha ao definir o horário de largada.')
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="start-time-field-wrap">
      {confirming ? (
        <div className="form-confirm-prompt">
          <div className="form-confirm-icon"><IconClock size={28} /></div>
          <h3 className="form-confirm-title">Confirmar nova largada</h3>
          <p className="form-confirm-desc">
            Deseja confirmar o novo horário de largada desta corrida?
          </p>
          <div className="form-confirm-summary">
            {race.startTime && (
              <p><strong>Largada anterior:</strong> {formatDateTimeBR(race.startTime)}</p>
            )}
            <p><strong>Nova largada:</strong> {formatDateTimeBR(new Date(value).toISOString())}</p>
          </div>

          {error && <p className="error">{error}</p>}

          {runnerCount === 0 && (
            <p className="error" style={{ marginTop: 8 }}>
              Atenção: esta corrida não tem corredores cadastrados.
            </p>
          )}
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
              {saving ? 'Definindo...' : 'Sim'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleContinue} className="start-time-form">
          <p className="start-time-desc">
            Ajuste a data e o horário em que a prova teve sua largada oficial. O cronômetro e a apuração dos tempos dos atletas serão recalculados a partir deste momento.
          </p>

          {race.startTime && (
            <div className="start-time-current-badge">
              <span className="start-time-current-label">Largada atual:</span>
              <strong>{new Date(race.startTime).toLocaleString('pt-BR')}</strong>
            </div>
          )}

          <div className="form-field-group">
            <label htmlFor="start-time-input">Novo horário de largada:</label>
            <input
              id="start-time-input"
              type="datetime-local"
              className="start-time-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="start-time-actions">
            <button
              type="submit"
              className="primary-btn continue-btn"
              disabled={saving || !value}
            >
              Continuar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
