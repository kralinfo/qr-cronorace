import React, { useState, useEffect } from 'react'
import ResultsPage from './features/results/ResultsPage.jsx'
import ScannerPage from './features/scanner/ScannerPage.jsx'
import RunnersPage from './features/runners/RunnersPage.jsx'
import PublicRunnerRegister from './features/runners/PublicRunnerRegister.jsx'
import PublicRankingPage from './features/results/PublicRankingPage.jsx'
import RaceSetupPage from './features/races/RaceSetupPage.jsx'
import RaceHomePage from './features/races/RaceHomePage.jsx'
import { ActiveRaceProvider, useActiveRace } from './features/races/ActiveRaceContext.jsx'
import BottomNav from './shared/BottomNav.jsx'
import { IconChevronLeft } from './shared/Icons.jsx'

/** @returns {boolean} true quando a URL atual pede a tela pública de cadastro (link compartilhado) */
function isPublicRegisterRequest() {
  return new URLSearchParams(window.location.search).get('cadastro') === '1'
}

/** @returns {boolean} true quando a URL atual pede o ranking público (link compartilhado para TV/telão) */
function isPublicRankingRequest() {
  return new URLSearchParams(window.location.search).get('ranking') === '1'
}

const TAB_TITLES = {
  home: 'Início',
  races: 'Corridas',
  runners: 'Corredores',
  scanner: 'Scanner',
  results: 'Ranking',
  chronometer: 'Cronômetro'

}

function AppContent() {
  const { activeRace, loading, clearActiveRace } = useActiveRace()
  const [tab, setTabState] = useState('home')
  const [navHistory, setNavHistory] = useState(['home'])
  const [isNavMinimized, setIsNavMinimized] = useState(() => {
    try {
      return localStorage.getItem('pwa-qr-timing:nav-minimized') === 'true'
    } catch {
      return false
    }
  })

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
    setNavHistory(prev => [...prev, newTab])
    setTabState(newTab)
  }

  const handleBack = () => {
    if (navHistory.length > 1) {
      const nextHistory = [...navHistory]
      nextHistory.pop()
      const prevTab = nextHistory[nextHistory.length - 1]
      setNavHistory(nextHistory)
      setTabState(prevTab)
    } else {
      setTabState('home')
    }
  }

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'BACK') {
        handleBack()
      } else if (event.data?.type === 'NAVIGATE') {
        handleNavigate(event.data.tab || 'home')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [navHistory, tab])

  const canGoBack = tab !== 'home'

  if (loading) return <div className="app"><main><p>Carregando...</p></main></div>

  return (
    <div className={`app ${isNavMinimized ? 'app--nav-minimized' : ''}`}>
      {tab !== 'home' && tab !== 'chronometer' && (
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
            <div className="app-header-title-wrap">
              <h1>{tab === 'runners' && activeRace?.name ? `Corredores - ${activeRace.name}` : TAB_TITLES[tab]}</h1>
            </div>
          </div>
        </header>
      )}

      <main className={tab === 'home' ? 'no-header race-config-main-wrap' : (tab === 'chronometer' ? 'chronometer-main-wrap' : '')}>

        {tab === 'home' && <RaceHomePage onNavigate={handleNavigate} onOpenScanner={() => handleNavigate('scanner')} />}
        {tab === 'races' && <RaceSetupPage onRaceSelected={() => handleNavigate('home')} onNavigate={handleNavigate} />}
        {tab === 'runners' && <RunnersPage />}
        {tab === 'scanner' && <ScannerPage onBack={handleBack} />}
        {tab === 'results' && <ResultsPage />}
        {tab === 'chronometer' && (
          <iframe
            src="/chronometer.html"
            title="Cronômetro"
            scrolling="no"
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

      <BottomNav
        currentTab={tab}
        onNavigate={handleNavigate}
        hasActiveRace={Boolean(activeRace)}
        isRaceStarted={Boolean(activeRace?.startTime)}
        isMinimized={isNavMinimized}
        onToggleMinimize={handleToggleMinimize}
      />

    </div>
  )
}

export default function App(){
  if (isPublicRegisterRequest()) {
    return <PublicRunnerRegister />
  }
  if (isPublicRankingRequest()) {
    return <PublicRankingPage />
  }
  return (
    <ActiveRaceProvider>
      <AppContent />
    </ActiveRaceProvider>
  )
}
