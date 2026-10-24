import React, { useState } from 'react'
import { useResults } from './useResults.js'
import { formatTimeOnlyBR } from './date.formatter.js'
import { formatDuration } from './duration.formatter.js'
import { withElapsedTime } from './results.rules.js'
import { useRunners } from '../runners/useRunners.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'
import { buildRankingLink } from '../races/share-link.service.js'
import { buildRankingText, buildEmailShareLink, buildWhatsAppShareLink } from './ranking-share.service.js'
import CopyableField from '../races/CopyableField.jsx'
import { IconClock, IconRunner } from '../../shared/Icons.jsx'

export default function ResultsPage() {
  const { activeRace } = useActiveRace()
  const { placements: rawPlacements, loading, error } = useResults(activeRace?.id)
  const { runners } = useRunners(activeRace?.id)
  const [showShare, setShowShare] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  const placements = withElapsedTime(rawPlacements, activeRace?.startTime)
  const arrivedBarcodes = new Set(placements.map(p => p.barcode).filter(Boolean))
  const arrivedCount = arrivedBarcodes.size
  const runnersStillRunning = runners.filter(r => !arrivedBarcodes.has(r.id))
  const runnerNameById = Object.fromEntries(runners.map(r => [r.id, r.name]))
  const runnersById = Object.fromEntries(runners.map(r => [r.id, r]))
  const rankedArrivals = []
  const seenArrivalIds = new Set()
  placements.forEach((p) => {
    if (!p.barcode || seenArrivalIds.has(p.barcode)) return
    const runner = runnersById[p.barcode]
    if (categoryFilter !== 'ALL' && (runner?.category ?? '') !== categoryFilter) return
    seenArrivalIds.add(p.barcode)
    const displayTime = p.elapsedMs != null
      ? formatDuration(p.elapsedMs)
      : '—'
    const arrivalTime = formatTimeOnlyBR(p.dateTime)
    rankedArrivals.push({
      position: rankedArrivals.length + 1,
      runner: runnersById[p.barcode] ?? null,
      barcode: p.barcode,
      name: p.runnerName ?? runnerNameById[p.barcode] ?? '—',
      displayTime,
      arrivalTime
    })
  })
  const getRunnerNumber = (barcode) => runnersById[barcode]?.number ?? null
  const getRunnerName = (barcode) => runnerNameById[barcode] ?? null

  const rankingText = activeRace
    ? buildRankingText(activeRace.name, placements, getRunnerName, getRunnerNumber)
    : ''

  return (
    <div className="results-page">
      <section className="results-status-card">
        <div className="results-status-row">
          <div className="results-filter-row">
            <label className="results-filter-label" htmlFor="category-filter">Categoria:</label>
            <select
              id="category-filter"
              className="results-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Todas</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="PCD">PCD</option>
            </select>
          </div>
          <button className="secondary-btn" onClick={() => setShowShare(prev => !prev)}>
            {showShare ? 'Fechar' : 'Compartilhar'}
          </button>
        </div>

        <div className="results-status-info">
          <span className="results-status-item running">
            <IconClock size={16} /> Corrida em andamento
          </span>
          <span className="results-status-item">
            <IconRunner size={16} /> {arrivedCount} de {runners.length} chegaram
          </span>
        </div>
      </section>

      <section className="ranking-arrived-section">
        <h3>Ranking de chegada</h3>
        {rankedArrivals.length === 0 ? (
          <p>Ainda sem chegadas.</p>
        ) : (
          <div className="ranking-cards">
            {rankedArrivals.map(item => (
              <div key={`arrived-${item.barcode}`} className="ranking-card">
                <div className="ranking-card-pos">{item.position}º</div>
                <div className="ranking-card-info">
                  <strong className="ranking-card-name">{item.name}</strong>
                  <span className="ranking-card-number">Nº {item.runner?.number ?? '—'}</span>
                </div>
                <div className="ranking-card-times">
                  <span className="ranking-card-time">{item.arrivalTime}</span>
                  <span className="ranking-card-duration">{item.displayTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ranking-running-section">
        <h3>Corredores na prova</h3>
        {runnersStillRunning.length === 0 ? (
          <p>Todos os corredores já chegaram!</p>
        ) : (
          <ul className="ranking-running-list">
            {runnersStillRunning.map(r => (
              <li key={`running-${r.id}`}>
                <span className="ranking-running-number">Nº {r.number ?? '—'}</span>
                <span className="ranking-running-name">{r.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
    </div>
  )
}
