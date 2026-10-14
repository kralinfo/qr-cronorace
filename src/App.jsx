import React, { useState } from 'react'
import ResultsPage from './features/results/ResultsPage.jsx'
import ScannerPage from './features/scanner/ScannerPage.jsx'
import RunnersPage from './features/runners/RunnersPage.jsx'
import PublicRunnerRegister from './features/runners/PublicRunnerRegister.jsx'
import PublicRankingPage from './features/results/PublicRankingPage.jsx'
import RaceSetupPage from './features/races/RaceSetupPage.jsx'
import RaceHomePage from './features/races/RaceHomePage.jsx'
import { ActiveRaceProvider, useActiveRace } from './features/races/ActiveRaceContext.jsx'
import BottomNav from './shared/BottomNav.jsx'

/** @returns {boolean} true quando a URL atual pede a tela pública de cadastro (link compartilhado) */
function isPublicRegisterRequest() {
  return new URLSearchParams(window.location.search).get('cadastro') === '1'
}

/** @returns {boolean} true quando a URL atual pede o ranking público (link compartilhado para TV/telão) */
function isPublicRankingRequest() {
  return new URLSearchParams(window.location.search).get('ranking') === '1'
}

const TAB_TITLES = {
  home: '',
  races: 'Corridas',
  runners: 'Corredores',
  scanner: 'Scanner',
  results: 'Ranking'
}

function AppContent() {
  const { activeRace, loading, clearActiveRace } = useActiveRace()
  const [tab, setTab] = useState('home')

  if (loading) return <div className="app"><main><p>Carregando...</p></main></div>

  if (!activeRace) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="app-header-title-wrap">
            <h1>{TAB_TITLES[tab] || 'PWA QR Timing'}</h1>
          </div>
        </header>

        <main>
          {tab === 'runners' && <RunnersPage />}
          {tab === 'races' && <RaceSetupPage onRaceSelected={() => setTab('home')} />}
          {tab === 'home' && <RaceSetupPage onRaceSelected={() => setTab('home')} />}
        </main>

        <BottomNav
          currentTab={tab}
          onNavigate={setTab}
          hasActiveRace={false}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-title-wrap">
          {/* <span className="app-header-race-name">{activeRace.name}</span> */}
          <h1>{TAB_TITLES[tab]}</h1>
        </div>
      </header>

      <main>
        {tab === 'home' && <RaceHomePage onNavigate={setTab} onOpenScanner={() => setTab('scanner')} />}
        {tab === 'races' && <RaceSetupPage onRaceSelected={() => setTab('home')} />}
        {tab === 'runners' && <RunnersPage />}
        {tab === 'scanner' && <ScannerPage onBack={() => setTab('home')} />}
        {tab === 'results' && <ResultsPage />}
      </main>

      <BottomNav
        currentTab={tab}
        onNavigate={setTab}
        hasActiveRace={true}
        isRaceStarted={Boolean(activeRace.startTime)}
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
