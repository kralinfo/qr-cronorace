// Responsabilidade única: orquestrar criação/listagem/edição/exclusão de corridas.
import { useCallback, useEffect, useState } from 'react'
import { addRace, deleteRace, getAllRaces, updateRaceDetails, updateRaceStartTime, updateRaceEndTime } from './races.repository.js'
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

  const createRace = useCallback(async (name, eventDate, distanceKm) => {
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
      const parsedDistance = distanceKm ? Number(distanceKm) : null
      const race = { id: generateRaceId(), name: trimmedName, createdAt: new Date().toISOString(), eventDate, startTime: null, distanceKm: Number.isFinite(parsedDistance) ? parsedDistance : null }
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

  const finishRace = useCallback(async (raceId, endTime) => {
    setError(null)
    try {
      await updateRaceEndTime(raceId, endTime)
      await loadRaces()
    } catch (e) {
      setError('Falha ao encerrar a corrida.')
    }
  }, [loadRaces])

  const editRace = useCallback(async (raceId, { name, eventDate, distanceKm }) => {
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Informe o nome da corrida.')
      return false
    }
    if (!eventDate) {
      setError('Informe a data da corrida.')
      return false
    }
    try {
      const parsedDistance = distanceKm ? Number(distanceKm) : null
      await updateRaceDetails(raceId, { name: trimmedName, eventDate, distanceKm: Number.isFinite(parsedDistance) ? parsedDistance : null })
      await loadRaces()
      return true
    } catch (e) {
      setError('Falha ao editar corrida.')
      return false
    }
  }, [loadRaces])

  const removeRace = useCallback(async (raceId) => {
    setError(null)
    try {
      await deleteRace(raceId)
      await loadRaces()
    } catch (e) {
      setError('Falha ao excluir corrida.')
    }
  }, [loadRaces])

  return { races, loading, error, createRace, setStartTime, finishRace, editRace, removeRace }
}

