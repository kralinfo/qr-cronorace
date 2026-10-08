// UI only: criação de uma nova corrida ou seleção de uma corrida já cadastrada para atuar.
import React, { useState } from 'react'
import { useRaces } from './useRaces.js'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { buildRegistrationLink } from './share-link.service.js'

export default function RaceSetupPage() {
  const { races, loading, error, createRace } = useRaces()
  const { selectRace } = useActiveRace()
  const [name, setName] = useState('')
  const [sharingRaceId, setSharingRaceId] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    const race = await createRace(name)
    if (race) {
      setName('')
      selectRace(race)
    }
  }

  const toggleShare = (raceId) => {
    setSharingRaceId(prev => prev === raceId ? null : raceId)
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
                  <span>{race.name}</span>
                  <div className="race-row-actions">
                    <button onClick={() => selectRace(race)}>Entrar</button>
                    <button className="secondary-btn" onClick={() => toggleShare(race.id)}>
                      {sharingRaceId === race.id ? 'Fechar' : 'Link de cadastro'}
                    </button>
                  </div>
                </div>
                {sharingRaceId === race.id && (
                  <div className="share-panel">
                    <p>Envie o link e o código abaixo para a pessoa que vai ajudar a cadastrar corredores:</p>
                    <label>Link</label>
                    <input readOnly value={buildRegistrationLink()} onFocus={e => e.target.select()} />
                    <label>Código da corrida</label>
                    <input readOnly value={race.id} onFocus={e => e.target.select()} />
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

