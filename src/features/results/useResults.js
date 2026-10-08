// Responsabilidade única: orquestrar estado e fluxo de carregamento dos resultados da corrida.
import { useCallback, useEffect, useState } from 'react'
import { sortByPlacement } from './results.rules.js'
import { getResultsByRace } from './results.repository.js'

/** @param {string} raceId */
export function useResults(raceId) {
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadResults = useCallback(async () => {
    if (!raceId) return
    setLoading(true)
    setError(null)
    try {
      const stored = await getResultsByRace(raceId)
      setPlacements(sortByPlacement(stored))
    } catch (e) {
      setError('Falha ao carregar resultados salvos.')
    } finally {
      setLoading(false)
    }
  }, [raceId])

  useEffect(() => { loadResults() }, [loadResults])

  return { placements, loading, error }
}

