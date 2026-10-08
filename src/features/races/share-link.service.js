// Responsabilidade única: construir os links públicos (cadastro e ranking) para compartilhar.

/** @returns {string} link que abre a tela de cadastro público (fora do fluxo do organizador) */
export function buildRegistrationLink() {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('cadastro', '1')
  return url.toString()
}

/**
 * @param {string} raceId
 * @returns {string} link que abre o ranking público em tempo real (ideal para TV/telão)
 */
export function buildRankingLink(raceId) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('ranking', '1')
  url.searchParams.set('corrida', raceId)
  return url.toString()
}

