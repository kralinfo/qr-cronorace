// Responsabilidade única: persistência dos corredores cadastrados (Cloud Firestore).
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../shared/firebase.js'

/**
 * @param {import('./runners.types.js').Runner} runner
 */
export async function addRunner(runner) {
  const hasDuplicateNumber = await raceAlreadyHasNumber(runner.raceId, runner.number)
  if (hasDuplicateNumber) {
    throw new Error('RUNNER_NUMBER_ALREADY_EXISTS')
  }
  await setDoc(doc(db, COLLECTIONS.runners, runner.id), runner)
  return runner
}

/**
 * @param {string} raceId
 * @returns {Promise<Array<import('./runners.types.js').Runner>>}
 */
export async function getRunnersByRace(raceId) {
  const snap = await getDocs(query(collection(db, COLLECTIONS.runners), where('raceId', '==', raceId)))
  return snap.docs.map(d => d.data())
}

/** @param {string} id @returns {Promise<import('./runners.types.js').Runner | undefined>} */
export async function getRunnerById(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.runners, id))
  return snap.exists() ? snap.data() : undefined
}

/**
 * Escuta em tempo real os corredores de uma corrida, chamando `onChange` sempre que
 * houver um novo cadastro (de qualquer dispositivo, inclusive via link público).
 * @param {string} raceId
 * @param {(runners: Array<import('./runners.types.js').Runner>) => void} onChange
 * @returns {() => void} função para cancelar a inscrição (unsubscribe)
 */
export function subscribeToRunnersByRace(raceId, onChange) {
  const q = query(collection(db, COLLECTIONS.runners), where('raceId', '==', raceId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map(d => d.data()))
  })
}

/**
 * @param {string} raceId
 * @param {string|undefined} runnerNumber
 * @returns {Promise<boolean>}
 */
async function raceAlreadyHasNumber(raceId, runnerNumber) {
  const normalizedNumber = String(runnerNumber ?? '').trim().toLowerCase()
  if (!normalizedNumber) return false

  const snap = await getDocs(query(collection(db, COLLECTIONS.runners), where('raceId', '==', raceId)))
  return snap.docs.some(d => String(d.data().number ?? '').trim().toLowerCase() === normalizedNumber)
}



