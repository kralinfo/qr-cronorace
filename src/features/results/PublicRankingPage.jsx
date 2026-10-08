// UI only: ranking público em tempo real, pensado para ser exibido em TV/telão (somente leitura).
import React, { useEffect, useState } from 'react'
import { subscribeToRace } from '../races/races.repository.js'
import { useResults } from './useResults.js'
import { withElapsedTime } from './results.rules.js'
import { useRunners } from '../runners/useRunners.js'
import { formatDateTimeBR } from './date.formatter.js'
import { formatDuration } from './duration.formatter.js'
import RaceChronometer from '../races/RaceChronometer.jsx'

/** @returns {string|null} id da corrida informado na URL (?corrida=...) */
function getRaceIdFromUrl() {
  return new URLSearchParams(window.location.search).get('corrida')
}

export default function PublicRankingPage() {
  const raceId = getRaceIdFromUrl()
  const [race, setRace] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const { placements: rawPlacements, loading } = useResults(raceId)
  const { runners } = useRunners(raceId)

  useEffect(() => {
    if (!raceId) {
      setNotFound(true)
      return
    }
    const unsubscribe = subscribeToRace(raceId, (found) => {
      if (found) setRace(found)
      else setNotFound(true)
    })
    return unsubscribe
  }, [raceId])

  const placements = withElapsedTime(rawPlacements, race?.startTime)
  const runnerNameById = Object.fromEntries(runners.map(r => [r.id, r.name]))

  if (notFound) {
    return (
      <div className="public-ranking-page">
        <p className="error">Link de ranking inválido ou corrida não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="public-ranking-page">
      <header className="public-ranking-header">
        <div>
          <h1>{race?.name ?? 'Carregando...'}</h1>
          {race?.startTime && (
            <p className="public-ranking-start-time">
              Largada às {new Date(race.startTime).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <RaceChronometer startTime={race?.startTime} className="public-ranking-chronometer" />
        <span className="live-badge">● Ao vivo</span>
      </header>

      {loading && <p>Carregando...</p>}
      {!loading && placements.length === 0 && <p>Nenhum resultado registrado ainda.</p>}

      {placements.length > 0 && (
        <table className="public-ranking-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Nome</th>
              <th>Id</th>
              <th>Tempo</th>
            </tr>
          </thead>
          <tbody>
            {placements.map(p => (
              <tr key={`${p.barcode}-${p.position}`}>
                <td>{p.position}º</td>
                <td>{p.runnerName ?? runnerNameById[p.barcode] ?? '—'}</td>
                <td>{p.barcode}</td>
                <td>{p.elapsedMs != null ? formatDuration(p.elapsedMs) : formatDateTimeBR(p.dateTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

