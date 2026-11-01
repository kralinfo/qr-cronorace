import { generateRunnerBarcode } from '../runners/barcode.service.js'
import { printRunnerToBluetooth } from '../runners/bluetooth-printer.service.js'

const listeners = new Set()

const idleState = {
  status: 'idle', // idle | running | paused | completed | cancelled | error
  catKey: null,
  raceName: '',
  total: 0,
  current: 0,
  currentRunner: null,
  errorMessage: null,
  startedAt: null,
  updatedAt: null
}

let batchState = { ...idleState }
let queue = []
let processing = false
let pauseRequested = false
let cancelRequested = false
let pauseResolvers = []

function notifyState() {
  for (const listener of listeners) {
    try {
      listener({ ...batchState })
    } catch (e) {
      console.error(e)
    }
  }
}

function setState(patch) {
  batchState = {
    ...batchState,
    ...patch,
    updatedAt: Date.now()
  }
  notifyState()
}

async function waitIfPaused() {
  while (pauseRequested && !cancelRequested) {
    await new Promise(resolve => {
      pauseResolvers.push(resolve)
    })
  }
}

function flushPauseResolvers() {
  const resolvers = pauseResolvers
  pauseResolvers = []
  for (const resolve of resolvers) {
    try {
      resolve()
    } catch (e) {
      console.error(e)
    }
  }
}

function finishAsCancelled() {
  setState({
    status: 'cancelled',
    currentRunner: null,
    errorMessage: null
  })
}

function finishAsCompleted() {
  setState({
    status: 'completed',
    currentRunner: null,
    errorMessage: null,
    current: batchState.total
  })
}

function finishAsError(message) {
  setState({
    status: 'error',
    currentRunner: null,
    errorMessage: message || 'Erro ao imprimir lote.'
  })
}

function resetQueueFlags() {
  processing = false
  pauseRequested = false
  cancelRequested = false
  queue = []
  flushPauseResolvers()
}

export function getBatchPrintState() {
  return { ...batchState }
}

export function subscribeBatchPrintState(listener) {
  listeners.add(listener)
  listener({ ...batchState })
  return () => listeners.delete(listener)
}

export function isBatchPrintActive() {
  return batchState.status === 'running' || batchState.status === 'paused'
}

export function clearBatchPrintState() {
  if (processing) return false
  batchState = { ...idleState }
  notifyState()
  return true
}

export function pauseBatchPrint() {
  if (!processing || batchState.status !== 'running') return false
  pauseRequested = true
  setState({ status: 'paused' })
  return true
}

export function resumeBatchPrint() {
  if (!processing || batchState.status !== 'paused') return false
  pauseRequested = false
  setState({ status: 'running' })
  flushPauseResolvers()
  return true
}

export function cancelBatchPrint() {
  if (!processing) return false
  cancelRequested = true
  pauseRequested = false
  flushPauseResolvers()
  return true
}

export async function startBluetoothBatchPrint({ runners, raceName, catKey }) {
  if (processing || !runners?.length) return false

  queue = [...runners]
  processing = true
  pauseRequested = false
  cancelRequested = false

  setState({
    status: 'running',
    catKey: catKey || null,
    raceName: raceName || '',
    total: queue.length,
    current: 0,
    currentRunner: null,
    errorMessage: null,
    startedAt: Date.now()
  })

  try {
    for (let index = 0; index < queue.length; index += 1) {
      if (cancelRequested) {
        finishAsCancelled()
        resetQueueFlags()
        return true
      }

      await waitIfPaused()

      if (cancelRequested) {
        finishAsCancelled()
        resetQueueFlags()
        return true
      }

      const runner = queue[index]
      setState({ currentRunner: runner, current: index })

      const dataUrl = await generateRunnerBarcode(runner)

      await waitIfPaused()
      if (cancelRequested) {
        finishAsCancelled()
        resetQueueFlags()
        return true
      }

      await printRunnerToBluetooth(dataUrl, runner, raceName)
      setState({ current: index + 1 })
    }

    finishAsCompleted()
    resetQueueFlags()
    return true
  } catch (err) {
    if (cancelRequested || err?.message === 'BATCH_CANCELLED') {
      finishAsCancelled()
      resetQueueFlags()
      return true
    }

    const message = err?.name === 'NotFoundError' || err?.message?.includes('User cancelled')
      ? 'Impressão cancelada pelo operador.'
      : (err?.message || 'Falha ao imprimir lote na impressora Bluetooth.')

    finishAsError(message)
    resetQueueFlags()
    return false
  }
}
