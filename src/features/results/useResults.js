// Responsabilidade única: orquestrar estado e fluxo em tempo real dos resultados da corrida.
import { useEffect, useState } from 'react'
import { sortByPlacement } from './results.rules.js'
import { subscribeToResultsByRace } from './results.repository.js'

/** @param {string} raceId */
export function useResults(raceId) {
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!raceId) return
    setLoading(true)
    setError(null)
    const unsubscribe = subscribeToResultsByRace(raceId, (results) => {
      setPlacements(sortByPlacement(results))
      setLoading(false)
    })
    return unsubscribe
  }, [raceId])

  return { placements, loading, error }
}


