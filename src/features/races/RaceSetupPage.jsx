// UI only: criação de uma nova corrida ou seleção de uma corrida já cadastrada para atuar.
import React, { useState } from 'react'
import { useRaces } from './useRaces.js'
import { useActiveRace } from './ActiveRaceContext.jsx'

export default function RaceSetupPage() {
  const { races, loading, error, createRace } = useRaces()
  const { selectRace } = useActiveRace()
  const [name, setName] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    const race = await createRace(name)
    if (race) {
      setName('')
      selectRace(race)
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
                {race.name}
                <button onClick={() => selectRace(race)}>Entrar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
