// Responsabilidade única: persistência dos corredores cadastrados (IndexedDB via idb).
import { getDB, STORES } from '../../shared/db.js'

/**
 * @param {import('./runners.types.js').Runner} runner
 */
export async function addRunner(runner) {
  const db = await getDB()
  await db.put(STORES.runners, runner)
  return runner
}

/**
 * @param {string} raceId
 * @returns {Promise<Array<import('./runners.types.js').Runner>>}
 */
export async function getRunnersByRace(raceId) {
  const db = await getDB()
  const all = await db.getAll(STORES.runners)
  return all.filter(r => r.raceId === raceId)
}

/** @param {string} id @returns {Promise<import('./runners.types.js').Runner | undefined>} */
export async function getRunnerById(id) {
  const db = await getDB()
  return db.get(STORES.runners, id)
}

