import React from 'react'
import AppContent from './AppContent.jsx'
import PublicRunnerRegister from './features/runners/PublicRunnerRegister.jsx'
import PublicRankingPage from './features/results/PublicRankingPage.jsx'
import PublicResultLookupPage from './features/results/PublicResultLookupPage.jsx'
import PinGate from './shared/PinGate.jsx'

/** @returns {boolean} true quando a URL atual pede a tela pública de cadastro (link compartilhado) */
function isPublicRegisterRequest() {
  return new URLSearchParams(window.location.search).get('cadastro') === '1'
}

/** @returns {boolean} true quando a URL atual pede o ranking público (link compartilhado para TV/telão) */
function isPublicRankingRequest() {
  return new URLSearchParams(window.location.search).get('ranking') === '1'
}

/** @returns {boolean} true quando a URL atual pede a consulta individual de resultado pelo corredor */
function isPublicResultLookupRequest() {
  const p = new URLSearchParams(window.location.search)
  return p.get('resultado') === '1' || p.get('posicao') === '1' || p.get('consulta') === '1'
}

/**
 * Garante isolamento das páginas públicas:
 * apaga a sessão de autenticação do organizador do sessionStorage,
 * para que ao manipular a URL (removendo ?ranking=1, ?resultado=1 etc.)
 * o PinGate seja sempre exibido — mesmo que o organizador já tenha logado
 * neste browser antes.
 */
function clearOrganizerSession() {
  try { sessionStorage.removeItem('qr-cronorace:auth-v1') } catch {}
}

export default function App() {
  if (isPublicRegisterRequest()) {
    clearOrganizerSession()
    return <PublicRunnerRegister />
  }
  if (isPublicRankingRequest()) {
    clearOrganizerSession()
    return <PublicRankingPage />
  }
  if (isPublicResultLookupRequest()) {
    clearOrganizerSession()
    return <PublicResultLookupPage />
  }

  return (
    <PinGate>
      <AppContent />
    </PinGate>
  )
}
