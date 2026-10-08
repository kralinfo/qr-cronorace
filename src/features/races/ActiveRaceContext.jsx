// Responsabilidade única: prover e gerenciar a corrida ativa em toda a aplicação.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getRaceById } from './races.repository.js'
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
