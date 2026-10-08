// Responsabilidade única: construir o texto da classificação e os links de compartilhamento
// (WhatsApp e e-mail) a partir do ranking atual.
import { formatDateTimeBR } from './date.formatter.js'
import { formatDuration } from './duration.formatter.js'

/**
 * @param {string} raceName
 * @param {Array<import('./results.types.js').PlacementResult & { elapsedMs: number|null }>} placements
 * @param {(barcode: string) => string} getRunnerName
 * @returns {string}
 */
export function buildRankingText(raceName, placements, getRunnerName) {
  const lines = placements.map(p => {
    const name = getRunnerName(p.barcode) ?? '—'
    const time = p.elapsedMs != null ? formatDuration(p.elapsedMs) : formatDateTimeBR(p.dateTime)
    return `${p.position}º ${name} - ${time}`
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
