import { useCallback, useEffect, useState } from 'react'
import {
  addRunner,
  addRunnersBatch,
  deleteRunner,
  getRunnersByRace,
  normalizeComparable,
  subscribeToAllRunners,
  subscribeToRunnersByRace,
  updateRunner
} from './runners.repository.js'
import { generateRunnerId } from './runner-id.service.js'
import { generateRunnerBarcode } from './barcode.service.js'
import {
  capitalizeName,
  formatRunnerNumber,
  maskCpf,
  normalizeCpf,
  validateCpf
} from './runner-formatter.service.js'
import { getRaceById } from '../races/races.repository.js'

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

  const createRunner = useCallback(async (name, number, cpf, targetRaceId, category) => {
    setError(null)
    const effectiveRaceId = targetRaceId || (raceId !== 'ALL' ? raceId : null)

    const trimmedName = (name || '').trim()
    const trimmedNumber = (number || '').trim()
    const trimmedCpf = (cpf || '').trim()
    const trimmedCategory = (category || '').trim()

    if (!trimmedNumber) {
      setError('Informe o número de peito do corredor.')
      return null
    }
    if (!/^\d+$/.test(trimmedNumber)) {
      setError('O número do corredor deve conter apenas números (dígitos).')
      return null
    }
    if (!trimmedName) {
      setError('Informe o nome do corredor.')
      return null
    }
    if (!effectiveRaceId) {
      setError('Selecione uma corrida específica para realizar o cadastro.')
      return null
    }

    try {
      const raceDoc = await getRaceById(effectiveRaceId)
      if (raceDoc?.endTime) {
        setError('Esta corrida já está encerrada. Para cadastrar novos corredores, reabra a corrida.')
        return null
      }
    } catch (e) {}

    const formattedName = capitalizeName(trimmedName)
    const formattedNumber = formatRunnerNumber(trimmedNumber)
    const normalizedName = normalizeComparable(formattedName)
    const normalizedNumber = normalizeComparable(formattedNumber)

    const currentRaceRunners = raceId === effectiveRaceId
      ? runners
      : runners.filter(r => r.raceId === effectiveRaceId)

    let formattedCpf = ''
    if (trimmedCpf) {
      const cpfValidation = validateCpf(trimmedCpf)
      if (!cpfValidation.valid) {
        setError(cpfValidation.message || 'CPF inválido.')
        return null
      }
      formattedCpf = maskCpf(trimmedCpf)
      const normalizedDigitsCpf = normalizeCpf(trimmedCpf)
      const existingCpf = currentRaceRunners.find(r => r.cpf && normalizeCpf(r.cpf) === normalizedDigitsCpf)
      if (existingCpf) {
        setError(`O CPF ${formattedCpf} já está cadastrado nesta corrida para o corredor "${existingCpf.name}" (Nº ${existingCpf.number || '—'}).`)
        return null
      }
    }

    const existingNumber = currentRaceRunners.find(r => normalizeComparable(r.number) === normalizedNumber)
    if (existingNumber) {
      setError(`O número ${formattedNumber} já está sendo usado pelo corredor "${existingNumber.name}" nesta corrida.`)
      return null
    }

    const existingName = currentRaceRunners.find(r => normalizeComparable(r.name) === normalizedName)
    if (existingName) {
      setError(`O corredor "${existingName.name}" já está cadastrado nesta corrida (Nº ${existingName.number || '—'}). Busque-o na lista para reimprimir o QR code.`)
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
        cpf: formattedCpf,
        name: formattedName,
        category: trimmedCategory,
        raceId: effectiveRaceId
      }

      await addRunner(runner)
      const qrDataUrl = await generateRunnerBarcode(runner)
      const result = { runner, qrDataUrl }
      setLastQrCode(result)
      return result
    } catch (e) {
      if (e instanceof Error && e.message === 'RACE_RUNNING_REGISTRATION_BLOCKED') {
        setError('Não é possível cadastrar: esta corrida está em andamento e novas inscrições foram bloqueadas.')
        return null
      }
      if (e instanceof Error && e.message === 'RACE_FINISHED_REGISTRATION_BLOCKED') {
        setError('Não é possível cadastrar: esta corrida já foi encerrada e não aceita mais inscrições.')
        return null
      }
      if (e instanceof Error && e.message === 'RUNNER_CPF_ALREADY_EXISTS') {
        const ownerName = e.existingRunner?.name ? ` ("${e.existingRunner.name}", Nº ${e.existingRunner.number || '—'})` : ''
        setError(`O CPF ${formattedCpf} já está cadastrado nesta corrida${ownerName}.`)
        return null
      }
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

  const editRunner = useCallback(async (id, { name, number, cpf, category, raceId: targetRaceId }) => {
    setError(null)
    const trimmedName = name != null ? name.trim() : null
    const trimmedNumber = number != null ? number.trim() : null
    const trimmedCpf = cpf != null ? cpf.trim() : null
    const trimmedCategory = category != null ? category.trim() : null

    if (trimmedName !== null && !trimmedName) {
      const msg = 'Informe o nome do corredor.'
      setError(msg)
      throw new Error(msg)
    }

    if (trimmedNumber !== null && trimmedNumber !== '') {
      if (!/^\d+$/.test(trimmedNumber)) {
        const msg = 'O número do corredor deve conter apenas números (dígitos).'
        setError(msg)
        throw new Error(msg)
      }
    }

    let formattedCpf = undefined
    if (trimmedCpf !== null && trimmedCpf !== '') {
      const cpfValidation = validateCpf(trimmedCpf)
      if (!cpfValidation.valid) {
        const msg = cpfValidation.message || 'CPF inválido.'
        setError(msg)
        throw new Error(msg)
      }
      formattedCpf = maskCpf(trimmedCpf)
    } else if (trimmedCpf === '') {
      formattedCpf = ''
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
        cpf: formattedCpf,
        category: trimmedCategory,
        raceId: targetRaceId
      })
      return updated
    } catch (e) {
      let msg = 'Falha ao atualizar dados do corredor.'
      if (e instanceof Error && e.message === 'RUNNER_CPF_ALREADY_EXISTS') {
        const ownerName = e.existingRunner?.name ? ` ("${e.existingRunner.name}", Nº ${e.existingRunner.number || '—'})` : ''
        msg = `O CPF ${formattedCpf || cpf} já está cadastrado nesta corrida${ownerName}.`
      } else if (e instanceof Error && e.message === 'RUNNER_NUMBER_ALREADY_EXISTS') {
        const ownerName = e.existingRunner?.name ? ` ("${e.existingRunner.name}")` : ''
        msg = `Número de corredor ${formattedNumber || number} já cadastrado nesta corrida${ownerName}.`
      } else if (e instanceof Error && e.message === 'RUNNER_NAME_ALREADY_EXISTS') {
        const existingNum = e.existingRunner?.number ? ` (Nº ${e.existingRunner.number})` : ''
        msg = `Já existe um corredor cadastrado com o nome "${formattedName || name}" nesta corrida${existingNum}.`
      } else if (e instanceof Error && e.message) {
        msg = e.message
      }
      setError(msg)
      throw new Error(msg)
    }
  }, [])



  const createRunnersBatch = useCallback(async (runnersList, targetRaceId) => {
    setError(null)
    const effectiveRaceId = targetRaceId || (raceId !== 'ALL' ? raceId : null)
    if (!effectiveRaceId) {
      setError('Selecione uma corrida específica para realizar o cadastro em lote.')
      return { success: false, count: 0 }
    }
    if (!runnersList || runnersList.length === 0) {
      return { success: true, count: 0 }
    }

    try {
      const raceDoc = await getRaceById(effectiveRaceId)
      if (raceDoc?.endTime) {
        setError('Esta corrida já está encerrada. Para cadastrar corredores, reabra a corrida.')
        return { success: false, count: 0, error: new Error('Esta corrida já está encerrada.') }
      }
    } catch (e) {}

    try {
      const currentRaceRunners = raceId === effectiveRaceId
        ? runners
        : runners.filter(r => r.raceId === effectiveRaceId)
      let sequenceNumber = currentRaceRunners.length + 1
      if (raceId !== effectiveRaceId && currentRaceRunners.length === 0) {
        const raceRunners = await getRunnersByRace(effectiveRaceId)
        sequenceNumber = raceRunners.length + 1
      }

      const runnerDocs = runnersList.map((item, idx) => {
        const seq = sequenceNumber + idx
        const id = generateRunnerId(effectiveRaceId, seq)
        return {
          id,
          number: formatRunnerNumber(item.number),
          name: capitalizeName(item.name),
          cpf: item.cpf ? maskCpf(item.cpf) : '',
          category: item.category,
          raceId: effectiveRaceId,
          createdAt: new Date().toISOString()
        }
      })

      await addRunnersBatch(runnerDocs)
      return { success: true, count: runnerDocs.length }
    } catch (err) {
      console.error('Erro ao cadastrar corredores em lote:', err)
      setError(err?.message || 'Erro ao importar corredores.')
      return { success: false, count: 0, error: err }
    }
  }, [raceId, runners])

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
    createRunnersBatch,
    editRunner,
    removeRunner,
    clearError,
    clearLastQrCode
  }
}



