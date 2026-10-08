// UI only: cronômetro ao vivo exibindo o tempo decorrido desde a largada da corrida.
import React from 'react'
import { useElapsedTimer } from './useElapsedTimer.js'
import { formatDuration } from '../results/duration.formatter.js'

/** @param {{ startTime: string|null|undefined, className?: string }} props */
export default function RaceChronometer({ startTime, className }) {
  const elapsedMs = useElapsedTimer(startTime)

  if (elapsedMs == null) return null

  return (
    <div className={`race-chronometer ${className ?? ''}`}>
      <span className="race-chronometer-value">{formatDuration(elapsedMs)}</span>
    </div>
  )
}
