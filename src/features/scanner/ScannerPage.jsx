// UI only: leitura de QR code via câmera e registro da chegada com data/hora.
import React, { useState } from 'react'
import { useScanner } from './useScanner.js'
import { formatDateTimeBR } from '../results/date.formatter.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'
import { useRunners } from '../runners/useRunners.js'
import { addResult } from '../results/results.repository.js'
import ManualArrivalForm from './ManualArrivalForm.jsx'

export default function ScannerPage() {
  const { activeRace } = useActiveRace()
  const { videoRef, status, message, lastArrival } = useScanner(activeRace?.id)
  const { runners } = useRunners(activeRace?.id)
  const [showManual, setShowManual] = useState(false)
  const [manualConfirmation, setManualConfirmation] = useState(null)

  const handleManualConfirm = async (runner) => {
    const readAt = new Date()
    const result = {
      barcode: runner.id,
      runnerNumber: runner.number ?? null,
      dateTime: readAt.toISOString(),
      timestamp: String(readAt.getTime()),
      raceId: activeRace.id,
      runnerName: runner.name
    }
    await addResult(result)
    setManualConfirmation(result)
    setShowManual(false)
  }

  return (
    <div className="scanner-page">
      <div className="video-wrap">
        <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%' }} />
        <div className="reticle" />
      </div>

      <div className="controls">
        <p>{message}</p>
        <button type="button" className="secondary-btn manual-arrival-btn" onClick={() => setShowManual(true)}>
          ✍️ Registrar chegada manualmente
        </button>
      </div>

      {showManual && (
        <div className="share-panel">
          <ManualArrivalForm
            runners={runners}
            onConfirm={handleManualConfirm}
            onCancel={() => setShowManual(false)}
          />
        </div>
      )}

      {manualConfirmation && (
        <section className="scan-result found">
          <h3>Chegada registrada manualmente</h3>
          <p><strong>Corredor:</strong> {manualConfirmation.runnerName}</p>
          {manualConfirmation.runnerNumber && <p><strong>Número:</strong> {manualConfirmation.runnerNumber}</p>}
          <p><strong>Id:</strong> {manualConfirmation.barcode}</p>
          <p><strong>Data/Hora:</strong> {formatDateTimeBR(manualConfirmation.dateTime)}</p>
        </section>
      )}

      {status === 'recorded' && lastArrival && (
        <section className="scan-result found">
          <h3>Chegada registrada</h3>
          <p><strong>Corredor:</strong> {lastArrival.name ?? '(não cadastrado)'}</p>
          <p><strong>Id:</strong> {lastArrival.barcode}</p>
          <p><strong>Data/Hora:</strong> {formatDateTimeBR(lastArrival.dateTime)}</p>
        </section>
      )}

      {status === 'invalid-race' && (
        <section className="scan-result not-found">
          <h3>Corredor não encontrado nesta corrida</h3>
          <p>{message}</p>
        </section>
      )}

      {status === 'error' && (
        <section className="scan-result error">
          <p>{message}</p>
        </section>
      )}
    </div>
  )
}


