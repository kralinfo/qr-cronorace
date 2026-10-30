// Responsabilidade única: regras de negócio puras sobre resultados de chegada.

/**
 * Filtra e desduplica resultados mantendo sempre o registro mais recente e válido
 * da corrida atual.
 * Se houver horário de largada (startTime), descarta leituras que ocorreram antes da largada.
 * Se o mesmo corredor tiver mais de um registro, mantém o mais recente (última chegada).
 * @param {Array<import('./results.types.js').ResultRow>} results
 * @param {string|null|undefined} [startTime]
 * @returns {Array<import('./results.types.js').ResultRow>}
 */
export function deduplicateByLatestReading(results, startTime) {
  const startMs = startTime ? Date.parse(startTime) : NaN
  const latestByBarcode = new Map()

  for (const result of results) {
    const arrivalMs = toComparableTime(result)
    // Se a corrida tem largada definida, descarta leituras feitas antes da largada atual
    if (Number.isFinite(startMs) && arrivalMs < (startMs - 2000)) {
      continue
    }

    const current = latestByBarcode.get(result.barcode)
    // Mantém o registro mais recente (última corrida / última passagem)
    if (!current || arrivalMs > toComparableTime(current)) {
      latestByBarcode.set(result.barcode, result)
    }
  }

  return Array.from(latestByBarcode.values())
}

/** Compatibilidade com código legado */
export const deduplicateByEarliestReading = deduplicateByLatestReading

/**
 * Ordena os resultados pela ordem de chegada da corrida atual e atribui a colocação.
 * @param {Array<import('./results.types.js').ResultRow>} results
 * @param {string|null|undefined} [startTime]
 * @returns {Array<import('./results.types.js').PlacementResult>}
 */
export function sortByPlacement(results, startTime) {
  return deduplicateByLatestReading(results, startTime)
    .sort((a, b) => toComparableTime(a) - toComparableTime(b))
    .map((result, index) => ({ ...result, position: index + 1 }))
}

/** @param {import('./results.types.js').ResultRow} result @returns {number} */
function toComparableTime(result) {
  if (result.timestamp && Number.isFinite(Number(result.timestamp))) {
    return Number(result.timestamp)
  }
  const parsedDate = Date.parse(result.dateTime)
  return Number.isFinite(parsedDate) ? parsedDate : Number.MAX_SAFE_INTEGER
}

/**
 * Adiciona o tempo de prova (elapsedMs) de cada colocação a partir do horário de largada
 * ou do elapsedMs prévio registrado pelo cronômetro.
 * @param {Array<import('./results.types.js').PlacementResult>} placements
 * @param {string|null|undefined} startTime - Horário da largada (ISO).
 * @returns {Array<import('./results.types.js').PlacementResult & { elapsedMs: number|null }>}
 */
export function withElapsedTime(placements, startTime) {
  const startMs = startTime ? Date.parse(startTime) : NaN
  return placements.map(p => {
    // Se já veio com elapsedMs gravado pelo cronômetro
    if (typeof p.elapsedMs === 'number' && Number.isFinite(p.elapsedMs)) {
      return p
    }
    if (Number.isFinite(startMs)) {
      const arrivalMs = toComparableTime(p)
      const elapsedMs = arrivalMs >= startMs ? arrivalMs - startMs : null
      return { ...p, elapsedMs }
    }
    return { ...p, elapsedMs: null }
  })
}
