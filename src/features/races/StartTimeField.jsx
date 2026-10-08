// UI only: definição/edição do horário de largada de uma corrida.
import React, { useState } from 'react'

/** @param {Date} date @returns {string} valor compatível com <input type="datetime-local"> */
function toDateTimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** @param {{ race: import('./races.types.js').Race, onSave: (raceId: string, startTimeIso: string) => Promise<void> }} props */
export default function StartTimeField({ race, onSave }) {
  const [value, setValue] = useState(race.startTime ? toDateTimeLocalValue(new Date(race.startTime)) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!value) return
    setSaving(true)
    try {
      await onSave(race.id, new Date(value).toISOString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="start-time-field">
      <label>Horário da largada</label>
      <div className="copyable-field-row">
        <input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} />
        <button type="button" onClick={handleSave} disabled={saving || !value}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      {race.startTime && (
        <p className="start-time-current">
          Largada atual: {new Date(race.startTime).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  )
}
