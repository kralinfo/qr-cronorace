// UI only: tela de corredores com busca por nome/corrida, cadastro com seleção de prova,
// prevenção de duplicatas, reimpressão segura de QR code, menu de ações (⋮) e lazy loading por scroll.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRunners } from './useRunners.js'
import { useRaces } from '../races/useRaces.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'
import RunnerQRItem from './RunnerQRItem.jsx'
import RunnerHistoryModal from './RunnerHistoryModal.jsx'
import { buildQRFilename } from './qr-filename.service.js'
import { printRunnerQRCode } from './print.service.js'
import { formatDateOnlyBR } from '../races/date-only.formatter.js'
import { getAllRunners, normalizeComparable } from './runners.repository.js'

const PAGE_SIZE = 35

export default function RunnersPage() {
  const { races } = useRaces()
  const { activeRace } = useActiveRace()

  // Corrida selecionada para visualização/filtro: 'ALL' ou id da corrida
  const [selectedRaceId, setSelectedRaceId] = useState(activeRace?.id || 'ALL')

  // Se a corrida ativa mudar externamente e o usuário ainda não tiver feito uma escolha manual, acompanha
  useEffect(() => {
    if (activeRace?.id && selectedRaceId === 'ALL' && races.length > 0) {
      setSelectedRaceId(activeRace.id)
    }
  }, [activeRace?.id, races.length])

  // Se a lista de corridas carregar e selectedRaceId for inválido, ajusta para a ativa ou primeira corrida
  useEffect(() => {
    if (races.length > 0 && selectedRaceId !== 'ALL') {
      const exists = races.some(r => r.id === selectedRaceId)
      if (!exists) {
        setSelectedRaceId(activeRace?.id || races[0].id)
      }
    }
  }, [races, selectedRaceId, activeRace?.id])

  const {
    runners,
    loading: loadingRunners,
    error: runnerError,
    lastQrCode,
    createRunner,
    clearError,
    clearLastQrCode
  } = useRunners(selectedRaceId)

  // Controle de busca
  const [search, setSearch] = useState('')

  // Painel de cadastro
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [targetRaceId, setTargetRaceId] = useState('')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal de histórico do atleta
  const [historyRunnerName, setHistoryRunnerName] = useState(null)
  const [allRunnersCache, setAllRunnersCache] = useState([])

  // Sincroniza targetRaceId com a corrida atualmente selecionada ao abrir o formulário
  useEffect(() => {
    if (selectedRaceId && selectedRaceId !== 'ALL') {
      setTargetRaceId(selectedRaceId)
    } else if (activeRace?.id) {
      setTargetRaceId(activeRace.id)
    } else if (races.length > 0) {
      setTargetRaceId(races[0].id)
    }
  }, [selectedRaceId, activeRace?.id, races])

  // Carrega todos os corredores sob demanda para alimentar o modal de histórico
  const loadAllRunners = async () => {
    try {
      const list = await getAllRunners()
      setAllRunnersCache(list)
      return list
    } catch (e) {
      console.error(e)
      return []
    }
  }

  const handleOpenHistory = async (runnerName) => {
    await loadAllRunners()
    setHistoryRunnerName(runnerName)
  }

  // Mapa de corridas por ID para lookup rápido
  const racesMap = useMemo(() => {
    return Object.fromEntries(races.map(r => [r.id, r]))
  }, [races])

  const selectedRace = selectedRaceId !== 'ALL' ? racesMap[selectedRaceId] : null

  // Submissão do formulário de cadastro
  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setSubmitting(true)
    try {
      const result = await createRunner(name, number, targetRaceId)
      if (result) {
        setName('')
        setNumber('')
        if (selectedRaceId !== 'ALL' && selectedRaceId !== targetRaceId) {
          setSelectedRaceId(targetRaceId)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Filtragem dos corredores com base na busca
  const normalizedSearch = normalizeComparable(search)
  const filteredRunners = useMemo(() => {
    if (!normalizedSearch) return runners

    return runners.filter((runner) => {
      const matchName = normalizeComparable(runner.name).includes(normalizedSearch)
      const matchNumber = normalizeComparable(runner.number).includes(normalizedSearch)
      const matchId = normalizeComparable(runner.id).includes(normalizedSearch)
      return matchName || matchNumber || matchId
    })
  }, [runners, normalizedSearch])

  // Lazy loading: paginação incremental por scroll para performance com 1000+ corredores
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  // Reseta a paginação para o topo se a busca ou a corrida mudar
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [normalizedSearch, selectedRaceId])

  const hasMore = visibleCount < filteredRunners.length
  const visibleRunners = useMemo(() => {
    return filteredRunners.slice(0, visibleCount)
  }, [filteredRunners, visibleCount])

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredRunners.length))
  }, [filteredRunners.length])

  // IntersectionObserver para disparo automático do carregamento ao rolar próximo do rodapé
  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleLoadMore()
      }
    }, { rootMargin: '300px' })

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, handleLoadMore])

  return (
    <div className="runners-page">
      {/* Barra superior de controle: Seletor de Corrida, Botão de Cadastrar e Busca */}
      <section className="runners-controls-section">
        <div className="runners-controls-header">
          <div className="runners-race-select-wrap">
            <label htmlFor="runners-race-filter">Filtrar por corrida:</label>
            <select
              id="runners-race-filter"
              className="runners-race-select"
              value={selectedRaceId}
              onChange={(e) => {
                setSelectedRaceId(e.target.value)
                clearError()
                clearLastQrCode()
              }}
            >
              {activeRace && (
                <option value={activeRace.id}>
                  ⭐ {activeRace.name} (Corrida ativa no app)
                </option>
              )}
              {races
                .filter(r => r.id !== activeRace?.id)
                .map(r => (
                  <option key={r.id} value={r.id}>
                    🏁 {r.name} {r.eventDate ? `(${formatDateOnlyBR(r.eventDate)})` : ''}
                  </option>
                ))}
              <option value="ALL">🌐 Todas as corridas (Histórico geral)</option>
            </select>
          </div>

          <button
            type="button"
            className="create-runner-toggle-btn"
            onClick={() => {
              setShowCreateForm(prev => !prev)
              clearError()
            }}
          >
            {showCreateForm ? '✕ Fechar cadastro' : '+ Cadastrar corredor'}
          </button>
        </div>

        {/* Campo de pesquisa por Nome ou Número */}
        <div className="runners-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="runners-search-input"
            placeholder={
              selectedRaceId === 'ALL'
                ? 'Buscar atleta por nome ou número em todas as corridas...'
                : `Buscar corredor por nome ou número em "${selectedRace?.name || 'corrida'}"...`
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Formulário de Cadastro de Corredor para uma Corrida Específica */}
      {showCreateForm && (
        <section className="share-panel create-runner-panel">
          <div className="create-runner-panel-header">
            <h3>Cadastrar corredor para uma corrida</h3>
            <button
              type="button"
              className="close-panel-btn"
              onClick={() => {
                setShowCreateForm(false)
                clearError()
              }}
            >
              Fechar ✕
            </button>
          </div>

          <p className="create-runner-help-text">
            Selecione a corrida desejada e informe o número e nome do atleta.
            O sistema impedirá duplicatas de nome ou número nesta prova.
          </p>

          <form onSubmit={handleSubmit} className="create-runner-form">
            <label htmlFor="target-race-select">Corrida de destino:</label>
            <select
              id="target-race-select"
              value={targetRaceId}
              onChange={(e) => setTargetRaceId(e.target.value)}
              required
            >
              {races.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.id === activeRace?.id ? ' (Ativa)' : ''} {r.eventDate ? `· ${formatDateOnlyBR(r.eventDate)}` : ''}
                </option>
              ))}
            </select>

            <label htmlFor="runner-number-input">Número de peito do corredor:</label>
            <input
              id="runner-number-input"
              placeholder="ex: 104"
              value={number}
              onChange={e => setNumber(e.target.value)}
              required
            />

            <label htmlFor="runner-name-input">Nome completo do corredor:</label>
            <input
              id="runner-name-input"
              placeholder="ex: Carlos Silva"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <button type="submit" disabled={submitting || loadingRunners}>
              {submitting ? 'Cadastrando e gerando QR...' : 'Criar Corredor + Gerar QR Code'}
            </button>
          </form>

          {runnerError && (
            <div className="runner-error-box">
              <p>⚠️ {runnerError}</p>
            </div>
          )}

          {lastQrCode && (
            <div className="qr-preview created-success-box">
              <div className="success-badge">✅ Corredor cadastrado com sucesso!</div>
              <p>
                QR gerado para <strong>{lastQrCode.runner.name}</strong>
                {lastQrCode.runner.number ? ` (Nº ${lastQrCode.runner.number})` : ''}
              </p>
              <p className="qr-preview-race-info">
                Corrida: <strong>{racesMap[lastQrCode.runner.raceId]?.name || lastQrCode.runner.raceId}</strong>
              </p>
              <img
                src={lastQrCode.qrDataUrl}
                alt={`QR de ${lastQrCode.runner.name}`}
                style={{ width: 180, height: 180 }}
              />
              <div className="created-qr-actions">
                <a
                  className="secondary-btn"
                  href={lastQrCode.qrDataUrl}
                  download={buildQRFilename(lastQrCode.runner)}
                >
                  📥 Baixar PNG
                </a>
                <button
                  type="button"
                  className="print-btn"
                  onClick={() => printRunnerQRCode(
                    lastQrCode.qrDataUrl,
                    lastQrCode.runner,
                    racesMap[lastQrCode.runner.raceId]?.name
                  )}
                >
                  🖨️ Imprimir QR Agora
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Lista de Corredores com Lazy Loading */}
      <section className="runners-list-section">
        <div className="runners-list-header">
          <h3>
            {normalizedSearch
              ? `Resultados da busca (${filteredRunners.length})`
              : selectedRace
                ? `Corredores desta corrida (${runners.length})`
                : `Todos os corredores (${runners.length})`}
          </h3>
          {normalizedSearch && (
            <button type="button" className="secondary-btn clear-search-pill" onClick={() => setSearch('')}>
              Limpar busca
            </button>
          )}
        </div>

        {loadingRunners && <p className="runners-loading">Carregando corredores...</p>}

        {!loadingRunners && runners.length === 0 && (
          <div className="empty-state-box">
            <p>Nenhum corredor cadastrado nesta corrida ainda.</p>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(true)
                if (selectedRaceId !== 'ALL') setTargetRaceId(selectedRaceId)
              }}
            >
              + Cadastrar primeiro corredor
            </button>
          </div>
        )}

        {!loadingRunners && runners.length > 0 && filteredRunners.length === 0 && (
          <div className="empty-state-box">
            <p>Nenhum corredor encontrado para a busca "<strong>{search}</strong>".</p>
            <p className="empty-state-sub">
              Dica: Verifique se digitou o nome ou número correto, ou selecione "Todas as corridas" no filtro acima para buscar no histórico geral.
            </p>
          </div>
        )}

        {!loadingRunners && filteredRunners.length > 0 && (
          <>
            <ul className="runners-qr-list">
              {visibleRunners.map(runner => {
                const race = racesMap[runner.raceId]
                const raceName = race?.name || (selectedRace ? selectedRace.name : `Corrida (${runner.raceId})`)
                return (
                  <RunnerQRItem
                    key={runner.id}
                    runner={runner}
                    raceName={raceName}
                    highlightRaceBadge={selectedRaceId === 'ALL'}
                    onShowHistory={() => handleOpenHistory(runner.name)}
                    onSelectRace={selectedRaceId === 'ALL' ? (rId) => setSelectedRaceId(rId) : undefined}
                  />
                )
              })}
            </ul>

            {/* Elemento Sentinela e Controle do Lazy Loading */}
            {hasMore ? (
              <div ref={sentinelRef} className="runners-lazy-loader">
                <span className="runners-lazy-text">
                  Exibindo {visibleRunners.length} de {filteredRunners.length} corredores...
                </span>
                <button
                  type="button"
                  className="secondary-btn load-more-btn"
                  onClick={handleLoadMore}
                >
                  Carregar mais corredores ↓
                </button>
              </div>
            ) : filteredRunners.length > PAGE_SIZE ? (
              <p className="runners-all-loaded-text">
                ✓ Todos os {filteredRunners.length} corredores foram carregados.
              </p>
            ) : null}
          </>
        )}
      </section>

      {/* Modal de Histórico do Atleta */}
      {historyRunnerName && (
        <RunnerHistoryModal
          runnerName={historyRunnerName}
          allRunners={allRunnersCache.length > 0 ? allRunnersCache : runners}
          racesMap={racesMap}
          onClose={() => setHistoryRunnerName(null)}
          onSelectRace={(raceId) => {
            setSelectedRaceId(raceId)
            setHistoryRunnerName(null)
          }}
        />
      )}
    </div>
  )
}
