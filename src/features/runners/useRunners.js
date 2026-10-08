// Responsabilidade única: orquestrar criação/listagem em tempo real de corredores e geração de QR codes.
import { useCallback, useEffect, useState } from 'react'
import { addRunner, subscribeToRunnersByRace } from './runners.repository.js'
import { generateRunnerId } from './runner-id.service.js'
import { generateRunnerQRCode } from './qrcode.service.js'
import { composeQRWithLabel } from './qr-label.service.js'

/** @param {string} raceId */
export function useRunners(raceId) {
  const [runners, setRunners] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQrCode, setLastQrCode] = useState(null)

  useEffect(() => {
    if (!raceId) return
    setLoading(true)
    const unsubscribe = subscribeToRunnersByRace(raceId, (list) => {
      setRunners(list)
      setLoading(false)
    })
    return unsubscribe
  }, [raceId])

  const createRunner = useCallback(async (name, number) => {
    setError(null)
    const trimmedName = name.trim()
    const trimmedNumber = number.trim()
    if (!trimmedName) {
      setError('Informe o nome do corredor.')
      return
    }
    if (!trimmedNumber) {
      setError('Informe o número do corredor.')
      return
    }
    if (!raceId) {
      setError('Nenhuma corrida ativa selecionada.')
      return
    }
    const duplicatedNumber = runners.some(r => String(r.number ?? '').trim().toLowerCase() === trimmedNumber.toLowerCase())
    if (duplicatedNumber) {
      setError('Número de corredor já cadastrado nesta corrida.')
      return
    }
    try {
      const sequenceNumber = runners.length + 1
      const runner = { id: generateRunnerId(raceId, sequenceNumber), number: trimmedNumber, name: trimmedName, raceId }
      await addRunner(runner)
      const rawQrDataUrl = await generateRunnerQRCode(runner)
      const qrDataUrl = await composeQRWithLabel(rawQrDataUrl, runner.name)
      setLastQrCode({ runner, qrDataUrl })
    } catch (e) {
      if (e instanceof Error && e.message === 'RUNNER_NUMBER_ALREADY_EXISTS') {
        setError('Número de corredor já cadastrado nesta corrida.')
        return
      }
      setError('Falha ao criar corredor e gerar QR code.')
    }
  }, [raceId, runners])

  return { runners, loading, error, lastQrCode, createRunner }
}


