import { formatDateTimeBR, formatTimeOnlyBR } from './date.formatter.js'
import { formatDuration } from './duration.formatter.js'

/**
 * @param {string} raceName
 * @param {Array<import('./results.types.js').PlacementResult & { elapsedMs: number|null }>} placements
 * @param {(barcode: string) => string} getRunnerName
 * @param {(barcode: string) => string|undefined} [getRunnerNumber]
 * @returns {string}
 */
export function buildRankingText(raceName, placements, getRunnerName, getRunnerNumber) {
  const lines = placements.map(p => {
    const name = getRunnerName(p.barcode) ?? '—'
    const num = getRunnerNumber ? getRunnerNumber(p.barcode) : p.runnerNumber
    const numPrefix = num ? `(Nº ${num}) ` : ''
    const time = p.elapsedMs != null ? formatDuration(p.elapsedMs) : '—'
    const arrivalTime = formatTimeOnlyBR(p.dateTime)
    return `${p.position}º ${numPrefix}${name} - Tempo: ${time} | Chegada: ${arrivalTime}`
  })
  return `Classificação - ${raceName}\n\n${lines.join('\n')}`
}

/** @param {string} text @returns {string} link mailto com o texto no corpo do e-mail */
export function buildEmailShareLink(text) {
  const subject = encodeURIComponent('Classificação da corrida')
  const body = encodeURIComponent(text)
  return `mailto:?subject=${subject}&body=${body}`
}

/** @param {string} text @returns {string} link wa.me com o texto pré-preenchido */
export function buildWhatsAppShareLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
