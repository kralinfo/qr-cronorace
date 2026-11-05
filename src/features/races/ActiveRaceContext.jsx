// Responsabilidade única: prover e gerenciar a corrida ativa em toda a aplicação.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getRaceById, subscribeToRace } from './races.repository.js'
import { getStoredActiveRaceId, setStoredActiveRaceId, clearStoredActiveRaceId } from './active-race.storage.js'

const ActiveRaceContext = createContext(null)

export function ActiveRaceProvider({ children }) {
  const [activeRace, setActiveRace] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const storedId = getStoredActiveRaceId()
      if (storedId) {
        const race = await getRaceById(storedId)
        if (race) {
          // Enriquece com endTime do localStorage caso Firestore ainda não tenha sincronizado
          const endedKey = `pwa-qr-timing:race-ended-at:${race.id}`
          const storedEnd = (() => { try { return localStorage.getItem(endedKey) } catch { return null } })()
          if (!race.endTime && storedEnd) race.endTime = storedEnd
          setActiveRace(race)
        }
        else clearStoredActiveRaceId()
      }
      setLoading(false)
    })()
  }, [])

  // Mantém a corrida ativa sincronizada em tempo real (ex.: horário de largada definido depois).
  useEffect(() => {
    if (!activeRace?.id) return
    const unsubscribe = subscribeToRace(activeRace.id, (race) => {
      if (race) {
        const endedKey = `pwa-qr-timing:race-ended-at:${race.id}`
        const storedEnd = (() => { try { return localStorage.getItem(endedKey) } catch { return null } })()
        // Se a corrida foi encerrada (no Firestore ou marcador local), ela PERMANECE encerrada até reset explícito!
        if (storedEnd) {
          race.endTime = race.endTime || storedEnd
        }
        setActiveRace(race)
      }
    })
    return unsubscribe
  }, [activeRace?.id])


  // Ouve eventos de reset vindos do cronômetro ou BroadcastChannel para zerar imediatamente
  useEffect(() => {
    const handleResetEvent = (e) => {
      const data = e?.data
      if (data?.type === 'RACE_RESET') {
        setActiveRace(prev => {
          if (!prev) return null
          const reset = { ...prev, startTime: null, endTime: null, elapsedAtPause: 0 }
          try {
            localStorage.setItem('pwa-qr-timing:active-race', JSON.stringify(reset))
            if (prev.id) {
              localStorage.removeItem(`pwa-qr-timing:race-ended-at:${prev.id}`)
              localStorage.removeItem(`pwa-qr-timing:race-elapsed-ms:${prev.id}`)
            }
          } catch (err) {}
          return reset
        })
      } else if (data?.type === 'RACE_FINISHED') {
        const finishedId = data.raceId || activeRace?.id
        const endTime = data.endTime || new Date().toISOString()
        if (finishedId) {
          try {
            localStorage.setItem(`pwa-qr-timing:race-ended-at:${finishedId}`, endTime)
            if (typeof data.elapsedAtPause === 'number') {
              localStorage.setItem(`pwa-qr-timing:race-elapsed-ms:${finishedId}`, String(data.elapsedAtPause))
            }
          } catch (err) {}
        }
        // Atualiza endTime e dados de cronometragem imediatamente sem esperar Firestore
        setActiveRace(prev => {
          if (!prev) return null
          const updated = {
            ...prev,
            endTime,
            startTime: data.startTime || prev.startTime,
            originalStartTime: data.originalStartTime || prev.originalStartTime,
            elapsedAtPause: typeof data.elapsedAtPause === 'number' ? data.elapsedAtPause : prev.elapsedAtPause
          }
          try { localStorage.setItem('pwa-qr-timing:active-race', JSON.stringify(updated)) } catch (err) {}
          return updated
        })
      } else if (data?.type === 'RACE_STARTED') {
        setActiveRace(prev => {
          if (!prev) return null
          const updated = {
            ...prev,
            startTime: data.startTime || prev.startTime,
            originalStartTime: data.originalStartTime || prev.originalStartTime || data.startTime,
            endTime: null,
            pauseTime: null,
            elapsedAtPause: null
          }
          try { localStorage.setItem('pwa-qr-timing:active-race', JSON.stringify(updated)) } catch (err) {}
          return updated
        })
      } else if (data?.type === 'RACE_REOPENED') {
        if (data.race) {
          setActiveRace(data.race)
          try { localStorage.setItem('pwa-qr-timing:active-race', JSON.stringify(data.race)) } catch (err) {}
        }
      }
    }

    window.addEventListener('message', handleResetEvent)
    let bc = null
    try {
      bc = new BroadcastChannel('qr-cronorace-channel')
      bc.onmessage = handleResetEvent
    } catch (err) {}

    return () => {
      window.removeEventListener('message', handleResetEvent)
      if (bc) bc.close()
    }
  }, [])

  const selectRace = useCallback((race) => {
    setStoredActiveRaceId(race.id)
    setActiveRace(race)
    try {
      localStorage.setItem('pwa-qr-timing:active-race', JSON.stringify(race))
    } catch (e) {}
  }, [])

  const clearActiveRace = useCallback(() => {
    clearStoredActiveRaceId()
    setActiveRace(null)
  }, [])

  return (
    <ActiveRaceContext.Provider value={{ activeRace, loading, selectRace, clearActiveRace }}>
      {children}
    </ActiveRaceContext.Provider>
  )
}

/** @returns {{ activeRace: import('./races.types.js').Race|null, loading: boolean, selectRace: Function, clearActiveRace: Function }} */
export function useActiveRace() {
  const context = useContext(ActiveRaceContext)
  if (!context) throw new Error('useActiveRace deve ser usado dentro de ActiveRaceProvider')
  return context
}
