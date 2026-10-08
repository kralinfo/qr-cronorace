// Responsabilidade única: orquestrar câmera, decodificação de QR e registro da chegada.
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { addResult } from '../results/results.repository.js'
import { getRunnerById } from '../runners/runners.repository.js'
import { decodeRunnerPayload } from '../runners/qrcode.service.js'
import { buildArrivalResult, belongsToActiveRace } from './scanner.rules.js'

/** @typedef {'idle'|'scanning'|'recorded'|'invalid-race'|'error'} ScanStatus */

/** @param {string} raceId */
export function useScanner(raceId) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState(/** @type {ScanStatus} */('idle'))
  const [message, setMessage] = useState('Aponte a câmera para o QR code')
  const [lastArrival, setLastArrival] = useState(null)

  useEffect(() => () => stopScanning(), [])

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current = null } catch (e) { /* noop */ }
    }
    const stream = videoRef.current?.srcObject
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setStatus('idle')
  }, [])

  const startScanning = useCallback(async () => {
    setStatus('scanning')
    setMessage('Iniciando câmera...')
    setLastArrival(null)

    const reader = new BrowserQRCodeReader()
    readerRef.current = reader

    try {
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result && readerRef.current) {
            handleDecodedText(result.getText())
            controls.stop()
            readerRef.current = null
          }
        }
      )
      setMessage('Pronto — aguardando leitura...')
    } catch (e) {
      console.error(e)
      setStatus('error')
      setMessage('Não foi possível acessar a câmera.')
    }
  }, [])

  const handleDecodedText = useCallback(async (text) => {
    const runnerData = decodeRunnerPayload(text)
    const runner = await getRunnerById(runnerData.id)

    if (!belongsToActiveRace(runnerData, runner, raceId)) {
      setStatus('invalid-race')
      setMessage(`Este QR code não pertence a esta corrida (corredor: ${runner?.name ?? runnerData.name ?? runnerData.id}).`)
      return
    }

    const readAt = new Date()
    const runnerName = runner?.name ?? runnerData.name ?? null
    const arrivalResult = { ...buildArrivalResult(runnerData, raceId, readAt), runnerName }
    await addResult(arrivalResult)

    setStatus('recorded')
    setLastArrival({ ...arrivalResult, name: runnerName })
    setMessage('Chegada registrada!')
  }, [raceId])

  const reset = useCallback(() => {
    setStatus('idle')
    setLastArrival(null)
    setMessage('Aponte a câmera para o QR code')
  }, [])

  return { videoRef, status, message, lastArrival, startScanning, stopScanning, reset }
}
