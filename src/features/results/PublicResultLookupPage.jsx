// Pagina publica isolada: corredor consulta sua colocacao por numero de peito.
// Design 100% fiel a referencia original com identificacao precisa de Localidade e Genero.
import React, { useEffect, useState, useMemo } from 'react'
import { subscribeToRace } from '../races/races.repository.js'
import { subscribeToResultsByRace } from './results.repository.js'
import { useRunners } from '../runners/useRunners.js'
import { sortByPlacement, withElapsedTime } from './results.rules.js'
import { formatDuration } from './duration.formatter.js'
import './PublicResultLookupPage.css'

/** Retorna o raceId da query string (?corrida=... ou ?raceId=...) com fallback para a corrida ativa */
function getRaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('corrida') || params.get('raceId')
  if (fromUrl) return fromUrl
  try {
    const byId = localStorage.getItem('pwa-qr-timing:active-race-id')
    if (byId) return byId
    const raw = localStorage.getItem('pwa-qr-timing:active-race')
    const race = raw ? JSON.parse(raw) : null
    return race?.id || null
  } catch (e) {
    return null
  }
}

/** Carrega chegadas salvas no cache local do cronômetro para nunca ficar em branco e manter categorias atualizadas */
function loadCachedArrivals(raceId) {
  try {
    if (!raceId) return []
    const raw = localStorage.getItem('pwa-qr-timing:chronometer-arrivals:' + raceId)
      || localStorage.getItem('pwa-qr-timing:arrivals-cache:' + raceId)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.arrivals) ? parsed.arrivals : [])
    return list.map((a, idx) => ({
      id: a.id || idx,
      barcode: a.runnerId || (raceId ? `${raceId}_bib_${a.bib}` : `bib_${a.bib}`),
      runnerNumber: a.bib,
      runnerName: a.name,
      category: a.category || 'GERAL',
      time: a.time,
      elapsedMs: typeof a.elapsedMs === 'number' ? a.elapsedMs : null,
      isLocal: a.isLocal,
      gender: a.gender
    }))
  } catch (e) {
    return []
  }
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
  const [activeSearchedNum, setActiveSearchedNum] = useState(null)

  // 1. Busca dados da corrida (Firestore com fallback para localStorage)
  useEffect(() => {
    if (!raceId) {
      try {
        const raw = localStorage.getItem('pwa-qr-timing:active-race')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed) {
            setRace(parsed)
            setNotFound(false)
            return
          }
        }
      } catch (e) {}
      setNotFound(true)
      return
    }

    const unsubRace = subscribeToRace(raceId, (found) => {
      if (found) {
        setRace(found)
        setNotFound(false)
      } else {
        try {
          const raw = localStorage.getItem('pwa-qr-timing:active-race')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && (!parsed.id || parsed.id === raceId)) {
              setRace(parsed)
              setNotFound(false)
              return
            }
          }
        } catch (e) {}
        setNotFound(true)
      }
    })
    return unsubRace
  }, [raceId])

  // 2. Busca resultados (Carrega do cache local imediatamente + escuta Firestore)
  useEffect(() => {
    if (!raceId) return

    const cached = loadCachedArrivals(raceId)
    if (cached.length > 0) {
      setAllPlacements(cached)
    }

    setLoadingResults(cached.length === 0)
    const unsubResults = subscribeToResultsByRace(raceId, (rows) => {
      if (Array.isArray(rows) && rows.length > 0) {
        setAllPlacements(sortByPlacement(rows, race?.startTime))
      } else {
        const fallback = loadCachedArrivals(raceId)
        if (fallback.length > 0) {
          setAllPlacements(fallback)
        }
      }
      setLoadingResults(false)
    })
    return unsubResults
  }, [raceId, race?.startTime])

  // 3. Mapeamento de corredores cadastrados (Firestore + runners-lookup local)
  const allRunnersMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(runners)) {
      runners.forEach(r => {
        if (r.id) map.set(String(r.id), r)
        if (r.number) {
          const clean = String(parseInt(String(r.number).replace(/\D/g, ''), 10))
          map.set(clean, r)
        }
      })
    }
    try {
      const raw = localStorage.getItem('pwa-qr-timing:runners-lookup')
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          list.forEach(r => {
            if (r.id && !map.has(String(r.id))) map.set(String(r.id), r)
            if (r.number) {
              const clean = String(parseInt(String(r.number).replace(/\D/g, ''), 10))
              if (!map.has(clean)) map.set(clean, r)
            }
          })
        }
      }
    } catch (e) {}
    return map
  }, [runners])

  // 4. Mapeamento do cache de chegadas para resgatar nomes e categorias atualizadas
  const arrivalsCacheMap = useMemo(() => {
    const map = new Map()
    const cached = loadCachedArrivals(raceId)
    cached.forEach(a => {
      const clean = String(a.runnerNumber || a.bib || '').replace(/\D/g, '')
      if (clean) {
        map.set(String(parseInt(clean, 10)), a)
      }
    })
    return map
  }, [raceId, allPlacements])

  // 5. Nome pré-visualizado em tempo real enquanto digita o número
  const previewRunnerName = useMemo(() => {
    const digits = bibInput.trim().replace(/\D/g, '')
    if (!digits) return null
    const targetKey = String(parseInt(digits, 10))

    // 1. Prioridade: cache de chegadas do cronômetro
    const fromCache = arrivalsCacheMap.get(targetKey)
    if (fromCache?.runnerName && fromCache.runnerName !== 'Sem nome' && fromCache.runnerName !== '—') {
      return fromCache.runnerName
    }
    // 2. Corredores cadastrados
    const fromRunner = allRunnersMap.get(targetKey)
    if (fromRunner?.name && fromRunner.name !== 'Sem nome') {
      return fromRunner.name
    }
    return null
  }, [bibInput, arrivalsCacheMap, allRunnersMap])

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

  // 6. Monta o ranking com identificação garantida de Localidade e Gênero
  function buildRanking() {
    const startTime = getEffectiveStartTime()
    const placementsWithTime = withElapsedTime(allPlacements, startTime)
    const allRanked = []
    const seen = new Set()

    placementsWithTime.forEach((p) => {
      const cleanNum = String(p.runnerNumber || p.bib || '').replace(/\D/g, '')
      const bibKey = cleanNum ? String(parseInt(cleanNum, 10)) : ''
      const dedupeKey = bibKey || p.barcode
      if (!dedupeKey || seen.has(dedupeKey)) return
      seen.add(dedupeKey)

      const runner = (bibKey ? allRunnersMap.get(bibKey) : null) || allRunnersMap.get(String(p.barcode))
      const cachedArr = bibKey ? arrivalsCacheMap.get(bibKey) : null

      let displayTime = null
      if (p.time) {
        displayTime = String(p.time).includes('.') ? String(p.time).split('.')[0] : String(p.time)
      } else if (p.elapsedMs != null && Number.isFinite(p.elapsedMs)) {
        displayTime = formatDuration(p.elapsedMs)
      } else if (p.dateTime && startTime) {
        const diff = Math.max(0, Date.parse(p.dateTime) - Date.parse(startTime))
        displayTime = formatDuration(diff)
      } else if (cachedArr?.time) {
        displayTime = String(cachedArr.time).includes('.') ? String(cachedArr.time).split('.')[0] : String(cachedArr.time)
      }

      // Determinação robusta de categoria / localidade / gênero
      const catArrival = String(cachedArr?.category || p.category || '').toUpperCase()
      const catRunner = String(runner?.category || '').toUpperCase()

      const isLocal = Boolean(
        cachedArr?.isLocal === true || cachedArr?.isLocal === 'true' ||
        runner?.isLocal === true || runner?.isLocal === 'true' ||
        p.isLocal === true || p.isLocal === 'true' ||
        catArrival.includes('LOCAL') ||
        catRunner.includes('LOCAL')
      )

      const isFem = Boolean(
        runner?.gender === 'F' || runner?.gender === 'FEMININO' ||
        catArrival.includes('FEM') ||
        catRunner.includes('FEM')
      )

      // Regra estrita solicitada:
      // Se local: LOCAL MASC ou LOCAL FEM
      // Se visitante: MASCULINO ou FEMININO
      let assignedCat = 'GERAL'
      if (isLocal) {
        assignedCat = isFem ? 'LOCAL FEM' : 'LOCAL MASC'
      } else {
        assignedCat = isFem ? 'FEMININO' : 'MASCULINO'
      }

      const runnerName = cachedArr?.runnerName || p.runnerName || runner?.name || p.name || 'Sem nome'
      const runnerBib = cachedArr?.runnerNumber || runner?.number || p.runnerNumber || p.bib || bibKey || '?'

      allRanked.push({
        barcode: p.barcode,
        bib: runnerBib,
        bibKey,
        name: runnerName,
        category: assignedCat,
        isLocal,
        gender: isFem ? 'F' : 'M',
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

    // Calcula colocações separadas para cada categoria
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

  // 7. Busca estritamente por número de peito
  function handleSearch(e) {
    if (e) e.preventDefault()
    const digits = bibInput.trim().replace(/\D/g, '')
    if (!digits) return

    const targetNum = parseInt(digits, 10)
    setActiveSearchedNum(targetNum)
    setSearching(true)
    setResult(null)

    const ranked = buildRanking()

    const found = ranked.find((item) => {
      const itemNum = String(item.bib).replace(/\D/g, '')
      return itemNum && parseInt(itemNum, 10) === targetNum
    })

    setTimeout(() => {
      if (found) {
        setResult({ found: true, item: found })
      } else {
        setResult({
          found: false,
          error: `Número #${targetNum} não encontrado nos resultados desta corrida. Verifique o número digitado ou se a sua chegada já foi confirmada.`
        })
      }
      setSearching(false)
    }, 180)
  }

  // 8. Atualiza em tempo real a colocação do corredor na tela quando novas chegadas entrarem
  useEffect(() => {
    if (!activeSearchedNum) return
    const ranked = buildRanking()
    const found = ranked.find((item) => {
      const itemNum = String(item.bib).replace(/\D/g, '')
      return itemNum && parseInt(itemNum, 10) === activeSearchedNum
    })
    if (found) {
      setResult({ found: true, item: found })
    }
  }, [allPlacements, activeSearchedNum])

  if (notFound) {
    return (
      <div className="plp-page">
        <div className="plp-card plp-card-center">
          <div className="plp-icon-warning">&#9888;</div>
          <h2 className="plp-error-title">Corrida não encontrada</h2>
          <p className="plp-error-desc">O link informado é inválido ou a corrida não está mais disponível.</p>
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

        {/* 2. Subtítulo 'CONSULTE SEU RESULTADO' com linhas */}
        <div className="plp-section-divider">
          <span className="plp-divider-line"></span>
          <span className="plp-divider-text">CONSULTE SEU RESULTADO</span>
          <span className="plp-divider-line"></span>
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
                placeholder="Ex: 15"
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
                disabled={searching || !bibInput.trim()}
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

            {/* 4. Sub-card de resultado com as DUAS opções exatas solicitadas */}
            {result?.found && (
              <div className="plp-result-box">
                <div className="plp-runner-meta">
                  <span className="plp-bib-label">N&Uacute;MERO DE PEITO</span>
                  <span className="plp-bib-val"># {result.item.bib}</span>
                  {result.item.name && result.item.name !== '—' && (
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
                  {/* Opção 1: Classificação Geral (Sempre) */}
                  <div className="plp-stat-col">
                    <span className="plp-col-title">CLASSIFICA&Ccedil;&Atilde;O GERAL</span>
                    <div className="plp-stat-number">
                      {result.item.posGeral}
                      <span className="plp-ord">&ordm;</span>
                    </div>
                    <span className="plp-col-sub">de {result.item.geralTotal} atletas</span>
                    <div className="plp-badge-cat plp-badge-geral">GERAL</div>
                  </div>

                  {/* Opção 2: Local (Masc/Fem) se local, ou Categoria (Masc/Fem) se visitante */}
                  <div className="plp-stat-col">
                    <span className="plp-col-title">{result.item.isLocal ? 'LOCAL' : 'CATEGORIA'}</span>
                    <div className="plp-stat-number">
                      {result.item.posCat}
                      <span className="plp-ord">&ordm;</span>
                    </div>
                    <span className="plp-col-sub">de {result.item.catTotal} atletas</span>
                    <div
                      className="plp-badge-cat"
                      style={result.item.isLocal ? {
                        background: 'rgba(74, 222, 128, 0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(74, 222, 128, 0.4)'
                      } : {}}
                    >
                      {result.item.category}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mensagem de atleta não encontrado */}
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
