// Responsabilidade única: persistência das corridas cadastradas (IndexedDB via idb).
import { getDB, STORES } from '../../shared/db.js'

/** @param {import('./races.types.js').Race} race */
export async function addRace(race) {
  const db = await getDB()
  await db.put(STORES.races, race)
  return race
}

/** @returns {Promise<Array<import('./races.types.js').Race>>} */
export async function getAllRaces() {
  const db = await getDB()
  const races = await db.getAll(STORES.races)
  return races.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/** @param {string} id @returns {Promise<import('./races.types.js').Race | undefined>} */
export async function getRaceById(id) {
  const db = await getDB()
  return db.get(STORES.races, id)
}
