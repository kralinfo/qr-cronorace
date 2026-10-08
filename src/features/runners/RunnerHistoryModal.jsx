// UI only: modal com histórico de participações de um atleta em todas as corridas
import React, { useState } from 'react'
import { formatDateOnlyBR } from '../races/date-only.formatter.js'
import { normalizeComparable } from './runners.repository.js'
import RunnerQRItem from './RunnerQRItem.jsx'

/**
 * @param {{
 *   runnerName: string,
 *   allRunners: Array<import('./runners.types.js').Runner>,
 *   racesMap: Record<string, import('../races/races.types.js').Race>,
 *   onClose: () => void,
 *   onSelectRace?: (raceId: string) => void
 * }} props
 */
export default function RunnerHistoryModal({
  runnerName,
  allRunners,
  racesMap,
  onClose,
  onSelectRace
}) {
  const normalizedTarget = normalizeComparable(runnerName)

  // Encontra todas as inscrições que correspondem ao nome do atleta
  const participations = allRunners.filter(r => normalizeComparable(r.name) === normalizedTarget)

  // Ordena pelas corridas mais recentes
  const sortedParticipations = [...participations].sort((a, b) => {
    const raceA = racesMap[a.raceId]
    const raceB = racesMap[b.raceId]
    const dateA = raceA?.eventDate ? Date.parse(raceA.eventDate) : 0
    const dateB = raceB?.eventDate ? Date.parse(raceB.eventDate) : 0
    return dateB - dateA
  })

  return (
    <div className="confirm-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="runner-history-modal" onClick={e => e.stopPropagation()}>
        <div className="runner-history-header">
          <div>
            <h2>Histórico de Provas</h2>
            <p className="runner-history-subtitle">
              Atleta: <strong>{runnerName}</strong> ({sortedParticipations.length} {sortedParticipations.length === 1 ? 'corrida' : 'corridas'})
            </p>
          </div>
          <button type="button" className="menu-close-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="runner-history-alert">
          <p>
            ℹ️ Cada corrida possui seu próprio QR Code e número de peito.
            Certifique-se de reimprimir o QR correspondente à prova desejada.
          </p>
        </div>

        <div className="runner-history-list">
          {sortedParticipations.length === 0 ? (
            <p className="runner-history-empty">Nenhum registro encontrado para este atleta.</p>
          ) : (
            <ul>
              {sortedParticipations.map(runner => {
                const race = racesMap[runner.raceId]
                const raceName = race?.name || `Corrida (${runner.raceId})`
                return (
                  <li key={runner.id} className="runner-history-card">
                    <div className="runner-history-card-header">
                      <div>
                        <strong className="runner-history-race-title">🏁 {raceName}</strong>
                        {race?.eventDate && (
                          <span className="runner-history-race-date">
                            {formatDateOnlyBR(race.eventDate)}
                          </span>
                        )}
                      </div>
                      <span className={`race-status-badge ${race?.endTime ? 'finished' : race?.startTime ? 'running' : 'pending'}`}>
                        {race?.endTime ? 'Encerrada' : race?.startTime ? 'Em andamento' : 'Não iniciada'}
                      </span>
                    </div>

                    <RunnerQRItem
                      runner={runner}
                      raceName={raceName}
                      highlightRaceBadge={false}
                      onSelectRace={onSelectRace ? (rId) => {
                        onSelectRace(rId)
                        onClose()
                      } : undefined}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="runner-history-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
