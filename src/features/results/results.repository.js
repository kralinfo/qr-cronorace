// Responsabilidade única: persistência dos resultados (Cloud Firestore).
import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../shared/firebase.js'

/**
 * Adiciona um único resultado (ex.: proveniente de uma leitura de QR em tempo real)
 * sem apagar os resultados já existentes.
 * @param {import('./results.types.js').ResultRow} result
 */
export async function addResult(result) {
  const id = buildId(result)
  const record = { id, ...result }
  await setDoc(doc(db, COLLECTIONS.results, id), record)
  return record
}

/**
 * @param {string} raceId
 * @returns {Promise<Array<import('./results.types.js').ResultRow>>}
 */
export async function getResultsByRace(raceId) {
  const snap = await getDocs(query(collection(db, COLLECTIONS.results), where('raceId', '==', raceId)))
  return snap.docs.map(d => d.data())
}

/**
 * Escuta em tempo real os resultados de uma corrida, chamando `onChange` sempre que
 * houver uma leitura nova (de qualquer dispositivo) ou alteração nos dados.
 * @param {string} raceId
 * @param {(results: Array<import('./results.types.js').ResultRow>) => void} onChange
 * @returns {() => void} função para cancelar a inscrição (unsubscribe)
 */
export function subscribeToResultsByRace(raceId, onChange) {
  const q = query(collection(db, COLLECTIONS.results), where('raceId', '==', raceId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map(d => d.data()))
  })
}

/** @param {import('./results.types.js').ResultRow} result @returns {string} */
function buildId(result) {
  return `${result.barcode}_${result.timestamp}_${Math.random().toString(36).slice(2, 8)}`
}


