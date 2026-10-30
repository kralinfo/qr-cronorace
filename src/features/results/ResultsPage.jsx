import React, { useState } from 'react'
import { useResults } from './useResults.js'
import { formatTimeOnlyBR } from './date.formatter.js'
import { formatDuration } from './duration.formatter.js'
import { withElapsedTime } from './results.rules.js'
import { useRunners } from '../runners/useRunners.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'

export default function ResultsPage() {
  const { activeRace } = useActiveRace()
  const { placements: rawPlacements, loading, error } = useResults(activeRace?.id, activeRace?.startTime)
  const { runners } = useRunners(activeRace?.id)
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [copiedLink, setCopiedLink] = useState(false)

  const placements = withElapsedTime(rawPlacements, activeRace?.startTime)
  const arrivedBarcodes = new Set(placements.map(p => p.barcode).filter(Boolean))
  const arrivedCount = arrivedBarcodes.size
  const runnerNameById = Object.fromEntries(runners.map(r => [r.id, r.name]))
  const runnersById = Object.fromEntries(runners.map(r => [r.id, r]))
  const runnersStillRunning = runners.filter(r => !arrivedBarcodes.has(r.id))

  // Build full ranked list first (ALL)
  const allRanked = []
  const seenIds = new Set()
  placements.forEach((p) => {
    if (!p.barcode || seenIds.has(p.barcode)) return
    const runner = runnersById[p.barcode] ?? null
    seenIds.add(p.barcode)
    const displayTime = p.time
      ? (String(p.time).includes('.') ? String(p.time).split('.')[0] : String(p.time))
      : (p.elapsedMs != null ? formatDuration(p.elapsedMs) : '\u2014')
    const arrivalTime = formatTimeOnlyBR(p.dateTime)
    allRanked.push({
      posGeral: allRanked.length + 1,
      runner,
      barcode: p.barcode,
      bib: runner?.number ?? '\u2014',
      name: p.runnerName ?? runnerNameById[p.barcode] ?? '\u2014',
      category: runner?.category ?? 'GERAL',
      displayTime,
      arrivalTime,
    })
  })

  // Assign category positions
  const catPositions = {}
  allRanked.forEach(item => {
    const cat = item.category
    catPositions[cat] = (catPositions[cat] ?? 0) + 1
    item.posCat = catPositions[cat]
  })

  // Filter
  const rankedArrivals = categoryFilter === 'ALL'
    ? allRanked
    : allRanked.filter(item =>
        String(item.category ?? '').toUpperCase().includes(categoryFilter.toUpperCase())
      )

  const isFinished = Boolean(activeRace?.endTime)
  const raceName = activeRace?.name ?? 'Corrida'
  const localCount = allRanked.filter(i => String(i.category ?? '').toUpperCase().includes('LOCAL')).length
  const distanceKm = activeRace?.distanceKm

  const lookupUrl = `${window.location.origin}/?resultado=1${activeRace?.id ? `&corrida=${activeRace.id}` : ''}`

  async function handleShareLookup() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Resultado Oficial - ${raceName}`,
          text: `Consulte sua coloca\u00e7\u00e3o e tempo oficial na ${raceName} digitando seu n\u00famero de peito:`,
          url: lookupUrl
        })
        return
      } catch (e) {
        // Ignora se o usuário apenas cancelou o compartilhamento
      }
    }

    try {
      await navigator.clipboard.writeText(lookupUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 3000)
    } catch {
      window.prompt('Copie o link abaixo para enviar aos corredores:', lookupUrl)
    }
  }

  function exportCSV() {
    const header = 'POS.GERAL,N\u00ba,NOME,CATEGORIA,POS.CAT,TEMPO,CHEGADA'
    const rows = allRanked.map(i =>
      `${i.posGeral},"${i.bib}","${i.name}","${i.category}",${i.posCat},"${i.displayTime}","${i.arrivalTime}"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ranking-${raceName.replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const CATEGORY_TABS = [
    { key: 'ALL', label: 'GERAL' },
    { key: 'LOCAL', label: 'LOCAL' },
    { key: 'VISITANTE', label: 'VISITANTE' },
    { key: 'PCD', label: 'PCD' },
  ]

  return (
    <div className="rp-root">
      {/* Header */}
      <header className="rp-header">
        <div className="rp-header-left">
          <div className="rp-logo-wrap">
            <div className="rp-logo-icon">&#127942;</div>
            <span className="rp-logo-text">JANELAMARCA</span>
          </div>
          <div className="rp-race-info">
            <h1 className="rp-race-name">{raceName}</h1>
            {activeRace?.startTime && (
              <p className="rp-race-meta">
                Largada &agrave;s {new Date(activeRace.startTime).toLocaleString('pt-BR')}
                {' \u00b7 '}
                {arrivedCount} de {runners.length} chegaram
                {runners.length !== 0 && ` \u00b7 ${runners.length} corredor${runners.length === 1 ? '' : 'es'}`}
                {distanceKm ? ` \u00b7 ${distanceKm} km` : ''}
              </p>
            )}
          </div>
        </div>
        <div className={`rp-status-badge ${isFinished ? 'finished' : 'live'}`}>
          {isFinished ? 'ENCERRADA' : 'AO VIVO'}
        </div>
      </header>

      {/* Banner de encerramento com compartilhamento */}
      {isFinished && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.22) 0%, rgba(16, 185, 129, 0.15) 100%)',
          border: '1.5px solid rgba(139, 92, 246, 0.4)',
          borderRadius: 14,
          padding: '16px 20px',
          margin: '0 20px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>&#127881;</span> Prova Encerrada &mdash; Resultados Prontos!
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 3 }}>
              Compartilhe o link com os atletas para que cada corredor consulte sua coloca&ccedil;&atilde;o, categoria e tempo.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleShareLookup}
              style={{
                background: copiedLink ? '#059669' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <span>{copiedLink ? '\u2713' : '&#128242;'}</span>
              <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar Link com Corredores'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.open(lookupUrl, '_blank')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ddd6fe',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Testar / Abrir Tela
            </button>
          </div>
        </div>
      )}

      {/* Title bar */}
      <div className="rp-title-bar">
        <h2 className="rp-title">
          {isFinished ? '\uD83C\uDFC6 CLASSIFICA\u00c7\u00c3O FINAL' : '\uD83D\uDCCA RANKING AO VIVO'}
        </h2>
        <div className="rp-stats">
          <span className="rp-stat-pill">
            <span className="rp-stat-num">{arrivedCount}</span> chegadas
          </span>
          {localCount > 0 && (
            <span className="rp-stat-pill local">
              <span className="rp-stat-num">{localCount}</span> locais
            </span>
          )}
          {runnersStillRunning.length > 0 && (
            <span className="rp-stat-pill pending">
              <span className="rp-stat-num">{runnersStillRunning.length}</span> em prova
            </span>
          )}
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="rp-tabs">
        {CATEGORY_TABS.map(t => (
          <button
            key={t.key}
            className={`rp-tab ${categoryFilter === t.key ? 'active' : ''}`}
            onClick={() => setCategoryFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rp-table-wrap">
        {loading && <div className="rp-empty">Carregando resultados...</div>}
        {!loading && error && <div className="rp-empty rp-error">{error}</div>}
        {!loading && !error && rankedArrivals.length === 0 && (
          <div className="rp-empty">Nenhuma chegada registrada ainda.</div>
        )}
        {!loading && rankedArrivals.length > 0 && (
          <table className="rp-table">
            <thead>
              <tr>
                <th className="rp-th rp-th-center">POS.</th>
                <th className="rp-th">N&ordm;</th>
                <th className="rp-th">NOME</th>
                <th className="rp-th">CAT.</th>
                <th className="rp-th rp-th-center">POS. CAT.</th>
                <th className="rp-th rp-th-center">CHEGADA</th>
                <th className="rp-th rp-th-right">TEMPO</th>
              </tr>
            </thead>
            <tbody>
              {rankedArrivals.map((item) => (
                <tr key={item.barcode} className={`rp-tr ${item.posGeral <= 3 ? 'rp-tr-top' : ''}`}>
                  <td className="rp-td rp-td-center">
                    <span className={`rp-pos rp-pos-${item.posGeral <= 3 ? item.posGeral : 'n'}`}>
                      {item.posGeral}&ordm;
                    </span>
                  </td>
                  <td className="rp-td rp-bib">N&ordm;&nbsp;{item.bib}</td>
                  <td className="rp-td rp-name">{item.name}</td>
                  <td className="rp-td">
                    <span className="rp-cat-badge">{item.category}</span>
                  </td>
                  <td className="rp-td rp-td-center rp-pos-cat">{item.posCat}&ordm;</td>
                  <td className="rp-td rp-td-center rp-arrival-time">{item.arrivalTime}</td>
                  <td className="rp-td rp-td-right rp-time">{item.displayTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer actions */}
      <footer className="rp-footer" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="rp-action-btn"
          onClick={handleShareLookup}
          style={{
            background: copiedLink ? '#059669' : '#10b981',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>{copiedLink ? '\u2713' : '&#128242;'}</span>
          <span>{copiedLink ? 'Link Copiado!' : 'Link p/ Corredores'}</span>
        </button>

        <button
          type="button"
          className="rp-action-btn"
          onClick={() => window.open(`/?ranking=1${activeRace?.id ? `&corrida=${activeRace.id}` : ''}`, '_blank')}
          style={{ background: '#7c3aed', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          &#128250; Abrir no Tel&atilde;o / TV (Tempo Real)
        </button>
        <button className="rp-action-btn" onClick={exportCSV}>
          &#8595; Exportar CSV
        </button>
      </footer>
    </div>
  )
}
