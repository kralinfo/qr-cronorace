// UI only: formulário inline para editar nome e data de uma corrida já cadastrada.
import React, { useState } from 'react'

/** @param {{ race: import('./races.types.js').Race, onSave: (raceId: string, details: { name: string, eventDate: string }) => Promise<boolean>, onCancel: () => void }} props */
export default function EditRaceForm({ race, onSave, onCancel }) {
  const [name, setName] = useState(race.name)
  const [eventDate, setEventDate] = useState(race.eventDate ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const ok = await onSave(race.id, { name, eventDate })
    setSaving(false)
    if (ok) onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="edit-race-form">
      <label>Nome da corrida</label>
      <input value={name} onChange={e => setName(e.target.value)} required />
      <label>Data da corrida</label>
      <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
      <div className="edit-race-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  )
}
