// Responsabilidade única: orquestrar criação/listagem de corridas.
import { useCallback, useEffect, useState } from 'react'
import { addRace, getAllRaces, updateRaceStartTime } from './races.repository.js'
import { generateRaceId } from './race-id.service.js'

export function useRaces() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadRaces = useCallback(async () => {
    setLoading(true)
    try {
      setRaces(await getAllRaces())
    } catch (e) {
      setError('Falha ao carregar corridas cadastradas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRaces() }, [loadRaces])

  const createRace = useCallback(async (name, eventDate) => {
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Informe o nome da corrida.')
      return null
    }
    if (!eventDate) {
      setError('Informe a data da corrida.')
      return null
    }
    try {
      const race = { id: generateRaceId(), name: trimmedName, createdAt: new Date().toISOString(), eventDate, startTime: null }
      await addRace(race)
      await loadRaces()
      return race
    } catch (e) {
      setError('Falha ao criar corrida.')
      return null
    }
  }, [loadRaces])

  const setStartTime = useCallback(async (raceId, startTime) => {
    setError(null)
    try {
      await updateRaceStartTime(raceId, startTime)
      await loadRaces()
    } catch (e) {
      setError('Falha ao salvar horário de largada.')
    }
  }, [loadRaces])

  return { races, loading, error, createRace, setStartTime }
}
