// UI only: ranking público em tempo real, pensado para ser exibido em TV/telão (somente leitura).
import React, { useEffect, useState } from 'react'
import { subscribeToRace } from '../races/races.repository.js'
import { getStoredActiveRaceId } from '../races/active-race.storage.js'
import { useResults } from './useResults.js'
import { withElapsedTime } from './results.rules.js'
import { useRunners } from '../runners/useRunners.js'
import { formatDateTimeBR, formatTimeOnlyBR } from './date.formatter.js'
import { formatDuration } from './duration.formatter.js'
import RaceChronometer from '../races/RaceChronometer.jsx'

/** @returns {string|null} id da corrida informado na URL (?corrida=...) ou corrida ativa */
function getRaceIdFromUrl() {
  return new URLSearchParams(window.location.search).get('corrida') || getStoredActiveRaceId()
}

export default function PublicRankingPage() {
  const raceId = getRaceIdFromUrl()
  const [race, setRace] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const { placements: rawPlacements, loading } = useResults(raceId, race?.startTime)
  const { runners } = useRunners(raceId)
  const [liveOverrides, setLiveOverrides] = useState([])

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

  // Escuta chegadas em tempo real instantâneo e resets via BroadcastChannel / postMessage
  useEffect(() => {
    const handleArrivalData = (data) => {
      if (data?.type === 'RECORD_ARRIVAL') {
        if (!data.raceId || data.raceId === raceId) {
          setLiveOverrides(prev => {
            const cleanBib = data.bib ? String(parseInt(data.bib, 10)) : ''
            const incomingBarcode = data.barcode || (raceId ? `${raceId}_bib_${cleanBib}` : `bib_${cleanBib}`)
            const newItem = {
              barcode: incomingBarcode,
              runnerNumber: data.bib,
              runnerName: data.runnerName,
              time: data.time || null,
              elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : null,
              dateTime: new Date().toISOString(),
              timestamp: String(Date.now()),
              raceId: data.raceId || raceId
            }
            const exists = prev.find(p => p.barcode === incomingBarcode)
            if (exists) {
              return prev.map(p => p.barcode === incomingBarcode ? { ...p, ...newItem } : p)
            }
            return [...prev, newItem]
          })
        }
      } else if (data?.type === 'RACE_RESET') {
        if (!data.raceId || data.raceId === raceId) {
          setLiveOverrides([])
        }
      }
    }

    let bc = null
    try {
      bc = new BroadcastChannel('qr-cronorace-channel')
      bc.onmessage = (e) => handleArrivalData(e.data)
    } catch(err) {}

    const onWindowMsg = (e) => handleArrivalData(e.data)
    window.addEventListener('message', onWindowMsg)

    return () => {
      if (bc) bc.close()
      window.removeEventListener('message', onWindowMsg)
    }
  }, [raceId])

  // Quando o Firestore esvazia rawPlacements (após reset), zera também liveOverrides
  useEffect(() => {
    if (rawPlacements && rawPlacements.length === 0) {
      setLiveOverrides([])
    }
  }, [rawPlacements])

  // Combina chegadas do Firestore com mensagens em tempo real
  const combinedList = React.useMemo(() => {
    const map = new Map()
    for (const p of (rawPlacements || [])) {
      if (p.barcode) map.set(p.barcode, p)
    }
    for (const r of liveOverrides) {
      if (r.barcode) {
        const existing = map.get(r.barcode)
        map.set(r.barcode, { ...existing, ...r })
      }
    }
    return Array.from(map.values())
  }, [rawPlacements, liveOverrides])

  const placements = withElapsedTime(combinedList, race?.startTime)
  const arrivedBarcodes = new Set(placements.map(p => p.barcode).filter(Boolean))
  const arrivedCount = arrivedBarcodes.size
  const runnersStillRunning = runners.filter(r => !arrivedBarcodes.has(r.id))
  const runnerNameById = Object.fromEntries(runners.map(r => [r.id, r.name]))
  const runnersById = Object.fromEntries(runners.map(r => [r.id, r]))
  const allRankedArrivals = []
  const seenArrivalIds = new Set()

  placements.forEach((p) => {
    if (!p.barcode || seenArrivalIds.has(p.barcode)) return
    const runner = runnersById[p.barcode] ?? null

    seenArrivalIds.add(p.barcode)
    const displayTime = p.time
      ? (String(p.time).includes('.') ? String(p.time).split('.')[0] : String(p.time))
      : (p.elapsedMs != null ? formatDuration(p.elapsedMs) : formatTimeOnlyBR(p.dateTime))
    const arrivalTime = formatTimeOnlyBR(p.dateTime)
    allRankedArrivals.push({
      runner: runnersById[p.barcode] ?? null,
      barcode: p.barcode,
      name: p.runnerName ?? runnerNameById[p.barcode] ?? '—',
      category: runner?.category ?? 'GERAL',
      displayTime,
      arrivalTime,
      posCat: 0
    })
  })

  const categoryPositions = {}
  allRankedArrivals.forEach((item) => {
    const category = item.category
    categoryPositions[category] = (categoryPositions[category] ?? 0) + 1
    item.posCat = categoryPositions[category]
  })

  const rankedArrivals = allRankedArrivals
    .filter((item) => {
      if (categoryFilter === 'ALL') return true
      const cat = String(item.category || '').toUpperCase()
      if (categoryFilter === 'MASCULINO') return cat.includes('MASC')
      if (categoryFilter === 'FEMININO') return cat.includes('FEM')
      if (categoryFilter === 'LOCAL') return cat.includes('LOCAL')
      if (categoryFilter === 'VISITANTE') return !cat.includes('LOCAL')
      if (categoryFilter === 'PCD') return cat.includes('PCD')
      if (categoryFilter === 'AGE_50') return (cat.includes('+50') || cat.includes('50')) && !cat.includes('PCD')
      if (categoryFilter === 'AGE_45_49') return cat.includes('45-49') || cat.includes('45 A 49')
      return true
    })
    .map((item, index) => ({
      ...item,
      position: index + 1
    }))

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
        <div className="public-ranking-header-right">
          <select
            className="public-ranking-category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="ALL">Todas as categorias</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMININO">Feminino</option>
            <option value="LOCAL">Local</option>
            <option value="VISITANTE">Visitante</option>
            <option value="PCD">PCD</option>
            <option value="AGE_50">+50</option>
            <option value="AGE_45_49">45-49</option>
          </select>
          <RaceChronometer startTime={race?.startTime} endTime={race?.endTime} className="public-ranking-chronometer" />
          {race?.endTime ? (
            <span className="live-badge finished">Encerrada</span>
          ) : race?.startTime ? (
            <span className="live-badge"><span className="status-dot green" /> Ao vivo</span>
          ) : (
            <span className="live-badge pending">Aguardando largada</span>
          )}
        </div>
      </header>

      {loading && <p>Carregando...</p>}
      {!loading && placements.length === 0 && <p>Nenhum resultado registrado ainda.</p>}

      <div className="public-ranking-side-lists" aria-label="Corredores e chegadas">
        <section className="public-ranking-side-list subtle">
          <h2>Corredores na prova</h2>
          {runners.length === 0 ? (
            <p>Nenhum corredor cadastrado.</p>
          ) : runnersStillRunning.length === 0 ? (
            <p>Todos chegaram!</p>
          ) : (
            <ul>
              {runnersStillRunning.map(r => (
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
            <p>{!race?.startTime ? 'Aguardando largada...' : 'Ainda sem chegadas.'}</p>
          ) : (
            <div className="public-ranking-arrived-scroll">
              <div className="public-ranking-arrived-table" role="table" aria-label="Ranking de chegada">
                <div className="public-ranking-arrived-head" role="row">
                  <span>Pos.</span>
                  <span>Número</span>
                  <span>Nome</span>
                  <span>Pos. Cat.</span>
                  <span>Chegada</span>
                  <span>Tempo</span>
                </div>
                {rankedArrivals.map((item) => (
                  <div key={`tv-arrived-${item.barcode}`} className="public-ranking-arrived-row" role="row">
                    <span>{item.position}º</span>
                    <span>{item.runner?.number ?? '—'}</span>
                    <span>{item.name}</span>
                    <span>{item.posCat}º</span>
                    <span className="tv-arrival-time">{item.arrivalTime}</span>
                    <span>{item.displayTime}</span>
                  </div>
                ))}
              </div>
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
                  <span className="public-top10-extra">
                    Nº {item.runner?.number ?? '—'} · {item.displayTime} (Chegada: {item.arrivalTime})
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}

