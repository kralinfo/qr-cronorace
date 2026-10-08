// UI only: exibição do ranking de colocação dos corredores.
import React from 'react'
import { useResults } from './useResults.js'
import { formatDateTimeBR } from './date.formatter.js'
import { useRunners } from '../runners/useRunners.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'

export default function ResultsPage() {
  const { activeRace } = useActiveRace()
  const { placements, loading, error } = useResults(activeRace?.id)
  const { runners } = useRunners(activeRace?.id)

  const runnerNameById = Object.fromEntries(runners.map(r => [r.id, r.name]))

  return (
    <div className="results-page">
      <section className="placement-section">
        <h2>Ranking</h2>
        {loading && <p>Carregando...</p>}
        {error && <p className="error">{error}</p>}
        {placements.length === 0 ? (
          <p>Nenhum resultado registrado ainda.</p>
        ) : (
          <table>
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
      </section>
    </div>
  )
}


