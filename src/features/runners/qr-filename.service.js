// Responsabilidade única: padronizar o nome de arquivo do QR code de um corredor.

/**
 * Monta o nome do arquivo do QR code a partir do id e nome do corredor.
 * @param {import('./runners.types.js').Runner} runner
 * @returns {string}
 */
export function buildQRFilename(runner) {
  const sanitizedName = runner.name.trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
  return `${runner.id}-${sanitizedName}.png`
}
