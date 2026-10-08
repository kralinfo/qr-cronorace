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
  const arrivedBarcodes = new Set(placements.map(p => p.barcode).filter(Boolean))
  const arrivedCount = arrivedBarcodes.size
  const runnerNameById = Object.fromEntries(runners.map(r => [r.id, r.name]))
  const runnersById = Object.fromEntries(runners.map(r => [r.id, r]))
  const rankedArrivals = []
  const seenArrivalIds = new Set()
  placements.forEach((p) => {
    if (!p.barcode || seenArrivalIds.has(p.barcode)) return
    seenArrivalIds.add(p.barcode)
    const displayTime = p.elapsedMs != null
      ? formatDuration(p.elapsedMs)
      : formatDateTimeBR(p.dateTime)
    rankedArrivals.push({
      position: rankedArrivals.length + 1,
      runner: runnersById[p.barcode] ?? null,
      barcode: p.barcode,
      name: p.runnerName ?? runnerNameById[p.barcode] ?? '—',
      displayTime
    })
  })
  const showTop10 = runners.length > 50
  const top10Arrivals = rankedArrivals.slice(0, 10)

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
          {race?.startTime && (
            <p className="public-ranking-meta">
              {arrivedCount} de {runners.length} chegaram
              {' · '}
              {runners.length} corredor{runners.length === 1 ? '' : 'es'}
              {race.distanceKm ? ` · ${race.distanceKm} km` : ''}
            </p>
          )}
        </div>
        <RaceChronometer startTime={race?.startTime} endTime={race?.endTime} className="public-ranking-chronometer" />
        {race?.endTime ? (
          <span className="live-badge finished">■ Encerrada</span>
        ) : race?.startTime ? (
          <span className="live-badge">● Ao vivo</span>
        ) : (
          <span className="live-badge pending">○ Aguardando largada</span>
        )}
      </header>

      {loading && <p>Carregando...</p>}
      {!loading && placements.length === 0 && <p>Nenhum resultado registrado ainda.</p>}

      <div className="public-ranking-side-lists" aria-label="Corredores e chegadas">
        <section className="public-ranking-side-list subtle">
          <h2>Corredores na prova</h2>
          {runners.length === 0 ? (
            <p>Nenhum corredor cadastrado.</p>
          ) : (
            <ul>
              {runners.map(r => (
                <li key={`tv-all-${r.id}`}>
                  <strong>Nº {r.number ?? '—'}</strong> · {r.name}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="public-ranking-side-list arrived">
          <h2>Ranking de chegada</h2>
          {rankedArrivals.length === 0 ? (
            <p>Ainda sem chegadas.</p>
          ) : (
            <div className="public-ranking-arrived-table" role="table" aria-label="Ranking de chegada">
              <div className="public-ranking-arrived-head" role="row">
                <span>Pos.</span>
                <span>Número</span>
                <span>Nome</span>
                <span>Tempo</span>
              </div>
              {rankedArrivals.map((item) => (
                <div key={`tv-arrived-${item.barcode}`} className="public-ranking-arrived-row" role="row">
                  <span>{item.position}º</span>
                  <span>{item.runner?.number ?? '—'}</span>
                  <span>{item.name}</span>
                  <span>{item.displayTime}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showTop10 && (
        <section className="public-top10-section" aria-label="Top 10 colocados">
          <h2>Top 10 colocados</h2>
          {top10Arrivals.length === 0 ? (
            <p>Aguardando as primeiras chegadas...</p>
          ) : (
            <ol className="public-top10-list">
              {top10Arrivals.map((item) => (
                <li key={`top10-${item.barcode}`}>
                  <span className="public-top10-name">{item.name}</span>
                  <span className="public-top10-extra">Nº {item.runner?.number ?? '—'} · {item.displayTime}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}

