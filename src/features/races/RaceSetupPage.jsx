// UI only: criação de uma nova corrida ou seleção de uma corrida já cadastrada para atuar.
import React, { useState } from 'react'
import { useRaces } from './useRaces.js'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { formatDateOnlyBR } from './date-only.formatter.js'
import EditRaceForm from './EditRaceForm.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import ActionsMenu from '../../shared/ActionsMenu.jsx'

/** @param {{ onRaceSelected?: () => void }} props */
export default function RaceSetupPage({ onRaceSelected }) {
  const { races, loading, error, createRace, editRace, removeRace } = useRaces()
  const { activeRace, selectRace } = useActiveRace()
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [editingRaceId, setEditingRaceId] = useState(null)
  const [deletingRace, setDeletingRace] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [search, setSearch] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    const race = await createRace(name, eventDate, distanceKm)
    if (race) {
      setName('')
      setEventDate('')
      setDistanceKm('')
      setShowCreateForm(false)
      selectRace(race)
      onRaceSelected?.()
    }
  }

  const handleSelectRace = (race) => {
    selectRace(race)
    onRaceSelected?.()
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

  const normalizedSearch = search.trim().toLowerCase()
  const visibleRaces = races
    .filter(race => race.name.toLowerCase().includes(normalizedSearch))
    .sort((raceA, raceB) => compareRaces(raceA, raceB, activeRace?.id))

  return (
    <div className="race-setup-page">
      <section className="existing-races-section">
        <div className="races-page-header">
          <button type="button" className="create-race-toggle-btn" onClick={() => setShowCreateForm(prev => !prev)}>
            {showCreateForm ? 'Fechar cadastro de corrida' : 'Cadastrar nova corrida'}
          </button>
          <input
            className="race-search-input"
            placeholder="Buscar corrida pelo nome"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {showCreateForm && (
          <div className="share-panel create-race-panel">
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
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {loading && <p>Carregando...</p>}
        {!loading && visibleRaces.length === 0 && <p>Nenhuma corrida encontrada.</p>}
        {!loading && visibleRaces.length > 0 && (
          <ul>
            {visibleRaces.map(race => (
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
                      {race.id === activeRace?.id ? <span className="race-current-badge">Corrida atual</span> : null}
                    </div>
                  </div>
                  <div className="race-row-actions">
                    <ActionsMenu items={[
                      { label: 'Entrar', onClick: () => handleSelectRace(race) },
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

function compareRaces(raceA, raceB, activeRaceId) {
  const statusDiff = getRacePriority(raceA, activeRaceId) - getRacePriority(raceB, activeRaceId)
  if (statusDiff !== 0) return statusDiff

  const dateA = Date.parse(raceA.createdAt ?? '')
  const dateB = Date.parse(raceB.createdAt ?? '')
  if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) return dateB - dateA

  return raceA.name.localeCompare(raceB.name, 'pt-BR')
}

function getRacePriority(race, activeRaceId) {
  if (race.id === activeRaceId) return 0
  if (race.startTime && !race.endTime) return 1
  if (!race.startTime) return 2
  return 3
}


