// Responsabilidade única: construir o registro de chegada a partir dos dados lidos no QR.

/**
 * Monta o resultado de chegada a partir do payload decodificado do QR, do instante da leitura
 * e da corrida ativa.
 * @param {{ id: string, name: string|null }} runnerData
 * @param {string} raceId
 * @param {Date} [readAt]
 * @returns {import('../results/results.types.js').ResultRow}
 */
export function buildArrivalResult(runnerData, raceId, readAt = new Date()) {
  return {
    barcode: runnerData.id,
    dateTime: readAt.toISOString(),
    timestamp: String(readAt.getTime()),
    raceId
  }
}

