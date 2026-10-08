// UI only: criação de uma nova corrida ou seleção de uma corrida já cadastrada para atuar.
import React, { useState } from 'react'
import { useRaces } from './useRaces.js'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { buildRegistrationLink } from './share-link.service.js'
import { formatDateOnlyBR } from './date-only.formatter.js'
import CopyableField from './CopyableField.jsx'
import StartTimeField from './StartTimeField.jsx'

export default function RaceSetupPage() {
  const { races, loading, error, createRace, setStartTime } = useRaces()
  const { selectRace } = useActiveRace()
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [sharingRaceId, setSharingRaceId] = useState(null)
  const [editingStartTimeId, setEditingStartTimeId] = useState(null)

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
                    <button className="secondary-btn" onClick={() => toggleStartTime(race.id)}>
                      {editingStartTimeId === race.id ? 'Fechar' : 'Largada'}
                    </button>
                    <button className="secondary-btn" onClick={() => toggleShare(race.id)}>
                      {sharingRaceId === race.id ? 'Fechar' : 'Link de cadastro'}
                    </button>
                  </div>
                </div>
                {editingStartTimeId === race.id && (
                  <div className="share-panel">
                    <StartTimeField race={race} onSave={setStartTime} />
                  </div>
                )}
                {sharingRaceId === race.id && (
                  <div className="share-panel">
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
    </div>
  )
}

