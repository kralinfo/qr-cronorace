// UI only: modal para reabrir uma corrida que foi encerrada acidentalmente ou que precisa continuar
import React, { useState } from 'react'
import { formatDateTimeBR } from '../results/date.formatter.js'
import { IconClose, IconRunner, IconClock, IconRefresh } from '../../shared/Icons.jsx'

/**
 * @param {{
 *   race: import('./races.types.js').Race,
 *   onReopen: (mode: 'resume'|'compensate'|'reset') => Promise<void>,
 *   onClose: () => void
 * }} props
 */
export default function ReopenRaceModal({ race, onReopen, onClose }) {
  const [submitting, setSubmitting] = useState(false)

  const endMs = race.endTime ? Date.parse(race.endTime) : Date.now()
  const now = Date.now()
  const pausedMs = Math.max(0, now - endMs)
  const pausedMinutes = Math.floor(pausedMs / 60000)
  const pausedSeconds = Math.floor((pausedMs % 60000) / 1000)

  const pausedText = pausedMinutes > 0
    ? `${pausedMinutes} min e ${pausedSeconds}s`
    : `${pausedSeconds} segundos`

  const handleAction = async (mode) => {
    setSubmitting(true)
    try {
      await onReopen(mode)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="reopen-race-modal" onClick={e => e.stopPropagation()}>
        <div className="reopen-race-header">
          <div>
            <h2>Reabrir Corrida</h2>
            <p className="reopen-race-subtitle">{race.name}</p>
          </div>
          <button type="button" className="menu-close-btn" onClick={onClose} aria-label="Fechar"><IconClose size={16} /></button>
        </div>

        <div className="reopen-race-content">
          <div className="reopen-race-detected-box">
            <p className="reopen-detected-title">Parada detectada:</p>
            <ul>
              <li><strong>Largada original:</strong> {race.startTime ? formatDateTimeBR(race.startTime) : '—'}</li>
              <li><strong>Hora do encerramento:</strong> {race.endTime ? formatDateTimeBR(race.endTime) : '—'}</li>
              <li><strong>Tempo que a corrida esteve parada:</strong> {pausedText}</li>
            </ul>
          </div>

          <p className="reopen-instructions">Escolha como deseja retomar a contagem da corrida:</p>

          <div className="reopen-options-list">
            <button
              type="button"
              className="reopen-option-card primary"
              onClick={() => handleAction('resume')}
              disabled={submitting}
            >
              <div className="reopen-option-icon"><IconClock size={22} /></div>
              <div className="reopen-option-text">
                <strong>Continuar em Tempo Real (Recomendado)</strong>
                <span>
                  Conta o tempo corrido desde a primeira largada, como se a corrida nunca tivesse sido encerrada. Mantém todos os corredores registrados.
                </span>
              </div>
            </button>

            <button
              type="button"
              className="reopen-option-card"
              onClick={() => handleAction('compensate')}
              disabled={submitting}
            >
              <div className="reopen-option-icon"><IconRunner size={22} /></div>
              <div className="reopen-option-text">
                <strong>Continuar de onde parou</strong>
                <span>
                  Retoma a contagem exatamente no segundo em que foi encerrada. Mantém intactos todos os corredores e chegadas já registrados.
                </span>
              </div>
            </button>

            <button
              type="button"
              className="reopen-option-card reset"
              onClick={() => handleAction('reset')}
              disabled={submitting}
            >
              <div className="reopen-option-icon"><IconRefresh size={22} /></div>
              <div className="reopen-option-text">
                <strong>Zerar cronômetro e corredores</strong>
                <span>
                  Zera o cronômetro para 00:00:00 e apaga os corredores que já passaram. A contagem só iniciará quando der a largada no cronômetro.
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="reopen-race-footer">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
