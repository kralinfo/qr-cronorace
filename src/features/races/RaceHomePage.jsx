// UI only: painel principal da corrida ativa — visual estilo app mobile moderno
import React, { useState } from 'react'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { useRaces } from './useRaces.js'
import { useRunners } from '../runners/useRunners.js'
import { useResults } from '../results/useResults.js'
import { formatDateOnlyBR } from './date-only.formatter.js'
import { buildRegistrationLink, buildRankingLink } from './share-link.service.js'
import RaceChronometer from './RaceChronometer.jsx'
import StartTimeField from './StartTimeField.jsx'
import EditRaceForm from './EditRaceForm.jsx'
import CopyableField from './CopyableField.jsx'
import ActionsMenu from '../../shared/ActionsMenu.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import ReopenRaceModal from './ReopenRaceModal.jsx'
import Modal from '../../shared/Modal.jsx'
import {
  IconRunner,
  IconScanner,
  IconTrophy,
  IconTV,
  IconEditDoc,
  IconRefresh,
  IconPlay
} from '../../shared/Icons.jsx'

/** @param {{ onNavigate?: (tab: string) => void, onOpenScanner?: () => void }} props */
export default function RaceHomePage({ onNavigate, onOpenScanner }) {
  const { activeRace, clearActiveRace } = useActiveRace()
  const { setStartTime, finishRace, reopenRace, editRace, removeRace } = useRaces()
  const { runners } = useRunners(activeRace?.id)
  const { placements } = useResults(activeRace?.id)
  const [panel, setPanel] = useState(/** @type {'start'|'edit'|'register-link'|'ranking-link'|null} */(null))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)

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

  const arrivedCount = new Set(placements.map(p => p.barcode).filter(Boolean)).size

  // Grid de acesso rápido (pequenos, estilo "Favoritos")
  const quickActions = [
    {
      id: 'runners',
      label: 'Corredores',
      icon: <IconRunner size={24} />,
      color: 'icon-blue',
      onClick: () => onNavigate?.('runners')
    },
    {
      id: 'scanner',
      label: 'Chegada',
      icon: <IconScanner size={24} />,
      color: 'icon-green',
      disabled: !activeRace.startTime,
      onClick: () => {
        if (!activeRace.startTime) return
        onOpenScanner?.() || onNavigate?.('scanner')
      }
    },
    {
      id: 'results',
      label: 'Ranking',
      icon: <IconTrophy size={24} />,
      color: 'icon-amber',
      onClick: () => onNavigate?.('results')
    },
    {
      id: 'tv',
      label: 'Telão TV',
      icon: <IconTV size={24} />,
      color: 'icon-purple',
      onClick: () => setPanel('ranking-link')
    },
    {
      id: 'link',
      label: 'Inscrição',
      icon: <IconEditDoc size={24} />,
      color: 'icon-teal',
      onClick: () => setPanel('register-link')
    }
  ]

  return (
    <div className="race-home-page">

      {/* Card de status da corrida */}
      <div className="race-home-card">
        <div className="race-home-card-header">
          <div>
            <h2>{activeRace.name}</h2>
            {activeRace.eventDate && <p className="race-home-date">{formatDateOnlyBR(activeRace.eventDate)}</p>}
          </div>
          <ActionsMenu items={[
            ...(activeRace.endTime
              ? [{ label: 'Reabrir corrida', onClick: () => setReopenModalOpen(true) }]
              : []),
            ...(activeRace.startTime
              ? [{ label: 'Editar largada', onClick: () => setPanel('start') }]
              : []),
            { label: 'Editar corrida', onClick: () => setPanel('edit') },
            { label: 'Excluir corrida', onClick: () => setConfirmingDelete(true), danger: true }
          ]} />
        </div>

        {activeRace.endTime ? (
          <div className="race-home-status finished">
            <span className="race-status-pill finished">Encerrada</span>
            <span className="race-home-label">
              Largada: {new Date(activeRace.startTime).toLocaleString('pt-BR')} · Fim: {new Date(activeRace.endTime).toLocaleString('pt-BR')}
            </span>
            <RaceChronometer startTime={activeRace.startTime} endTime={activeRace.endTime} className="race-home-chronometer" />
            <p className="race-home-meta">
              {runners.length} corredor{runners.length === 1 ? '' : 'es'}
              {activeRace.distanceKm ? ` · ${activeRace.distanceKm} km` : ''}
            </p>
            <button
              type="button"
              className="reopen-race-btn"
              onClick={() => setReopenModalOpen(true)}
            >
              <IconRefresh size={16} /> Reabrir corrida
            </button>
          </div>
        ) : activeRace.startTime ? (
          <>
            <div className="race-home-status running">
              <span className="race-status-pill running">
                <span className="status-dot green" /> Em andamento
              </span>
              <span className="race-home-label">Largada às {new Date(activeRace.startTime).toLocaleString('pt-BR')}</span>
              <RaceChronometer startTime={activeRace.startTime} className="race-home-chronometer" />
              <p className="race-home-meta">
                {arrivedCount} de {runners.length} chegaram
                {' · '}
                {runners.length} corredor{runners.length === 1 ? '' : 'es'}
                {activeRace.distanceKm ? ` · ${activeRace.distanceKm} km` : ''}
              </p>
              <button type="button" className="danger-btn end-race-btn" onClick={() => setConfirmingFinish(true)}>
                Encerrar corrida
              </button>
            </div>
          </>
        ) : (
          <div className="race-home-status pending">
            <span className="race-status-pill pending">Aguardando largada</span>
            <span className="race-home-label">Corrida ainda não iniciada</span>
            <button className="start-now-btn" onClick={handleStartNow}>
              <IconPlay size={16} /> Iniciar corrida agora
            </button>
          </div>
        )}
      </div>

      {/* Acesso Rápido — grid de ícones pequenos estilo Favoritos */}
      <section className="race-dashboard-section" aria-label="Acesso rápido">
        <h3 className="race-dashboard-title">Acesso Rápido</h3>
        <div className="quick-actions-grid">
          {quickActions.map(action => (
            <button
              key={action.id}
              type="button"
              className={`quick-action-item ${action.disabled ? 'disabled' : ''}`}
              onClick={action.onClick}
              disabled={action.disabled}
              title={action.disabled ? 'Inicie a corrida para liberar' : action.label}
            >
              <div className={`quick-action-icon ${action.color || ''}`}>
                {action.icon}
              </div>
              <span className="quick-action-label">{action.label}</span>
              {action.disabled && (
                <span className="quick-action-lock">Bloq.</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {panel === 'start' && (
        <Modal title="Editar Largada" onClose={closePanel} maxWidth={480}>
          <StartTimeField race={activeRace} onSave={setStartTime} onClose={closePanel} />
        </Modal>
      )}

      {panel === 'edit' && (
        <Modal title="Editar Corrida" onClose={closePanel} maxWidth={480}>
          <EditRaceForm race={activeRace} onSave={editRace} onCancel={closePanel} />
        </Modal>
      )}

      {panel === 'register-link' && (
        <Modal title="Compartilhar Link de Inscrição" onClose={closePanel} maxWidth={520}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#0071e3', fontWeight: 600 }}>Link direto (Sem exigir código)</h4>
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#86868b' }}>
              O atleta clica no link e já entra direto na tela de cadastro desta corrida:
            </p>
            <CopyableField label="Link direto" value={buildRegistrationLink(activeRace.id, true)} />
          </div>

          <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '12px' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#1d1d1f', fontWeight: 600 }}>Compartilhar exigindo código</h4>
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#86868b' }}>
              O atleta acessa a página e precisa digitar o código da prova para cadastrar:
            </p>
            <CopyableField label="Link" value={buildRegistrationLink(null, false)} />
            <CopyableField label="Código da corrida" value={activeRace.id} />
          </div>
        </Modal>
      )}

      {panel === 'ranking-link' && (
        <Modal title="Link do Ranking para TV / Telão" onClose={closePanel} maxWidth={520}>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#6e6e73' }}>
            Compartilhe ou abra este link em uma TV ou telão para acompanhar a classificação dos corredores em tempo real:
          </p>
          <CopyableField label="Link do ranking" value={buildRankingLink(activeRace.id)} />
        </Modal>
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

      {reopenModalOpen && (
        <ReopenRaceModal
          race={activeRace}
          onReopen={async (mode) => {
            await reopenRace(activeRace.id, mode)
          }}
          onClose={() => setReopenModalOpen(false)}
        />
      )}
    </div>
  )
}
