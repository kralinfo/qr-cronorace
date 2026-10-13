import { useCallback, useEffect, useState } from 'react'
import {
  addRunner,
  deleteRunner,
  getRunnersByRace,
  normalizeComparable,
  subscribeToAllRunners,
  subscribeToRunnersByRace,
  updateRunner
} from './runners.repository.js'
import { generateRunnerId } from './runner-id.service.js'
import { generateRunnerQRCode } from './qrcode.service.js'
import { composeQRWithLabel } from './qr-label.service.js'
import { capitalizeName, formatRunnerNumber } from './runner-formatter.service.js'

/**
 * @param {string|'ALL'|undefined|null} raceId - ID da corrida ou 'ALL' para todas
 */
export function useRunners(raceId) {
  const [runners, setRunners] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQrCode, setLastQrCode] = useState(null)

  useEffect(() => {
    if (!raceId) {
      setRunners([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    if (raceId === 'ALL') {
      const unsubscribe = subscribeToAllRunners((list) => {
        setRunners(list)
        setLoading(false)
      })
      return unsubscribe
    }

    const unsubscribe = subscribeToRunnersByRace(raceId, (list) => {
      setRunners(list)
      setLoading(false)
    })
    return unsubscribe
  }, [raceId])

  const clearError = useCallback(() => setError(null), [])
  const clearLastQrCode = useCallback(() => setLastQrCode(null), [])

  const createRunner = useCallback(async (name, number, targetRaceId) => {
    setError(null)
    const effectiveRaceId = targetRaceId || (raceId !== 'ALL' ? raceId : null)

    const trimmedName = name.trim()
    const trimmedNumber = number.trim()

    if (!trimmedName) {
      setError('Informe o nome do corredor.')
      return null
    }
    if (!trimmedNumber) {
      setError('Informe o número do corredor.')
      return null
    }
    if (!/^\d+$/.test(trimmedNumber)) {
      setError('O número do corredor deve conter apenas números (dígitos).')
      return null
    }
    if (!effectiveRaceId) {
      setError('Selecione uma corrida específica para realizar o cadastro.')
      return null
    }

    const formattedName = capitalizeName(trimmedName)
    const formattedNumber = formatRunnerNumber(trimmedNumber)

    const currentRaceRunners = raceId === effectiveRaceId
      ? runners
      : runners.filter(r => r.raceId === effectiveRaceId)

    const normalizedName = normalizeComparable(formattedName)
    const normalizedNumber = normalizeComparable(formattedNumber)

    const existingName = currentRaceRunners.find(r => normalizeComparable(r.name) === normalizedName)
    if (existingName) {
      setError(`O corredor "${existingName.name}" já está cadastrado nesta corrida (Nº ${existingName.number || '—'}). Busque-o na lista para reimprimir o QR code.`)
      return null
    }

    const existingNumber = currentRaceRunners.find(r => normalizeComparable(r.number) === normalizedNumber)
    if (existingNumber) {
      setError(`O número ${formattedNumber} já está sendo usado pelo corredor "${existingNumber.name}" nesta corrida.`)
      return null
    }

    try {
      let sequenceNumber = currentRaceRunners.length + 1
      if (raceId !== effectiveRaceId && currentRaceRunners.length === 0) {
        const raceRunners = await getRunnersByRace(effectiveRaceId)
        sequenceNumber = raceRunners.length + 1
      }

      const runner = {
        id: generateRunnerId(effectiveRaceId, sequenceNumber),
        number: formattedNumber,
        name: formattedName,
        raceId: effectiveRaceId
      }

      await addRunner(runner)
      const rawQrDataUrl = await generateRunnerQRCode(runner)
      const qrDataUrl = await composeQRWithLabel(rawQrDataUrl, runner.name)
      const result = { runner, qrDataUrl }
      setLastQrCode(result)
      return result
    } catch (e) {
      if (e instanceof Error && e.message === 'RUNNER_NUMBER_ALREADY_EXISTS') {
        const ownerName = e.existingRunner?.name ? ` ("${e.existingRunner.name}")` : ''
        setError(`Número de corredor ${formattedNumber} já cadastrado nesta corrida${ownerName}.`)
        return null
      }
      if (e instanceof Error && e.message === 'RUNNER_NAME_ALREADY_EXISTS') {
        const existingNum = e.existingRunner?.number ? ` (Nº ${e.existingRunner.number})` : ''
        setError(`Já existe um corredor cadastrado com o nome "${formattedName}" nesta corrida${existingNum}. Busque-o para reimprimir o QR code.`)
        return null
      }
      setError('Falha ao criar corredor e gerar QR code.')
      return null
    }
  }, [raceId, runners])

  const editRunner = useCallback(async (id, { name, number, raceId: targetRaceId }) => {
    setError(null)
    const trimmedName = name != null ? name.trim() : null
    const trimmedNumber = number != null ? number.trim() : null

    if (trimmedName !== null && !trimmedName) {
      setError('Informe o nome do corredor.')
      return null
    }

    if (trimmedNumber !== null && trimmedNumber !== '') {
      if (!/^\d+$/.test(trimmedNumber)) {
        setError('O número do corredor deve conter apenas números (dígitos).')
        return null
      }
    }

    const formattedName = trimmedName != null ? capitalizeName(trimmedName) : undefined
    const formattedNumber = trimmedNumber != null && trimmedNumber !== ''
      ? formatRunnerNumber(trimmedNumber)
      : trimmedNumber === ''
        ? ''
        : undefined

    try {
      const updated = await updateRunner(id, {
        name: formattedName,
        number: formattedNumber,
        raceId: targetRaceId
      })
      return updated
    } catch (e) {
      if (e instanceof Error && e.message === 'RUNNER_NUMBER_ALREADY_EXISTS') {
        const ownerName = e.existingRunner?.name ? ` ("${e.existingRunner.name}")` : ''
        setError(`Número de corredor ${formattedNumber} já cadastrado nesta corrida${ownerName}.`)
        return null
      }
      if (e instanceof Error && e.message === 'RUNNER_NAME_ALREADY_EXISTS') {
        const existingNum = e.existingRunner?.number ? ` (Nº ${e.existingRunner.number})` : ''
        setError(`Já existe um corredor cadastrado com o nome "${formattedName}" nesta corrida${existingNum}.`)
        return null
      }
      setError('Falha ao atualizar dados do corredor.')
      return null
    }
  }, [])

  const removeRunner = useCallback(async (id) => {
    setError(null)
    try {
      await deleteRunner(id)
      return true
    } catch (e) {
      console.error(e)
      setError('Falha ao excluir corredor.')
      return false
    }
  }, [])

  return {
    runners,
    loading,
    error,
    lastQrCode,
    createRunner,
    editRunner,
    removeRunner,
    clearError,
    clearLastQrCode
  }
}



