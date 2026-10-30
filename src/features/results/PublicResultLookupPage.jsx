// Pagina publica isolada: corredor consulta sua colocacao por numero de peito.
// Design 100% fiel a referencia original.
import React, { useEffect, useState } from 'react'
import { subscribeToRace } from '../races/races.repository.js'
import { subscribeToResultsByRace } from './results.repository.js'
import { useRunners } from '../runners/useRunners.js'
import { sortByPlacement, withElapsedTime } from './results.rules.js'
import { formatDuration } from './duration.formatter.js'
import './PublicResultLookupPage.css'

/** Retorna o raceId da query string (?corrida=... ou ?raceId=...) */
function getRaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('corrida') || params.get('raceId') || null
}

export default function PublicResultLookupPage() {
  const raceId = getRaceIdFromUrl()
  const [race, setRace] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [allPlacements, setAllPlacements] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)
  const { runners } = useRunners(raceId)

  const [bibInput, setBibInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!raceId) {
      setNotFound(true)
      return
    }
    const unsubRace = subscribeToRace(raceId, (found) => {
      if (found) setRace(found)
      else setNotFound(true)
    })
    return unsubRace
  }, [raceId])

  useEffect(() => {
    if (!raceId) return
    setLoadingResults(true)
    const unsubResults = subscribeToResultsByRace(raceId, (rows) => {
      setAllPlacements(sortByPlacement(rows, race?.startTime))
      setLoadingResults(false)
    })
    return unsubResults
  }, [raceId, race?.startTime])

  const runnersById = Object.fromEntries(runners.map((r) => [r.id, r]))

  function getEffectiveStartTime() {
    if (race?.startTime) return race.startTime
    try {
      const stored = localStorage.getItem('pwa-qr-timing:active-race')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.startTime) return parsed.startTime
      }
    } catch (e) {}
    return null
  }

  function buildRanking() {
    const startTime = getEffectiveStartTime()
    const placementsWithTime = withElapsedTime(allPlacements, startTime)
    const allRanked = []
    const seen = new Set()

    placementsWithTime.forEach((p) => {
      if (!p.barcode || seen.has(p.barcode)) return
      seen.add(p.barcode)
      const runner = runnersById[p.barcode] ?? null

      let displayTime = null
      if (p.time) {
        displayTime = String(p.time).includes('.') ? String(p.time).split('.')[0] : String(p.time)
      } else if (p.elapsedMs != null && Number.isFinite(p.elapsedMs)) {
        displayTime = formatDuration(p.elapsedMs)
      } else if (p.dateTime && startTime) {
        const diff = Math.max(0, Date.parse(p.dateTime) - Date.parse(startTime))
        displayTime = formatDuration(diff)
      }

      allRanked.push({
        barcode: p.barcode,
        bib: runner?.number ?? p.runnerNumber ?? '?',
        name: p.runnerName ?? runner?.name ?? '\u2014',
        category: runner?.category ?? 'GERAL',
        displayTime: displayTime || '00:00:00',
        elapsedMs: p.elapsedMs,
        time: p.time,
        posGeral: allRanked.length + 1,
        geralTotal: 0,
        posCat: 0,
        catTotal: 0
      })
    })

    const geralTotal = allRanked.length
    const catPositions = {}
    allRanked.forEach((item) => {
      const cat = item.category
      catPositions[cat] = (catPositions[cat] ?? 0) + 1
      item.posCat = catPositions[cat]
    })

    allRanked.forEach((item) => {
      item.geralTotal = geralTotal
      item.catTotal = catPositions[item.category] || 1
    })

    return allRanked
  }

  function handleSearch(e) {
    e.preventDefault()
    const bib = bibInput.trim().replace(/\D/g, '')
    if (!bib) return

    setSearching(true)
    setResult(null)

    const ranked = buildRanking()
    const found = ranked.find((item) => String(parseInt(item.bib, 10)) === String(parseInt(bib, 10)))

    setTimeout(() => {
      if (found) {
        setResult({ found: true, item: found })
      } else {
        setResult({
          found: false,
          error: 'N\u00famero de peito n\u00e3o encontrado nos resultados. Verifique se o n\u00famero est\u00e1 correto e se a sua chegada j\u00e1 foi registrada.'
        })
      }
      setSearching(false)
    }, 250)
  }

  if (notFound) {
    return (
      <div className="plp-page">
        <div className="plp-card plp-card-center">
          <div className="plp-icon-warning">&#9888;</div>
          <h2 className="plp-error-title">Corrida n\u00e3o encontrada</h2>
          <p className="plp-error-desc">O link informado \u00e9 inv\u00e1lido ou a corrida n\u00e3o est\u00e1 mais dispon\u00edvel.</p>
        </div>
      </div>
    )
  }

  const raceTitle = race?.name || 'CORRIDA OFICIAL'

  return (
    <div className="plp-page">
      <div className="plp-container">

        {/* 1. Banner Estilizado do Evento (Topo Idêntico ao Modelo) */}
        <header className="plp-logo-card">
          <div className="plp-logo-accent-line"></div>
          <div className="plp-logo-content">
            <div className="plp-logo-brand-mini">
              <span className="plp-logo-dot"></span>
              <span>QR CRONORACE</span>
            </div>
            
            <div className="plp-logo-title-row">
              <svg className="plp-runner-svg plp-runner-left" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.8-1.6 8.1 4.8 1.8z"/>
              </svg>
              <h1 className="plp-logo-title">{raceTitle}</h1>
              <svg className="plp-runner-svg plp-runner-right" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.8-1.6 8.1 4.8 1.8z"/>
              </svg>
            </div>

            <div className="plp-logo-sub">
              <span>{race?.distanceKm ? `${race.distanceKm} KM · ` : ''}CRONOMETRAGEM ESPORTIVA</span>
            </div>
          </div>
        </header>

        {/* 2. Subtítulo 'CONSULTE SEU RESULTADO' com tracking aberto */}
        <div className="plp-subheading-wrap">
          <span className="plp-subheading">CONSULTE SEU RESULTADO</span>
        </div>

        {/* 3. Card Principal com Form e Resultados */}
        <main className="plp-main">
          <div className="plp-card">
            
            <div className="plp-card-tag">
              <span className="plp-tag-star">&#10038;</span>
              <span>RESULTADO OFICIAL</span>
            </div>

            <h2 className="plp-title">
              QUAL FOI SUA<br />COLOCA&Ccedil;&Atilde;O?
            </h2>

            <form onSubmit={handleSearch} className="plp-form">
              <label htmlFor="plp-bib" className="plp-label">
                N&Uacute;MERO DE PEITO
              </label>
              
              <input
                id="plp-bib"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="plp-input"
                placeholder="Ex: 55"
                value={bibInput}
                onChange={(e) => {
                  setBibInput(e.target.value.replace(/\D/g, ''))
                  if (result) setResult(null)
                }}
                autoFocus
              />

              <button
                type="submit"
                className="plp-btn"
                disabled={searching || !bibInput.trim() || loadingResults}
              >
                {searching ? (
                  <span>Buscando...</span>
                ) : (
                  <>
                    <span className="plp-btn-icon">&#127941;</span>
                    <span>SABER MINHA POSI&Ccedil;&Atilde;O</span>
                  </>
                )}
              </button>
            </form>

            {/* 4. Sub-card de resultado quando o corredor busca seu número */}
            {result?.found && (
              <div className="plp-result-box">
                <div className="plp-runner-meta">
                  <span className="plp-bib-label">N&Uacute;MERO DE PEITO</span>
                  <span className="plp-bib-val"># {result.item.bib}</span>
                  {result.item.name && result.item.name !== '\u2014' && (
                    <span className="plp-runner-name">{result.item.name}</span>
                  )}
                </div>

                <div className="plp-time-section">
                  <span className="plp-time-label">
                    <span className="plp-time-icon">&#9201;</span> TEMPO DE PROVA
                  </span>
                  <span className="plp-time-val">{result.item.displayTime}</span>
                </div>

                <div className="plp-stats-grid">
                  <div className="plp-stat-col">
                    <span className="plp-col-title">NA CATEGORIA</span>
                    <div className="plp-stat-number">
                      {result.item.posCat}
                      <span className="plp-ord">&ordm;</span>
                    </div>
                    <span className="plp-col-sub">de {result.item.catTotal} atletas</span>
                    <div className="plp-badge-cat">{result.item.category}</div>
                  </div>

                  <div className="plp-stat-col">
                    <span className="plp-col-title">CLASSIFICA&Ccedil;&Atilde;O GERAL</span>
                    <div className="plp-stat-number">
                      {result.item.posGeral}
                      <span className="plp-ord">&ordm;</span>
                    </div>
                    <span className="plp-col-sub">de {result.item.geralTotal} atletas</span>
                    <div className="plp-badge-cat plp-badge-geral">GERAL</div>
                  </div>
                </div>
              </div>
            )}

            {/* Mensagem de número não encontrado */}
            {result && !result.found && (
              <div className="plp-error-box">
                <span className="plp-error-icon">&#9888;</span>
                <p>{result.error}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Rodapé sutil idêntico à referência */}
      <footer className="plp-footer">
        <span>{raceTitle} &middot; Sistema desenvolvido por Janela Comunica&ccedil;&atilde;o</span>
      </footer>
    </div>
  )
}
