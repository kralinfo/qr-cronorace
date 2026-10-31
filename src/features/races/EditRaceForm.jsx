// UI only: formulário de edição de dados da corrida com seletor moderno e fluxo Continuar -> Sim/Não.
import React, { useState } from 'react'
import DatePickerField from '../../shared/DatePickerField.jsx'

/**
 * @param {{
 *   race: import('./races.types.js').Race,
 *   onSave: (raceId: string, details: { name: string, eventDate: string, distanceKm?: string|number }) => Promise<boolean>,
 *   onCancel: () => void
 * }} props
 */
export default function EditRaceForm({ race, onSave, onCancel }) {
  const [name, setName] = useState(race.name || '')
  const [eventDate, setEventDate] = useState(race.eventDate ?? '')
  const [distanceKm, setDistanceKm] = useState(race.distanceKm ?? '')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleContinue = (e) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Por favor, informe o nome da corrida.')
      return
    }
    setConfirming(true)
  }

  const handleConfirmSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const ok = await onSave(race.id, {
        name: name.trim(),
        eventDate,
        distanceKm: distanceKm ? Number(distanceKm) : null
      })
      if (ok) {
        onCancel()
      } else {
        setError('Não foi possível salvar as alterações da corrida.')
        setConfirming(false)
      }
    } catch (err) {
      setError(err?.message || 'Falha ao salvar as alterações.')
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="edit-race-form-wrap">
      {confirming ? (
        <div className="form-confirm-prompt">
          <div className="form-confirm-icon"></div>
          <h3 className="form-confirm-title">Confirmar alterações</h3>
          <p className="form-confirm-desc">
            Deseja confirmar as alterações desta corrida?
          </p>
          <div className="form-confirm-summary">
            <p><strong>Nome:</strong> {name}</p>
            {eventDate && <p><strong>Data:</strong> {eventDate}</p>}
            {distanceKm && <p><strong>Distância:</strong> {distanceKm} km</p>}
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
        <form onSubmit={handleContinue} className="edit-race-form">
          <div className="form-field-group">
            <label htmlFor="edit-race-name">Nome da corrida</label>
            <input
              id="edit-race-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Corrida de Rua 10km"
              required
            />
          </div>

          <div className="form-field-group">
            <DatePickerField
              id="edit-race-date"
              label="Data da corrida"
              value={eventDate}
              onChange={setEventDate}
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="edit-race-distance">Distância (km)</label>
            <input
              id="edit-race-distance"
              type="number"
              step="0.1"
              min="0"
              value={distanceKm}
              onChange={e => setDistanceKm(e.target.value)}
              placeholder="ex: 5 ou 10"
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="edit-race-actions">
            <button type="submit" className="primary-btn continue-btn">
              Continuar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
