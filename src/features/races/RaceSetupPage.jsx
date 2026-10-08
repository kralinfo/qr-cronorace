// UI only: criação de uma nova corrida ou seleção de uma corrida já cadastrada para atuar.
import React, { useState } from 'react'
import { useRaces } from './useRaces.js'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { buildRegistrationLink } from './share-link.service.js'
import { formatDateOnlyBR } from './date-only.formatter.js'
import CopyableField from './CopyableField.jsx'
import StartTimeField from './StartTimeField.jsx'
import EditRaceForm from './EditRaceForm.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import ActionsMenu from '../../shared/ActionsMenu.jsx'

export default function RaceSetupPage() {
  const { races, loading, error, createRace, setStartTime, editRace, removeRace } = useRaces()
  const { selectRace } = useActiveRace()
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [sharingRaceId, setSharingRaceId] = useState(null)
  const [editingStartTimeId, setEditingStartTimeId] = useState(null)
  const [editingRaceId, setEditingRaceId] = useState(null)
  const [deletingRace, setDeletingRace] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    const race = await createRace(name, eventDate)
    if (race) {
      setName('')
      setEventDate('')
      selectRace(race)
    }
  }

  const toggleShare = (raceId) => {
    setSharingRaceId(prev => prev === raceId ? null : raceId)
  }

  const toggleStartTime = (raceId) => {
    setEditingStartTimeId(prev => prev === raceId ? null : raceId)
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
          <button type="submit">Criar e entrar na corrida</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="existing-races-section">
        <h2>Corridas já cadastradas</h2>
        {loading && <p>Carregando...</p>}
        {!loading && races.length === 0 && <p>Nenhuma corrida cadastrada ainda.</p>}
        {!loading && races.length > 0 && (
          <ul>
            {races.map(race => (
              <li key={race.id}>
                <div className="race-row">
                  <span>
                    {race.name}
                    {race.eventDate && <span className="race-event-date"> — {formatDateOnlyBR(race.eventDate)}</span>}
                  </span>
                  <div className="race-row-actions">
                    <button onClick={() => selectRace(race)}>Entrar</button>
                    <ActionsMenu items={[
                      { label: 'Largada', onClick: () => toggleStartTime(race.id) },
                      { label: 'Link de cadastro', onClick: () => toggleShare(race.id) },
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
                {editingStartTimeId === race.id && (
                  <div className="share-panel">
                    <button className="close-panel-btn" onClick={() => toggleStartTime(race.id)}>Fechar ✕</button>
                    <StartTimeField race={race} onSave={setStartTime} />
                  </div>
                )}
                {sharingRaceId === race.id && (
                  <div className="share-panel">
                    <button className="close-panel-btn" onClick={() => toggleShare(race.id)}>Fechar ✕</button>
                    <p>Envie o link e o código abaixo para a pessoa que vai ajudar a cadastrar corredores:</p>
                    <CopyableField label="Link" value={buildRegistrationLink()} />
                    <CopyableField label="Código da corrida" value={race.id} />
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

