// Responsabilidade única: regras de negócio puras sobre resultados de chegada.

/**
 * Remove leituras duplicadas do mesmo corredor, mantendo apenas a primeira leitura
 * (menor data/hora) de cada barcode.
 * @param {Array<import('./results.types.js').ResultRow>} results
 * @returns {Array<import('./results.types.js').ResultRow>}
 */
export function deduplicateByEarliestReading(results) {
  const earliestByBarcode = new Map()

  for (const result of results) {
    const current = earliestByBarcode.get(result.barcode)
    if (!current || toComparableTime(result) < toComparableTime(current)) {
      earliestByBarcode.set(result.barcode, result)
    }
  }

  return Array.from(earliestByBarcode.values())
}

/**
 * Ordena os resultados pela data/hora (ordem de chegada) e atribui a colocação,
 * descartando leituras duplicadas (mantém apenas a primeira leitura de cada corredor).
 * @param {Array<import('./results.types.js').ResultRow>} results
 * @returns {Array<import('./results.types.js').PlacementResult>}
 */
export function sortByPlacement(results) {
  return deduplicateByEarliestReading(results)
    .sort((a, b) => toComparableTime(a) - toComparableTime(b))
    .map((result, index) => ({ ...result, position: index + 1 }))
}

/** @param {import('./results.types.js').ResultRow} result @returns {number} */
function toComparableTime(result) {
  const parsedDate = Date.parse(result.dateTime)
  return Number.isFinite(parsedDate) ? parsedDate : Number.MAX_SAFE_INTEGER
}


