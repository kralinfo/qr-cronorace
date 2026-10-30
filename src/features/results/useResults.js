// Responsabilidade única: orquestrar estado e fluxo em tempo real dos resultados da corrida.
import { useEffect, useState } from 'react'
import { sortByPlacement } from './results.rules.js'
import { subscribeToResultsByRace } from './results.repository.js'

/** 
 * @param {string} raceId 
 * @param {string|null} [startTime]
 */
export function useResults(raceId, startTime) {
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!raceId) return
    setLoading(true)
    setError(null)
    const unsubscribe = subscribeToResultsByRace(raceId, (results) => {
      setPlacements(sortByPlacement(results, startTime))
      setLoading(false)
    })
    return unsubscribe
  }, [raceId, startTime])

  return { placements, loading, error }
}
