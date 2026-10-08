// Responsabilidade única: persistência dos resultados (IndexedDB via idb).
import { getDB, STORES } from '../../shared/db.js'

/**
 * Adiciona um único resultado (ex.: proveniente de uma leitura de QR em tempo real)
 * sem apagar os resultados já existentes.
 * @param {import('./results.types.js').ResultRow} result
 */
export async function addResult(result) {
  const db = await getDB()
  const record = { id: buildId(result), ...result }
  await db.put(STORES.results, record)
  return record
}

/**
 * @param {string} raceId
 * @returns {Promise<Array<import('./results.types.js').ResultRow>>}
 */
export async function getResultsByRace(raceId) {
  const db = await getDB()
  const all = await db.getAll(STORES.results)
  return all.filter(r => r.raceId === raceId)
}

export async function clearResults() {
  const db = await getDB()
  await db.clear(STORES.results)
}

/** @param {import('./results.types.js').ResultRow} result @returns {string} */
function buildId(result) {
  return `${result.barcode}_${result.timestamp}_${Math.random().toString(36).slice(2, 8)}`
}

