// Responsabilidade única: calcular o tempo decorrido (ms) desde um horário de largada, atualizando a cada segundo.
import { useEffect, useState } from 'react'

/**
 * @param {string|null|undefined} startTime - Horário da largada (ISO).
 * @returns {number|null} tempo decorrido em milissegundos, ou null se não houver largada definida.
 */
export function useElapsedTimer(startTime) {
  const [elapsedMs, setElapsedMs] = useState(() => computeElapsed(startTime))

  useEffect(() => {
    setElapsedMs(computeElapsed(startTime))
    if (!startTime) return

    const intervalId = setInterval(() => {
      setElapsedMs(computeElapsed(startTime))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [startTime])

  return elapsedMs
}

/** @param {string|null|undefined} startTime @returns {number|null} */
function computeElapsed(startTime) {
  if (!startTime) return null
  const startMs = Date.parse(startTime)
  if (!Number.isFinite(startMs)) return null
  return Math.max(0, Date.now() - startMs)
}
