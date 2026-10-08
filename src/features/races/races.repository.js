// Responsabilidade única: persistência das corridas cadastradas (Cloud Firestore).
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../shared/firebase.js'

/** @param {import('./races.types.js').Race} race */
export async function addRace(race) {
  await setDoc(doc(db, COLLECTIONS.races, race.id), race)
  return race
}

/** @returns {Promise<Array<import('./races.types.js').Race>>} */
export async function getAllRaces() {
  const snap = await getDocs(query(collection(db, COLLECTIONS.races), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => d.data())
}

/** @param {string} id @returns {Promise<import('./races.types.js').Race | undefined>} */
export async function getRaceById(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.races, id))
  return snap.exists() ? snap.data() : undefined
}

