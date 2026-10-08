// Responsabilidade única: persistência dos corredores cadastrados (Cloud Firestore).
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../shared/firebase.js'

/**
 * @param {import('./runners.types.js').Runner} runner
 */
export async function addRunner(runner) {
  const existingWithNumber = await findRunnerInRaceByNumber(runner.raceId, runner.number)
  if (existingWithNumber) {
    const error = new Error('RUNNER_NUMBER_ALREADY_EXISTS')
    error.existingRunner = existingWithNumber
    throw error
  }

  const existingWithName = await findRunnerInRaceByName(runner.raceId, runner.name)
  if (existingWithName) {
    const error = new Error('RUNNER_NAME_ALREADY_EXISTS')
    error.existingRunner = existingWithName
    throw error
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

/**
 * Retorna todos os corredores cadastrados em todas as corridas.
 * @returns {Promise<Array<import('./runners.types.js').Runner>>}
 */
export async function getAllRunners() {
  const snap = await getDocs(collection(db, COLLECTIONS.runners))
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
 * Escuta em tempo real todos os corredores de todas as corridas.
 * @param {(runners: Array<import('./runners.types.js').Runner>) => void} onChange
 * @returns {() => void} função para cancelar a inscrição (unsubscribe)
 */
export function subscribeToAllRunners(onChange) {
  const q = collection(db, COLLECTIONS.runners)
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map(d => d.data()))
  })
}

/**
 * @param {string} raceId
 * @param {string|undefined} runnerNumber
 * @returns {Promise<import('./runners.types.js').Runner | undefined>}
 */
export async function findRunnerInRaceByNumber(raceId, runnerNumber) {
  const normalizedNumber = normalizeComparable(runnerNumber)
  if (!normalizedNumber) return undefined

  const snap = await getDocs(query(collection(db, COLLECTIONS.runners), where('raceId', '==', raceId)))
  const foundDoc = snap.docs.find(d => normalizeComparable(d.data().number) === normalizedNumber)
  return foundDoc ? foundDoc.data() : undefined
}

/**
 * @param {string} raceId
 * @param {string|undefined} runnerName
 * @returns {Promise<import('./runners.types.js').Runner | undefined>}
 */
export async function findRunnerInRaceByName(raceId, runnerName) {
  const normalizedName = normalizeComparable(runnerName)
  if (!normalizedName) return undefined

  const snap = await getDocs(query(collection(db, COLLECTIONS.runners), where('raceId', '==', raceId)))
  const foundDoc = snap.docs.find(d => normalizeComparable(d.data().name) === normalizedName)
  return foundDoc ? foundDoc.data() : undefined
}

/**
 * Normaliza strings para comparação (trim, lowercase, remove múltiplos espaços).
 * @param {string|undefined|null} value
 * @returns {string}
 */
export function normalizeComparable(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}




