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
  await updateDoc(doc(db, COLLECTIONS.races, raceId), { startTime, endTime: null })
}

/**
 * @param {string} raceId
 * @param {string} endTime - Horário de encerramento da corrida (ISO).
 */
export async function updateRaceEndTime(raceId, endTime) {
  await updateDoc(doc(db, COLLECTIONS.races, raceId), { endTime })
}

/**
 * Reabre uma corrida que foi encerrada.
 * @param {string} raceId
 * @param {'resume'|'compensate'|'reset'} mode
 *   - 'resume': continua como se nunca tivesse sido parada (mantém startTime original)
 *   - 'compensate': desconta o intervalo em que esteve parada (ajusta startTime)
 *   - 'reset': zera o tempo e relarga neste instante
 */
export async function reopenRace(raceId, mode = 'resume', fallbackData = {}) {
  let current = {}
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.races, raceId))
    if (snap.exists()) current = snap.data() || {}
  } catch (e) {
    console.warn('Erro ao buscar dados da corrida no Firestore:', e)
  }

  // Mescla com fallback do estado local / localStorage
  let localStored = {}
  try {
    const raw = localStorage.getItem('pwa-qr-timing:active-race')
    if (raw) localStored = JSON.parse(raw)
  } catch (e) {}

  const merged = { ...localStored, ...fallbackData, ...current }
  const now = Date.now()

  // 1. Descobrir o tempo acumulado antes do encerramento (elapsedBefore)
  let elapsedBefore = 0
  if (typeof merged.elapsedAtPause === 'number' && merged.elapsedAtPause > 0) {
    elapsedBefore = merged.elapsedAtPause
  } else if (merged.endTime && (merged.startTime || merged.originalStartTime)) {
    const base = merged.startTime || merged.originalStartTime
    elapsedBefore = Math.max(0, Date.parse(merged.endTime) - Date.parse(base))
  }

  // 1.1 Resgate via cache local de chegadas
  if (elapsedBefore === 0) {
    try {
      const arrRaw = localStorage.getItem('pwa-qr-timing:chronometer-arrivals:' + raceId)
        || localStorage.getItem('pwa-qr-timing:arrivals-cache:' + raceId)
      if (arrRaw) {
        const arrList = JSON.parse(arrRaw)
        if (Array.isArray(arrList) && arrList.length > 0) {
          const maxMs = arrList.reduce((max, a) => {
            const val = typeof a.elapsedMs === 'number' ? a.elapsedMs : 0
            return val > max ? val : max
          }, 0)
          if (maxMs > 0) elapsedBefore = maxMs
        }
      }
    } catch (e) {}
  }

  // 1.2 Resgate via coleção 'results' do Firestore (para o caso do cache local estar vazio)
  if (elapsedBefore === 0) {
    try {
      const resultsSnap = await getDocs(query(collection(db, COLLECTIONS.results), where('raceId', '==', raceId)))
      if (!resultsSnap.empty) {
        resultsSnap.forEach(docSnap => {
          const r = docSnap.data()
          if (typeof r.elapsedMs === 'number' && r.elapsedMs > elapsedBefore) {
            elapsedBefore = r.elapsedMs
          } else if (typeof r.time === 'string') {
            const parts = r.time.split(':')
            if (parts.length >= 2) {
              const h = parts.length === 3 ? parseFloat(parts[0]) : 0
              const m = parts.length === 3 ? parseFloat(parts[1]) : parseFloat(parts[0])
              const s = parts.length === 3 ? parseFloat(parts[2]) : parseFloat(parts[1])
              const ms = Math.round((h * 3600 + m * 60 + s) * 1000)
              if (ms > elapsedBefore) elapsedBefore = ms
            }
          }
        })
      }
    } catch (e) {
      console.warn('Erro ao resgatar tempo das chegadas no Firestore:', e)
    }
  }

  // 2. Descobrir a largada original da corrida (originalStart)
  let originalStart = merged.originalStartTime || merged.startTime
  if (!originalStart && merged.endTime && elapsedBefore > 0) {
    originalStart = new Date(Date.parse(merged.endTime) - elapsedBefore).toISOString()
  } else if (!originalStart && elapsedBefore > 0) {
    originalStart = new Date(now - elapsedBefore).toISOString()
  } else if (!originalStart) {
    originalStart = new Date(now).toISOString()
  }

  let patch

  if (mode === 'reset') {
    // Zera tudo: cronômetro em 00:00:00, aguardando nova largada; corredores apagados
    patch = {
      startTime: null,
      originalStartTime: null,
      endTime: null,
      pauseTime: null,
      elapsedAtPause: 0
    }

  } else if (mode === 'compensate') {
    // "Continuar de onde parou":
    // O cronômetro fica PAUSADO no tempo exato em que a corrida encerrou.
    // startTime ajustado para refletir exatamente o tempo decorrido congelado
    const pausedStartTime = new Date(now - elapsedBefore).toISOString()
    patch = {
      startTime: pausedStartTime,
      originalStartTime: originalStart,
      endTime: null,
      pauseTime: new Date(now).toISOString(),
      elapsedAtPause: elapsedBefore
    }

  } else {
    // mode === 'resume': "Continuar em Tempo Real (Recomendado)"
    // O cronômetro já inicia RODANDO automaticamente, contando a partir da largada original,
    // como se a corrida NUNCA tivesse sido encerrada. Corredores preservados.
    patch = {
      startTime: originalStart,
      originalStartTime: originalStart,
      endTime: null,
      pauseTime: null,
      elapsedAtPause: 0
    }
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.races, raceId), patch)
  } catch (e) {
    console.warn('Erro ao atualizar corrida no Firestore durante reopen:', e)
  }
  return patch
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
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Escuta em tempo real a lista de todas as corridas.
 * @param {(races: Array<import('./races.types.js').Race>) => void} onChange
 * @returns {() => void} função para cancelar a inscrição (unsubscribe)
 */
export function subscribeToAllRaces(onChange) {
  const q = query(collection(db, COLLECTIONS.races), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

/** @param {string} id @returns {Promise<import('./races.types.js').Race | undefined>} */
export async function getRaceById(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.races, id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : undefined
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
    onChange(snap.exists() ? ({ id: snap.id, ...snap.data() }) : undefined)
  })
}



/** @param {string} raceId */
export async function resetRaceToPending(raceId) {
  await updateDoc(doc(db, COLLECTIONS.races, raceId), {
    startTime: null,
    endTime: null,
    elapsedAtPause: 0
  })
}
