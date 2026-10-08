// Responsabilidade única: orquestrar câmera, decodificação de QR e registro da chegada.
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { addResult } from '../results/results.repository.js'
import { getRunnerById } from '../runners/runners.repository.js'
import { decodeRunnerPayload } from '../runners/qrcode.service.js'
import { buildArrivalResult, belongsToActiveRace } from './scanner.rules.js'

/** @typedef {'idle'|'scanning'|'recorded'|'invalid-race'|'error'} ScanStatus */

/** Tempo mínimo entre leituras do mesmo QR, para evitar registros repetidos em sequência. */
const SAME_CODE_COOLDOWN_MS = 4000
/** Tempo que o resultado fica em destaque na tela antes de voltar a aguardar leitura. */
const RESULT_DISPLAY_MS = 2500

/** Restrições de câmera priorizando resolução alta e câmera traseira, para ler QR a maior distância. */
const CAMERA_CONSTRAINTS = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: 'continuous' }]
}

/** @param {string} raceId */
export function useScanner(raceId) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const activeRef = useRef(true)
  const lastReadRef = useRef({ text: null, at: 0 })
  const resultTimeoutRef = useRef(null)
  const [status, setStatus] = useState(/** @type {ScanStatus} */('idle'))
  const [message, setMessage] = useState('Aponte a câmera para o QR code')
  const [lastArrival, setLastArrival] = useState(null)

  const stopScanning = useCallback(() => {
    activeRef.current = false
    if (controlsRef.current) {
      try { controlsRef.current.stop() } catch (e) { /* noop */ }
      controlsRef.current = null
    }
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
    setStatus('idle')
  }, [])

  const startScanning = useCallback(async () => {
    activeRef.current = true
    setStatus('scanning')
    setMessage('Aponte a câmera para o QR code')

    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 300
    })

    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      const backCamera = devices.find(d => /back|traseira|rear|environment/i.test(d.label))
      const deviceId = backCamera?.deviceId

      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId }, ...CAMERA_CONSTRAINTS } : CAMERA_CONSTRAINTS
      }

      const controls = await reader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result) => {
          if (result && activeRef.current) {
            handleDecodedText(result.getText())
          }
        }
      )
      controlsRef.current = controls
    } catch (e) {
      console.error(e)
      setStatus('error')
      setMessage('Não foi possível acessar a câmera.')
    }
  }, [])

  useEffect(() => {
    startScanning()
    return () => stopScanning()
  }, [startScanning, stopScanning])


  const handleDecodedText = useCallback(async (text) => {
    const now = Date.now()
    if (lastReadRef.current.text === text && (now - lastReadRef.current.at) < SAME_CODE_COOLDOWN_MS) {
      return
    }
    lastReadRef.current = { text, at: now }

    const runnerData = decodeRunnerPayload(text)
    const runner = await getRunnerById(runnerData.id)

    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)

    if (!belongsToActiveRace(runnerData, runner, raceId)) {
      setStatus('invalid-race')
      setMessage('Este corredor está cadastrado em outra corrida. Verifique se ele pertence a esta corrida.')
      resultTimeoutRef.current = setTimeout(() => {
        setStatus('scanning')
        setMessage('Aponte a câmera para o QR code')
      }, RESULT_DISPLAY_MS)
      return
    }

    const readAt = new Date()
    const runnerName = runner?.name ?? runnerData.name ?? null
    const arrivalResult = { ...buildArrivalResult(runnerData, raceId, readAt), runnerName }
    await addResult(arrivalResult)

    setStatus('recorded')
    setLastArrival({ ...arrivalResult, name: runnerName })
    setMessage('Chegada registrada!')
    resultTimeoutRef.current = setTimeout(() => {
      setStatus('scanning')
      setMessage('Aponte a câmera para o QR code')
    }, RESULT_DISPLAY_MS)
  }, [raceId])

  return { videoRef, status, message, lastArrival }
}

