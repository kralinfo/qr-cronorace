// Responsabilidade única: calcular o tempo decorrido (ms) desde um horário de largada, atualizando a cada segundo.
import { useEffect, useState } from 'react'

/**
 * @param {string|null|undefined} startTime - Horário da largada (ISO).
 * @param {string|null|undefined} [endTime] - Horário de encerramento (ISO). Quando definido, o tempo fica congelado.
 * @returns {number|null} tempo decorrido em milissegundos, ou null se não houver largada definida.
 */
export function useElapsedTimer(startTime, endTime) {
  const [elapsedMs, setElapsedMs] = useState(() => computeElapsed(startTime, endTime))

  useEffect(() => {
    setElapsedMs(computeElapsed(startTime, endTime))
    if (!startTime || endTime) return

    const intervalId = setInterval(() => {
      setElapsedMs(computeElapsed(startTime, endTime))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [startTime, endTime])

  return elapsedMs
}

/**
 * @param {string|null|undefined} startTime
 * @param {string|null|undefined} [endTime]
 * @returns {number|null}
 */
function computeElapsed(startTime, endTime) {
  if (!startTime) return null
  const startMs = Date.parse(startTime)
  if (!Number.isFinite(startMs)) return null
  if (endTime) {
    const endMs = Date.parse(endTime)
    if (Number.isFinite(endMs)) return Math.max(0, endMs - startMs)
  }
  return Math.max(0, Date.now() - startMs)
}
