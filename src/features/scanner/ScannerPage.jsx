// UI only: leitura de QR code via câmera e registro da chegada com data/hora.
import React, { useState } from 'react'
import { useScanner } from './useScanner.js'
import { formatDateTimeBR } from '../results/date.formatter.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'
import { useRunners } from '../runners/useRunners.js'
import { addResult } from '../results/results.repository.js'
import ManualArrivalForm from './ManualArrivalForm.jsx'

/** @param {{ onBack?: () => void }} props */
export default function ScannerPage({ onBack }) {
  const { activeRace } = useActiveRace()
  const { videoRef, status, message, lastArrival, rejectedScan } = useScanner(activeRace)
  const { runners } = useRunners(activeRace?.id)
  const [showManual, setShowManual] = useState(false)
  const [manualConfirmation, setManualConfirmation] = useState(null)
  const [manualError, setManualError] = useState(null)

  const isStarted = Boolean(activeRace?.startTime)
  const isFinished = Boolean(activeRace?.endTime)

  if (!activeRace) {
    return (
      <div className="scanner-page">
        <button type="button" className="secondary-btn scanner-back-btn" onClick={() => onBack?.()}>
          ← Voltar
        </button>
        <div className="empty-state-box" style={{ margin: '20px auto', maxWidth: 460 }}>
          <h3>Nenhuma corrida selecionada</h3>
          <p>Selecione ou inicie uma corrida antes de abrir o leitor de QR code.</p>
        </div>
      </div>
    )
  }

  const handleManualConfirm = async (runner) => {
    if (!isStarted) {
      setManualError('Não é possível registrar chegada: esta corrida ainda não foi iniciada.')
      return
    }

    if (isFinished) {
      setManualError('Não é possível registrar chegada: esta corrida já foi encerrada.')
      return
    }

    setManualError(null)
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
      <button type="button" className="secondary-btn scanner-back-btn" onClick={() => onBack?.()}>
        ← Voltar
      </button>

      {!isStarted && (
        <div className="scanner-race-not-started-banner">
          <span><strong>Corrida Não Iniciada</strong>. Dê a largada na tela inicial para liberar a marcação de chegadas.</span>
        </div>
      )}

      {isFinished && (
        <div className="scanner-race-finished-banner">
          <span><strong>Corrida Encerrada</strong> às {new Date(activeRace.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Leituras bloqueadas.</span>
        </div>
      )}

      <div className="video-wrap">
        <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%' }} />
        <div className="reticle" />
      </div>

      <div className="controls">
        <p>{message}</p>
        <button
          type="button"
          className="secondary-btn manual-arrival-btn"
          onClick={() => {
            if (!isStarted) {
              setManualError('Não é possível registrar chegada: esta corrida ainda não foi iniciada.')
              return
            }
            if (isFinished) {
              setManualError('Não é possível registrar chegada: esta corrida já foi encerrada.')
              return
            }
            setShowManual(true)
          }}
          disabled={!isStarted || isFinished}
          title={!isStarted ? 'Corrida ainda não iniciada' : isFinished ? 'Corrida encerrada' : undefined}
        >
          Registrar chegada manualmente
        </button>
      </div>

      {manualError && (
        <section className="scan-result not-found race-finished-result">
          <h3>Ação Bloqueada</h3>
          <p>{manualError}</p>
        </section>
      )}

      {showManual && (
        <div className="share-panel">
          <ManualArrivalForm
            runners={runners}
            isStarted={isStarted}
            isFinished={isFinished}
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
          {lastArrival.number && <p><strong>Número:</strong> {lastArrival.number}</p>}
          <p><strong>Id:</strong> {lastArrival.barcode}</p>
          <p><strong>Data/Hora:</strong> {formatDateTimeBR(lastArrival.dateTime)}</p>
        </section>
      )}

      {status === 'race-finished' && (
        <section className="scan-result not-found race-finished-result">
          <h3>Leitura Bloqueada: Corrida Encerrada</h3>
          <p>{message}</p>
          {rejectedScan && (
            <p className="scan-rejected-runner">
              Corredor lido: <strong>{rejectedScan.runnerName ?? `#${rejectedScan.barcode}`}</strong>
              {rejectedScan.runnerNumber ? ` (Nº ${rejectedScan.runnerNumber})` : ''}
            </p>
          )}
        </section>
      )}

      {status === 'invalid-race' && (
        <section className="scan-result not-found">
          <h3>Corredor não pertence a esta corrida</h3>
          <p>{message}</p>
          {rejectedScan && (
            <p className="scan-rejected-runner">
              Corredor lido: <strong>{rejectedScan.runnerName ?? `#${rejectedScan.barcode}`}</strong>
              {rejectedScan.runnerNumber ? ` (Nº ${rejectedScan.runnerNumber})` : ''}
            </p>
          )}
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


