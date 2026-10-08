// UI only: painel principal da corrida ativa — mostra as informações essenciais
// (nome, data, horário de largada, cronômetro ao vivo) e as ações via menu de contexto.
import React, { useState } from 'react'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { useRaces } from './useRaces.js'
import { useRunners } from '../runners/useRunners.js'
import { formatDateOnlyBR } from './date-only.formatter.js'
import { buildRegistrationLink, buildRankingLink } from './share-link.service.js'
import RaceChronometer from './RaceChronometer.jsx'
import StartTimeField from './StartTimeField.jsx'
import EditRaceForm from './EditRaceForm.jsx'
import CopyableField from './CopyableField.jsx'
import ActionsMenu from '../../shared/ActionsMenu.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'

export default function RaceHomePage() {
  const { activeRace, clearActiveRace } = useActiveRace()
  const { setStartTime, finishRace, editRace, removeRace } = useRaces()
  const { runners } = useRunners(activeRace?.id)
  const [panel, setPanel] = useState(/** @type {'start'|'edit'|'register-link'|'ranking-link'|null} */(null))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingFinish, setConfirmingFinish] = useState(false)

  if (!activeRace) return null

  const closePanel = () => setPanel(null)

  const handleConfirmDelete = async () => {
    await removeRace(activeRace.id)
    setConfirmingDelete(false)
    clearActiveRace()
  }

  const handleConfirmFinish = async () => {
    await finishRace(activeRace.id, new Date().toISOString())
    setConfirmingFinish(false)
  }

  const handleStartNow = async () => {
    await setStartTime(activeRace.id, new Date().toISOString())
  }

  return (
    <div className="race-home-page">
      <div className="race-home-card">
        <div className="race-home-card-header">
          <div>
            <h2>{activeRace.name}</h2>
            {activeRace.eventDate && <p className="race-home-date">{formatDateOnlyBR(activeRace.eventDate)}</p>}
          </div>
          <ActionsMenu items={[
            ...(activeRace.startTime
              ? [{ label: 'Editar largada', onClick: () => setPanel('start') }]
              : []),
            { label: 'Editar corrida', onClick: () => setPanel('edit') },
            { label: 'Link de cadastro', onClick: () => setPanel('register-link') },
            { label: 'Link do ranking (TV)', onClick: () => setPanel('ranking-link') },
            { label: 'Trocar corrida', onClick: clearActiveRace },
            { label: 'Excluir corrida', onClick: () => setConfirmingDelete(true), danger: true }
          ]} />
        </div>

        {activeRace.endTime ? (
          <div className="race-home-status finished">
            <span className="race-home-label">
              Largada às {new Date(activeRace.startTime).toLocaleString('pt-BR')}
              <br />
              Encerrada às {new Date(activeRace.endTime).toLocaleString('pt-BR')}
            </span>
            <RaceChronometer startTime={activeRace.startTime} endTime={activeRace.endTime} className="race-home-chronometer" />
            <p className="race-home-meta">
              {runners.length} corredor{runners.length === 1 ? '' : 'es'}
              {activeRace.distanceKm ? ` · ${activeRace.distanceKm} km` : ''}
            </p>
          </div>
        ) : activeRace.startTime ? (
          <div className="race-home-status running">
            <span className="race-home-label">Largada às {new Date(activeRace.startTime).toLocaleString('pt-BR')}</span>
            <RaceChronometer startTime={activeRace.startTime} className="race-home-chronometer" />
            <p className="race-home-meta">
              {runners.length} corredor{runners.length === 1 ? '' : 'es'}
              {activeRace.distanceKm ? ` · ${activeRace.distanceKm} km` : ''}
            </p>
            <button type="button" className="danger-btn end-race-btn" onClick={() => setConfirmingFinish(true)}>
              Encerrar corrida
            </button>
          </div>
        ) : (
          <div className="race-home-status pending">
            <span className="race-home-label">Corrida ainda não iniciada</span>
            <button className="start-now-btn" onClick={handleStartNow}>🏁 Iniciar corrida agora</button>
          </div>
        )}
      </div>

      {panel === 'start' && (
        <div className="share-panel">
          <button className="close-panel-btn" onClick={closePanel}>Fechar ✕</button>
          <StartTimeField race={activeRace} onSave={setStartTime} />
        </div>
      )}

      {panel === 'edit' && (
        <div className="share-panel">
          <EditRaceForm race={activeRace} onSave={editRace} onCancel={closePanel} />
        </div>
      )}

      {panel === 'register-link' && (
        <div className="share-panel">
          <button className="close-panel-btn" onClick={closePanel}>Fechar ✕</button>
          <p>Envie o link e o código abaixo para a pessoa que vai ajudar a cadastrar corredores:</p>
          <CopyableField label="Link" value={buildRegistrationLink()} />
          <CopyableField label="Código da corrida" value={activeRace.id} />
        </div>
      )}

      {panel === 'ranking-link' && (
        <div className="share-panel">
          <button className="close-panel-btn" onClick={closePanel}>Fechar ✕</button>
          <p>Compartilhe este link para acompanhar a classificação em tempo real (ex: numa TV/telão):</p>
          <CopyableField label="Link do ranking" value={buildRankingLink(activeRace.id)} />
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir a corrida "${activeRace.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir corrida"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {confirmingFinish && (
        <ConfirmDialog
          message={`Tem certeza que deseja encerrar a corrida "${activeRace.name}"? O cronômetro vai parar de contar.`}
          confirmLabel="Encerrar corrida"
          onConfirm={handleConfirmFinish}
          onCancel={() => setConfirmingFinish(false)}
        />
      )}
    </div>
  )
}
