// UI only: ranking público em tempo real, pensado para ser exibido em TV/telão (somente leitura).
import React, { useEffect, useState } from 'react'
import { getRaceById } from '../races/races.repository.js'
import { useResults } from './useResults.js'
import { useRunners } from '../runners/useRunners.js'
import { formatDateTimeBR } from './date.formatter.js'

/** @returns {string|null} id da corrida informado na URL (?corrida=...) */
function getRaceIdFromUrl() {
  return new URLSearchParams(window.location.search).get('corrida')
}

export default function PublicRankingPage() {
  const raceId = getRaceIdFromUrl()
  const [race, setRace] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const { placements, loading } = useResults(raceId)
  const { runners } = useRunners(raceId)

  useEffect(() => {
    if (!raceId) {
      setNotFound(true)
      return
    }
    (async () => {
      const found = await getRaceById(raceId)
      if (found) setRace(found)
      else setNotFound(true)
    })()
  }, [raceId])

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
        <h1>{race?.name ?? 'Carregando...'}</h1>
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
              <th>Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            {placements.map(p => (
              <tr key={`${p.barcode}-${p.position}`}>
                <td>{p.position}º</td>
                <td>{p.runnerName ?? runnerNameById[p.barcode] ?? '—'}</td>
                <td>{p.barcode}</td>
                <td>{formatDateTimeBR(p.dateTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
