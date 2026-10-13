// Responsabilidade única: persistência dos corredores cadastrados (Cloud Firestore).
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../shared/firebase.js'
import { normalizeCpf } from './runner-formatter.service.js'

/**
 * @param {import('./runners.types.js').Runner} runner
 */
export async function addRunner(runner) {
  if (runner.cpf) {
    const existingWithCpf = await findRunnerInRaceByCpf(runner.raceId, runner.cpf)
    if (existingWithCpf) {
      const error = new Error('RUNNER_CPF_ALREADY_EXISTS')
      error.existingRunner = existingWithCpf
      throw error
    }
  }

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
 * Atualiza os dados de um corredor existente (ex: número que faltava ou nome).
 * @param {string} id
 * @param {{ name?: string, number?: string, raceId?: string }} updates
 */
export async function updateRunner(id, updates) {
  const current = await getRunnerById(id)
  if (!current) {
    throw new Error('RUNNER_NOT_FOUND')
  }

  const effectiveRaceId = updates.raceId ?? current.raceId

  if (updates.cpf) {
    const existingWithCpf = await findRunnerInRaceByCpf(effectiveRaceId, updates.cpf)
    if (existingWithCpf && existingWithCpf.id !== id) {
      const error = new Error('RUNNER_CPF_ALREADY_EXISTS')
      error.existingRunner = existingWithCpf
      throw error
    }
  }

  if (updates.number) {
    const existingWithNumber = await findRunnerInRaceByNumber(effectiveRaceId, updates.number)
    if (existingWithNumber && existingWithNumber.id !== id) {
      const error = new Error('RUNNER_NUMBER_ALREADY_EXISTS')
      error.existingRunner = existingWithNumber
      throw error
    }
  }

  if (updates.name) {
    const existingWithName = await findRunnerInRaceByName(effectiveRaceId, updates.name)
    if (existingWithName && existingWithName.id !== id) {
      const error = new Error('RUNNER_NAME_ALREADY_EXISTS')
      error.existingRunner = existingWithName
      throw error
    }
  }

  const payload = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.number !== undefined) payload.number = updates.number
  if (updates.cpf !== undefined) payload.cpf = updates.cpf
  if (updates.raceId !== undefined) payload.raceId = updates.raceId

  await updateDoc(doc(db, COLLECTIONS.runners, id), payload)
  return { ...current, ...payload }
}

/**
 * Exclui um corredor cadastrado.
 * @param {string} id
 */
export async function deleteRunner(id) {
  await deleteDoc(doc(db, COLLECTIONS.runners, id))
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
 * @param {string} raceId
 * @param {string|undefined} runnerCpf
 * @returns {Promise<import('./runners.types.js').Runner | undefined>}
 */
export async function findRunnerInRaceByCpf(raceId, runnerCpf) {
  const normalizedTargetCpf = normalizeCpf(runnerCpf)
  if (!normalizedTargetCpf) return undefined

  const snap = await getDocs(query(collection(db, COLLECTIONS.runners), where('raceId', '==', raceId)))
  const foundDoc = snap.docs.find(d => normalizeCpf(d.data().cpf) === normalizedTargetCpf)
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




