import React, { useState } from 'react'
import { useResults } from './useResults.js'
import { formatDateTimeBR, formatTimeOnlyBR } from './date.formatter.js'
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
  const filteredPlacements = categoryFilter === 'ALL'
    ? placements
    : placements.filter(p => {
        const runner = runnersById[p.barcode]
        return (runner?.category ?? '') === categoryFilter
      })
  const getRunnerNumber = (barcode) => runnersById[barcode]?.number ?? null
  const getRunnerName = (barcode) => runnerNameById[barcode] ?? null

  const rankingText = activeRace
    ? buildRankingText(activeRace.name, placements, getRunnerName, getRunnerNumber)
    : ''

  return (
    <div className="results-page">
      <section className="placement-section">
        <div className="results-header-row">
          <h2>Ranking</h2>
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
            {showShare ? 'Fechar' : 'Compartilhar ranking'}
          </button>
        </div>

        {activeRace && (
          <div className="results-race-status-wrap">
            <span className={`race-status-pill ${activeRace.endTime ? 'finished' : activeRace.startTime ? 'running' : 'pending'}`}>
              {activeRace.startTime && !activeRace.endTime && <span className="status-dot green" />}
              {activeRace.endTime ? 'Corrida encerrada' : activeRace.startTime ? 'Corrida em andamento' : 'Corrida ainda não iniciada'}
            </span>
          </div>
        )}

        <p className="results-progress-meta">
          {arrivedCount} de {runners.length} chegaram
          {' · '}
          {runners.length} corredor{runners.length === 1 ? '' : 'es'}
        </p>

        <div className="ranking-side-lists" aria-label="Listas de corredores">
          <section className="ranking-side-list subtle">
            <h3>Corredores na prova</h3>
            {runners.length === 0 ? (
              <p>Nenhum corredor cadastrado.</p>
            ) : runnersStillRunning.length === 0 ? (
              <p>Todos os corredores já chegaram!</p>
            ) : (
              <ul>
                {runnersStillRunning.map(r => (
                  <li key={`all-${r.id}`}>
                    <strong>Nº {r.number ?? '—'}</strong> · {r.name}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ranking-side-list arrived">
            <h3>Ranking de chegada</h3>
            {rankedArrivals.length === 0 ? (
              <p>Ainda sem chegadas.</p>
            ) : (
              <ul>
                {rankedArrivals.map(item => (
                  <li key={`arrived-${item.barcode}`}>
                    <div>
                      <strong>{item.position}º</strong> · Nº {item.runner?.number ?? '—'} · {item.name}
                    </div>
                    <div className="ranking-arrived-sub">
                      <span>Tempo: <strong>{item.displayTime}</strong></span>
                      {' · '}
                      <span>Chegada: <strong>{item.arrivalTime}</strong></span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
        {filteredPlacements.length === 0 ? (
          <p>Nenhum resultado registrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Número</th>
                <th>Nome</th>
                <th>Hora Chegada</th>
                <th>Tempo</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlacements.map(p => {
                const runner = runnersById[p.barcode]
                const runnerNumber = runner?.number ?? p.runnerNumber ?? '—'
                const arrivalTime = formatTimeOnlyBR(p.dateTime)
                const duration = p.elapsedMs != null ? formatDuration(p.elapsedMs) : '—'
                return (
                  <tr key={`${p.barcode}-${p.position}`}>
                    <td><strong>{p.position}º</strong></td>
                    <td><span className="results-number-badge">Nº {runnerNumber}</span></td>
                    <td>{p.runnerName ?? runnerNameById[p.barcode] ?? '—'}</td>
                    <td className="results-arrival-time">{arrivalTime}</td>
                    <td><strong>{duration}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}


