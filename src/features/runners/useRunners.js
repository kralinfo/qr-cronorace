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

  const createRunner = useCallback(async (name) => {
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Informe o nome do corredor.')
      return
    }
    if (!raceId) {
      setError('Nenhuma corrida ativa selecionada.')
      return
    }
    try {
      const sequenceNumber = runners.length + 1
      const runner = { id: generateRunnerId(raceId, sequenceNumber), name: trimmedName, raceId }
      await addRunner(runner)
      const rawQrDataUrl = await generateRunnerQRCode(runner)
      const qrDataUrl = await composeQRWithLabel(rawQrDataUrl, runner.name)
      setLastQrCode({ runner, qrDataUrl })
    } catch (e) {
      setError('Falha ao criar corredor e gerar QR code.')
    }
  }, [raceId, runners])

  return { runners, loading, error, lastQrCode, createRunner }
}


