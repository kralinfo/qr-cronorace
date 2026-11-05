import React, { useState, useEffect, useRef, useCallback } from 'react'
import ResultsPage from './features/results/ResultsPage.jsx'
import ScannerPage from './features/scanner/ScannerPage.jsx'
import RunnersPage from './features/runners/RunnersPage.jsx'
import RaceSetupPage from './features/races/RaceSetupPage.jsx'
import RaceHomePage from './features/races/RaceHomePage.jsx'
import { ActiveRaceProvider, useActiveRace } from './features/races/ActiveRaceContext.jsx'
import { useRunners } from './features/runners/useRunners.js'
import { addResult, deleteAllResultsByRace } from './features/results/results.repository.js'
import { getStoredActiveRaceId } from './features/races/active-race.storage.js'
import { isBatchPrintActive } from './features/races/batch-print.controller.js'
import BottomNav from './shared/BottomNav.jsx'
import { IconChevronLeft } from './shared/Icons.jsx'

const TAB_TITLES = {
  home: 'Início',
  races: 'Corridas',
  runners: 'Corredores',
  scanner: 'Scanner',
  results: 'Ranking',
  chronometer: 'Cronômetro'
}

function InnerAppContent() {
  const { activeRace, loading, clearActiveRace, selectRace } = useActiveRace()
  const { runners } = useRunners(activeRace?.id)
  const [tab, setTabState] = useState(() => {
    try {
      const stored = sessionStorage.getItem('pwa-qr-timing:active-tab')
      const VALID_TABS = ['home', 'chronometer', 'results', 'runners', 'races', 'scanner']
      return (stored && VALID_TABS.includes(stored)) ? stored : 'home'
    } catch {
      return 'home'
    }
  })
  const [isNavMinimized, setIsNavMinimized] = useState(() => {
    try {
      return localStorage.getItem('pwa-qr-timing:nav-minimized') === 'true'
    } catch {
      return false
    }
  })

  const [navHistory, setNavHistory] = useState(() => {
    try {
      const stored = sessionStorage.getItem('pwa-qr-timing:active-tab')
      const VALID_TABS = ['home', 'chronometer', 'results', 'runners', 'races', 'scanner']
      const restoredTab = (stored && VALID_TABS.includes(stored)) ? stored : 'home'
      return restoredTab === 'home' ? ['home'] : ['home', restoredTab]
    } catch {
      return ['home']
    }
  })
  const chronometerFrameRef = useRef(null)

  const setTab = useCallback((newTab) => {
    setTabState(newTab)
    try { sessionStorage.setItem('pwa-qr-timing:active-tab', newTab) } catch {}
  }, [])

  const focusChronometerFrame = useCallback(() => {
    const frame = chronometerFrameRef.current
    if (!frame) return
    try {
      frame.focus()
      frame.contentWindow?.focus()
      frame.contentWindow?.postMessage({ type: 'FOCUS_BIB_INPUT' }, '*')
    } catch (e) {}
  }, [])

  const handleToggleMinimize = () => {
    setIsNavMinimized(prev => {
      const next = !prev
      try {
        localStorage.setItem('pwa-qr-timing:nav-minimized', String(next))
      } catch {}
      return next
    })
  }

  const handleNavigate = (newTab) => {
    if (newTab === tab) return
    if (isBatchPrintActive()) {
      const confirmed = window.confirm('Há uma impressão em lote em andamento. Sair desta tela pode atrapalhar o controle do processo. Deseja continuar?')
      if (!confirmed) return
    }
    setNavHistory(prev => [...prev, newTab])
    setTab(newTab)
  }

  const handleBack = () => {
    if (isBatchPrintActive()) {
      const confirmed = window.confirm('Há uma impressão em lote em andamento. Deseja realmente sair desta tela?')
      if (!confirmed) return
    }
    if (navHistory.length > 1) {
      const nextHistory = [...navHistory]
      nextHistory.pop()
      const prevTab = nextHistory[nextHistory.length - 1]
      setNavHistory(nextHistory)
      setTab(prevTab)
    } else {
      setTab('home')
    }
  }

  const handleLogout = () => {
    if (isBatchPrintActive()) {
      const confirmed = window.confirm('Há uma impressão em lote em andamento. Deseja encerrar mesmo assim?')
      if (!confirmed) return
    }
    try { sessionStorage.removeItem('qr-cronorace:auth-v1') } catch {}
    try { sessionStorage.removeItem('pwa-qr-timing:active-tab') } catch {}
    setTab('home')
    setNavHistory(['home'])
  }

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isBatchPrintActive()) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    const handleRecordArrival = async (data) => {
      if (activeRace?.endTime) {
        console.warn('Registro de chegada recusado: a corrida já está encerrada.')
        return
      }
      const bib = String(data?.bib || '').trim()
      const targetRaceId = data?.raceId || activeRace?.id || getStoredActiveRaceId()
      if (!targetRaceId || !bib) return

      let runner = (runners || []).find(r => String(parseInt(r.number, 10)) === String(parseInt(bib, 10)))
      if (!runner) {
        try {
          const raw = localStorage.getItem('pwa-qr-timing:runners-lookup')
          if (raw) {
            const list = JSON.parse(raw)
            runner = list.find(r => {
              const sameBib = String(parseInt(r.number, 10)) === String(parseInt(bib, 10))
              if (!sameBib) return false
              if (!targetRaceId) return true
              if (!r?.raceId) return true
              return r.raceId === targetRaceId
            })
          }
        } catch (e) {}
      }

      const fallbackBarcode = data?.barcode || `${targetRaceId}:${String(parseInt(bib, 10))}`
      const fallbackRunnerName = data?.runnerName || `Nº ${bib}`
      const runnerBarcode = runner?.id || fallbackBarcode
      const runnerNumber = runner?.number || bib
      const runnerName = runner?.name || fallbackRunnerName

      if (runner?.raceId && runner.raceId !== targetRaceId) {
        console.warn('Registro de chegada ignorado: corredor pertence a outra corrida.')
        return
      }

      const readAt = new Date()
      const result = {
        barcode: runnerBarcode,
        runnerNumber: runnerNumber,
        dateTime: readAt.toISOString(),
        timestamp: String(readAt.getTime()),
        raceId: targetRaceId,
        runnerName: runnerName,
        time: data?.time || null,
        elapsedMs: typeof data?.elapsedMs === 'number' ? data.elapsedMs : null
      }
      try {
        await addResult(result)
      } catch (err) {
        console.error('Erro ao adicionar resultado Firestore:', err)
      }
    }

    const handleMessage = (event) => {
      if (event.data?.type === 'BACK') {
        handleBack()
      } else if (event.data?.type === 'NAVIGATE') {
        handleNavigate(event.data.tab || 'home')
      } else if (event.data?.type === 'RECORD_ARRIVAL') {
        handleRecordArrival(event.data)
        if (navigator.vibrate) {
          try { navigator.vibrate([350, 100, 350, 100, 500]) } catch (e) {}
        }
      } else if (event.data?.type === 'VIBRATE') {
        if (navigator.vibrate) {
          try {
            const pat = event.data?.pattern || [350, 100, 350, 100, 500]
            navigator.vibrate(pat)
          } catch (e) {}
        }
      } else if (event.data?.type === 'RACE_FINISHED') {
        if (activeRace) {
          const endTime = event.data.endTime || new Date().toISOString()
          selectRace({
            ...activeRace,
            endTime,
            elapsedAtPause: typeof event.data.elapsedAtPause === 'number' ? event.data.elapsedAtPause : activeRace.elapsedAtPause
          })
        }
      } else if (event.data?.type === 'RACE_RESET') {
        // NÃO deletamos resultados aqui - chronometer.html já faz isso (evitar race condition)
        if (activeRace) {
          selectRace({ ...activeRace, startTime: null, endTime: null, elapsedAtPause: null, pauseTime: null })
        }
      }
    }
    window.addEventListener('message', handleMessage)

    let bc = null
    try {
      bc = new BroadcastChannel('qr-cronorace-channel')
      bc.onmessage = (event) => {
        if (event.data?.type === 'RECORD_ARRIVAL') {
          handleRecordArrival(event.data)
        } else if (event.data?.type === 'RACE_FINISHED') {
          if (activeRace) {
            const endTime = event.data.endTime || new Date().toISOString()
            selectRace({
              ...activeRace,
              endTime,
              elapsedAtPause: typeof event.data.elapsedAtPause === 'number' ? event.data.elapsedAtPause : activeRace.elapsedAtPause
            })
          }
        } else if (event.data?.type === 'RACE_RESET') {
          if (activeRace) {
            selectRace({ ...activeRace, startTime: null, endTime: null, elapsedAtPause: null, pauseTime: null })
          }
        }
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('message', handleMessage)
      if (bc) bc.close()
    }
  }, [navHistory, tab, activeRace?.id, runners])

  useEffect(() => {
    if (tab !== 'chronometer') return
    const t1 = window.setTimeout(() => focusChronometerFrame(), 80)
    const t2 = window.setTimeout(() => focusChronometerFrame(), 260)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [tab, focusChronometerFrame])

  const canGoBack = tab !== 'home'

  if (loading) return <div className="app"><main><p>Carregando...</p></main></div>

  return (
    <div className={`app ${isNavMinimized ? 'app--nav-minimized' : ''}`}>
      {tab !== 'home' && tab !== 'chronometer' && tab !== 'results' && (
        <header className="app-header">
          <div className="app-header-inner">
            {canGoBack && (
              <button
                type="button"
                className="header-back-btn"
                onClick={handleBack}
                aria-label="Voltar"
                title="Voltar à tela anterior"
              >
                <IconChevronLeft size={20} />
              </button>
            )}
            <button
              type="button"
              className="header-logout-btn"
              onClick={handleLogout}
              aria-label="Sair do sistema"
              title="Sair do sistema"
            >
              🚪 Sair
            </button>
            <div className="app-header-title-wrap">
              <h1>{tab === 'runners' && activeRace?.name ? `Corredores - ${activeRace.name}` : TAB_TITLES[tab]}</h1>
            </div>
          </div>
        </header>
      )}

      <main className={tab === 'home' ? 'no-header race-config-main-wrap' : tab === 'chronometer' ? 'chronometer-main-wrap' : tab === 'results' ? 'results-main-wrap' : ''}>

        {tab === 'home' && <RaceHomePage onNavigate={handleNavigate} onOpenScanner={() => handleNavigate('scanner')} />}
        {tab === 'races' && <RaceSetupPage onRaceSelected={() => handleNavigate('home')} onNavigate={handleNavigate} />}
        {tab === 'runners' && <RunnersPage />}
        {tab === 'scanner' && <ScannerPage onBack={handleBack} />}
        {tab === 'results' && <ResultsPage onBack={() => handleNavigate('home')} />}
        {tab === 'chronometer' && (
          <iframe
            ref={chronometerFrameRef}
            src={`/chronometer.html?t=${activeRace?.id || "live"}`}
            title="Cronômetro"
            allow="autoplay"
            scrolling="no"
            tabIndex={0}
            onLoad={() => focusChronometerFrame()}
            style={{
              width: '100%',
              height: isNavMinimized ? '100vh' : 'calc(100vh - var(--bottom-nav-h))',
              border: 'none',
              display: 'block',
              overflow: 'hidden'
            }}
          />
        )}

      </main>


    </div>
  )
}

export default function AppContent() {
  return (
    <ActiveRaceProvider>
      <InnerAppContent />
    </ActiveRaceProvider>
  )
}

