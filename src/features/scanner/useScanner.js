import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { addResult } from '../results/results.repository.js'
import { getRaceById } from '../races/races.repository.js'
import { getRunnerById } from '../runners/runners.repository.js'
import { decodeRunnerPayload } from '../runners/qrcode.service.js'
import { buildArrivalResult, validateArrivalScan } from './scanner.rules.js'

/** @typedef {'idle'|'scanning'|'recorded'|'invalid-race'|'race-not-started'|'race-finished'|'error'} ScanStatus */

/** Tempo mínimo entre leituras do mesmo QR, para evitar registros repetidos em sequência. */
const SAME_CODE_COOLDOWN_MS = 4000
/** Tempo que o resultado fica em destaque na tela antes de voltar a aguardar leitura. */
const RESULT_DISPLAY_MS = 2500

/** Vibra o dispositivo brevemente quando suportado. */
function vibrateSuccess() {
  try {
    if (navigator.vibrate) navigator.vibrate(120)
  } catch (_) { /* noop */ }
}

/** Vibra em padrão de erro (duas vibrações curtas) quando suportado. */
function vibrateError() {
  try {
    if (navigator.vibrate) navigator.vibrate([80, 60, 80])
  } catch (_) { /* noop */ }
}

/** Restrições de câmera priorizando resolução alta e câmera traseira, para ler QR a maior distância. */
const CAMERA_CONSTRAINTS = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: 'continuous' }]
}

/**
 * @param {string|import('../races/races.types.js').Race|null|undefined} activeRaceOrId
 */
export function useScanner(activeRaceOrId) {
  const activeRace = typeof activeRaceOrId === 'object' && activeRaceOrId !== null ? activeRaceOrId : null
  const raceId = activeRace?.id ?? (typeof activeRaceOrId === 'string' ? activeRaceOrId : null)

  // A câmera só processa leituras quando a corrida está em andamento
  const isRaceActive = Boolean(activeRace?.startTime && !activeRace?.endTime)

  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const activeRef = useRef(true)
  const lastReadRef = useRef({ text: null, at: 0 })
  const resultTimeoutRef = useRef(null)
  const activeRaceRef = useRef(activeRace)

  useEffect(() => {
    activeRaceRef.current = activeRace
  }, [activeRace])

  const [status, setStatus] = useState(/** @type {ScanStatus} */('idle'))
  const [message, setMessage] = useState(
    !activeRace?.startTime
      ? 'Corrida não iniciada - leituras de chegada bloqueadas'
      : activeRace?.endTime
        ? 'Corrida encerrada - leituras de chegada bloqueadas'
        : 'Aponte a câmera para o QR code'
  )
  const [lastArrival, setLastArrival] = useState(null)
  const [rejectedScan, setRejectedScan] = useState(null)

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

    // Busca o corredor e a versão mais recente da corrida no banco de dados
    const [runner, currentRaceDoc] = await Promise.all([
      getRunnerById(runnerData.id),
      raceId ? getRaceById(raceId) : Promise.resolve(undefined)
    ])

    const currentRace = currentRaceDoc ?? activeRaceRef.current

    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)

    // Valida se a corrida não está encerrada e se o corredor pertence à corrida ativa
    const validation = validateArrivalScan({
      race: currentRace,
      runnerData,
      runnerRecord: runner,
      activeRaceId: raceId
    })

    if (!validation.valid) {
      setStatus(validation.errorType ?? 'error')
      setMessage(validation.message)
      setRejectedScan({
        runnerName: runner?.name ?? runnerData.name ?? null,
        runnerNumber: runner?.number ?? runnerData.number ?? null,
        barcode: runnerData.id,
        reason: validation.message,
        errorType: validation.errorType
      })

      // Mantém a crítica visível na tela
      const timeoutMs = (validation.errorType === 'race-finished' || validation.errorType === 'race-not-started') ? 4000 : RESULT_DISPLAY_MS
      resultTimeoutRef.current = setTimeout(() => {
        setStatus('scanning')
        setMessage(
          !currentRace?.startTime
            ? 'Corrida não iniciada - leituras de chegada bloqueadas'
            : currentRace?.endTime
              ? 'Corrida encerrada - leituras de chegada bloqueadas'
              : 'Aponte a câmera para o QR code'
        )
      }, timeoutMs)
      vibrateError()
      return
    }

    setRejectedScan(null)
    const readAt = new Date()
    const runnerName = runner?.name ?? runnerData.name ?? null
    const runnerNumber = runner?.number ?? runnerData.number ?? null
    const arrivalResult = { ...buildArrivalResult(runnerData, raceId, readAt), runnerName, runnerNumber }
    await addResult(arrivalResult)

    vibrateSuccess()
    setStatus('recorded')
    setLastArrival({ ...arrivalResult, name: runnerName, number: runnerNumber })
    setMessage('Chegada registrada!')
    resultTimeoutRef.current = setTimeout(() => {
      setStatus('scanning')
      setMessage('Aponte a câmera para o QR code')
    }, RESULT_DISPLAY_MS)
  }, [raceId])

  return { videoRef, status, message, lastArrival, rejectedScan, isRaceActive }
}

