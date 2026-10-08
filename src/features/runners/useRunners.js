// Responsabilidade única: orquestrar criação/listagem de corredores e geração de QR codes.
import { useCallback, useEffect, useState } from 'react'
import { addRunner, getRunnersByRace } from './runners.repository.js'
import { generateRunnerId } from './runner-id.service.js'
import { generateRunnerQRCode } from './qrcode.service.js'
import { composeQRWithLabel } from './qr-label.service.js'

/** @param {string} raceId */
export function useRunners(raceId) {
  const [runners, setRunners] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQrCode, setLastQrCode] = useState(null)

  const loadRunners = useCallback(async () => {
    if (!raceId) return
    setLoading(true)
    try {
      setRunners(await getRunnersByRace(raceId))
    } catch (e) {
      setError('Falha ao carregar corredores cadastrados.')
    } finally {
      setLoading(false)
    }
  }, [raceId])

  useEffect(() => { loadRunners() }, [loadRunners])

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
      await loadRunners()
    } catch (e) {
      setError('Falha ao criar corredor e gerar QR code.')
    }
  }, [raceId, runners, loadRunners])

  return { runners, loading, error, lastQrCode, createRunner }
}

