import React, { useState } from 'react'
import ResultsPage from './features/results/ResultsPage.jsx'
import ScannerPage from './features/scanner/ScannerPage.jsx'
import RunnersPage from './features/runners/RunnersPage.jsx'
import PublicRunnerRegister from './features/runners/PublicRunnerRegister.jsx'
import RaceSetupPage from './features/races/RaceSetupPage.jsx'
import { ActiveRaceProvider, useActiveRace } from './features/races/ActiveRaceContext.jsx'
import AppMenu from './shared/AppMenu.jsx'

/** @returns {boolean} true quando a URL atual pede a tela pública de cadastro (link compartilhado) */
function isPublicRegisterRequest() {
  return new URLSearchParams(window.location.search).get('cadastro') === '1'
}

const TAB_TITLES = {
  runners: 'Corredores',
  scanner: 'Scanner',
  results: 'Ranking'
}

function AppContent() {
  const { activeRace, loading, clearActiveRace } = useActiveRace()
  const [tab, setTab] = useState('runners')
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) return <div className="app"><main><p>Carregando...</p></main></div>

  if (!activeRace) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>PWA QR Timing</h1>
        </header>
        <main><RaceSetupPage /></main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="menu-toggle-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">☰</button>
        <h1>{TAB_TITLES[tab]}</h1>
      </header>

      <AppMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentTab={tab}
        onNavigate={setTab}
        raceName={activeRace.name}
        onChangeRace={clearActiveRace}
      />

      <main>
        {tab === 'runners' && <RunnersPage />}
        {tab === 'scanner' && <ScannerPage />}
        {tab === 'results' && <ResultsPage />}
      </main>
    </div>
  )
}

export default function App(){
  if (isPublicRegisterRequest()) {
    return <PublicRunnerRegister />
  }
  return (
    <ActiveRaceProvider>
      <AppContent />
    </ActiveRaceProvider>
  )
}


