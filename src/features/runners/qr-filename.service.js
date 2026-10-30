// Responsabilidade única: padronizar o nome de arquivo do código de barras de um corredor.

/**
 * Monta o nome do arquivo do código de barras a partir do id e nome do corredor.
 * @param {import('./runners.types.js').Runner} runner
 * @returns {string}
 */
export function buildQRFilename(runner) {
  const rawName = (runner?.name || '').trim()
  const sanitizedName = rawName.replace(/\s+/g, '-').replace(/[^\\w-]/g, '')
  return `${runner?.id || 'corredor'}-${sanitizedName || 'sem-nome'}.png`
}