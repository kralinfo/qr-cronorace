// Responsabilidade única: construir os links públicos (cadastro e ranking) para compartilhar.

/**
 * Constrói link para cadastro público de corredores.
 * @param {string|null} [raceId] - ID ou código da corrida
 * @param {boolean} [direct=false] - Se true, inclui o código da corrida na URL para entrar direto sem exigir digitar código.
 * @returns {string}
 */
export function buildRegistrationLink(raceId = null, direct = false) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('cadastro', '1')
  if (direct && raceId) {
    url.searchParams.set('corrida', raceId)
  }
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
