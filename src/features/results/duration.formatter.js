// Responsabilidade única: formatação de durações (tempo de prova) para exibição.

/**
 * Formata uma duração em milissegundos como hh:mm:ss (ou mm:ss se menor que 1h).
 * @param {number} durationMs
 * @returns {string}
 */
export function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return '—'

  const totalSeconds = Math.floor(durationMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}
