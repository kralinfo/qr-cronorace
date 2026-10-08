// Responsabilidade única: persistência das corridas cadastradas (Cloud Firestore).
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../shared/firebase.js'

/** @param {import('./races.types.js').Race} race */
export async function addRace(race) {
  await setDoc(doc(db, COLLECTIONS.races, race.id), race)
  return race
}

/**
 * @param {string} raceId
 * @param {string} startTime - Horário da largada (ISO).
 */
export async function updateRaceStartTime(raceId, startTime) {
  await updateDoc(doc(db, COLLECTIONS.races, raceId), { startTime })
}

/**
 * @param {string} raceId
 * @param {{ name: string, eventDate: string }} details
 */
export async function updateRaceDetails(raceId, details) {
  await updateDoc(doc(db, COLLECTIONS.races, raceId), details)
}

/** @param {string} raceId */
export async function deleteRace(raceId) {
  await deleteDoc(doc(db, COLLECTIONS.races, raceId))
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

/**
 * Escuta em tempo real uma corrida específica (ex.: para refletir o horário de largada
 * assim que for definido em outro dispositivo).
 * @param {string} raceId
 * @param {(race: import('./races.types.js').Race | undefined) => void} onChange
 * @returns {() => void} função para cancelar a inscrição (unsubscribe)
 */
export function subscribeToRace(raceId, onChange) {
  return onSnapshot(doc(db, COLLECTIONS.races, raceId), (snap) => {
    onChange(snap.exists() ? snap.data() : undefined)
  })
}


