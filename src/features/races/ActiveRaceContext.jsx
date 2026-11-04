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
        if (race) setActiveRace(race)
        else clearStoredActiveRaceId()
      }
      setLoading(false)
    })()
  }, [])

  // Mantém a corrida ativa sincronizada em tempo real (ex.: horário de largada definido depois).
  useEffect(() => {
    if (!activeRace?.id) return
    const unsubscribe = subscribeToRace(activeRace.id, (race) => {
      if (race) setActiveRace(race)
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
          } catch (err) {}
          return reset
        })
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
