// UI only: leitura de QR code via câmera e registro da chegada com data/hora.
import React from 'react'
import { useScanner } from './useScanner.js'
import { formatDateTimeBR } from '../results/date.formatter.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'

export default function ScannerPage() {
  const { activeRace } = useActiveRace()
  const { videoRef, status, message, lastArrival } = useScanner(activeRace?.id)

  return (
    <div className="scanner-page">
      <div className="video-wrap">
        <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%' }} />
        <div className="reticle" />
      </div>

      <div className="controls">
        <p>{message}</p>
      </div>

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


