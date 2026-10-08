// UI only: exibição do ranking de colocação dos corredores.
import React, { useState } from 'react'
import { useResults } from './useResults.js'
import { formatDateTimeBR } from './date.formatter.js'
import { formatDuration } from './duration.formatter.js'
import { withElapsedTime } from './results.rules.js'
import { useRunners } from '../runners/useRunners.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'
import { buildRankingLink } from '../races/share-link.service.js'
import { buildRankingText, buildEmailShareLink, buildWhatsAppShareLink } from './ranking-share.service.js'
import CopyableField from '../races/CopyableField.jsx'

export default function ResultsPage() {
  const { activeRace } = useActiveRace()
  const { placements: rawPlacements, loading, error } = useResults(activeRace?.id)
  const { runners } = useRunners(activeRace?.id)
  const [showShare, setShowShare] = useState(false)

  const placements = withElapsedTime(rawPlacements, activeRace?.startTime)
  const runnerNameById = Object.fromEntries(runners.map(r => [r.id, r.name]))
  const getRunnerName = (barcode) => runnerNameById[barcode] ?? null

  const rankingText = activeRace ? buildRankingText(activeRace.name, placements, getRunnerName) : ''

  return (
    <div className="results-page">
      <section className="placement-section">
        <div className="results-header-row">
          <h2>Ranking</h2>
          <button className="secondary-btn" onClick={() => setShowShare(prev => !prev)}>
            {showShare ? 'Fechar' : 'Compartilhar ranking'}
          </button>
        </div>

        {showShare && activeRace && (
          <div className="share-panel">
            <p>Compartilhe este link para acompanhar a classificação em tempo real (ex: numa TV/telão):</p>
            <CopyableField label="Link do ranking" value={buildRankingLink(activeRace.id)} />

            <p>Ou envie a classificação atual por:</p>
            <div className="share-buttons-row">
              <a className="share-btn whatsapp" href={buildWhatsAppShareLink(rankingText)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <a className="share-btn email" href={buildEmailShareLink(rankingText)}>
                E-mail
              </a>
            </div>
          </div>
        )}

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
      </section>
    </div>
  )
}


