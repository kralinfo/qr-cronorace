// UI only: criação de uma nova corrida ou seleção de uma corrida já cadastrada para atuar.
import React, { useState } from 'react'
import { useRaces } from './useRaces.js'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { formatDateOnlyBR } from './date-only.formatter.js'
import EditRaceForm from './EditRaceForm.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import ActionsMenu from '../../shared/ActionsMenu.jsx'

export default function RaceSetupPage() {
  const { races, loading, error, createRace, editRace, removeRace } = useRaces()
  const { selectRace } = useActiveRace()
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [editingRaceId, setEditingRaceId] = useState(null)
  const [deletingRace, setDeletingRace] = useState(null)
  const [showExistingRaces, setShowExistingRaces] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    const race = await createRace(name, eventDate, distanceKm)
    if (race) {
      setName('')
      setEventDate('')
      setDistanceKm('')
      selectRace(race)
    }
  }

  const toggleEdit = (raceId) => {
    setEditingRaceId(prev => prev === raceId ? null : raceId)
  }

  const handleConfirmDelete = async () => {
    if (deletingRace) {
      await removeRace(deletingRace.id)
      setDeletingRace(null)
    }
  }

  return (
    <div className="race-setup-page">
      <section className="create-race-section">
        <h2>Cadastrar corrida</h2>
        <form onSubmit={handleCreate}>
          <input
            placeholder="Nome da corrida (ex: Corrida 10km)"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <label>Data da corrida</label>
          <input
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            required
          />
          <label>Distância (km)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="ex: 10"
            value={distanceKm}
            onChange={e => setDistanceKm(e.target.value)}
          />
          <button type="submit">Criar e entrar na corrida</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="existing-races-section">
        <button type="button" className="toggle-existing-races-btn" onClick={() => setShowExistingRaces(prev => !prev)}>
          {showExistingRaces ? 'Ocultar corridas já cadastradas' : 'Ver corridas já cadastradas'}
        </button>
        {showExistingRaces && (
          <>
            {loading && <p>Carregando...</p>}
            {!loading && races.length === 0 && <p>Nenhuma corrida cadastrada ainda.</p>}
            {!loading && races.length > 0 && (
              <ul>
                {races.map(race => (
                  <li key={race.id}>
                    <div className="race-row">
                      <div className="race-row-info">
                        <strong className="race-row-name">{race.name}</strong>
                        <div className="race-row-meta">
                          {race.eventDate && <span className="race-event-date">{formatDateOnlyBR(race.eventDate)}</span>}
                          {race.distanceKm ? <span className="race-event-date">{race.distanceKm} km</span> : null}
                          <span className={`race-status-badge ${race.endTime ? 'finished' : race.startTime ? 'running' : 'pending'}`}>
                            {race.endTime ? 'Encerrada' : race.startTime ? 'Em andamento' : 'Não iniciada'}
                          </span>
                        </div>
                      </div>
                      <div className="race-row-actions">
                        <ActionsMenu items={[
                          { label: 'Entrar', onClick: () => selectRace(race) },
                          { label: 'Editar', onClick: () => toggleEdit(race.id) },
                          { label: 'Excluir', onClick: () => setDeletingRace(race), danger: true }
                        ]} />
                      </div>
                    </div>
                    {editingRaceId === race.id && (
                      <div className="share-panel">
                        <EditRaceForm race={race} onSave={editRace} onCancel={() => setEditingRaceId(null)} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {deletingRace && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir a corrida "${deletingRace.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir corrida"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingRace(null)}
        />
      )}
    </div>
  )
}


