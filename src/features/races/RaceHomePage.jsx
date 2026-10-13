// UI only: painel principal da corrida ativa — mostra as informações essenciais
// (nome, data, horário de largada, cronômetro ao vivo) e as ações via menu de contexto.
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
import {
  IconRunner,
  IconScanner,
  IconTrophy,
  IconTV,
  IconEditDoc,
  IconFlag,
  IconChevronRight,
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

  return (
    <div className="race-home-page">
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
            { label: 'Link de cadastro', onClick: () => setPanel('register-link') },
            { label: 'Link do ranking (TV)', onClick: () => setPanel('ranking-link') },
            { label: 'Trocar corrida', onClick: clearActiveRace },
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
              className="primary-btn reopen-race-btn"
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
            <button type="button" className="secondary-btn race-home-scanner-shortcut" onClick={() => onOpenScanner?.()}>
              <IconScanner size={18} /> Marcar chegada (Scanner)
            </button>
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

      {/* Opções rápidas do menu organizadas e distribuídas na tela */}
      <section className="race-dashboard-section" aria-label="Acesso rápido às opções">
        <h3 className="race-dashboard-title">Acesso Rápido</h3>
        <div className="race-dashboard-grid">
          <button
            type="button"
            className="dashboard-card"
            onClick={() => onNavigate?.('runners')}
          >
            <div className="dashboard-card-icon icon-blue">
              <IconRunner size={20} />
            </div>
            <div className="dashboard-card-info">
              <strong>Corredores</strong>
              <span>Lista e QR Codes</span>
            </div>
            <span className="dashboard-card-arrow"><IconChevronRight size={16} /></span>
          </button>

          <button
            type="button"
            className={`dashboard-card primary-accent ${!activeRace.startTime ? 'disabled' : ''}`}
            onClick={() => {
              if (!activeRace.startTime) return
              onOpenScanner?.() || onNavigate?.('scanner')
            }}
            disabled={!activeRace.startTime}
            title={!activeRace.startTime ? 'A corrida precisa ser iniciada para marcar chegadas' : 'Marcar chegada de corredores'}
          >
            <div className="dashboard-card-icon icon-green">
              <IconScanner size={20} />
            </div>
            <div className="dashboard-card-info">
              <strong>Marcar Chegada</strong>
              {!activeRace.startTime ? (
                <span className="dashboard-card-hint">Não iniciada</span>
              ) : (
                <span>Scanner de câmera</span>
              )}
            </div>
            <span className="dashboard-card-arrow"><IconChevronRight size={16} /></span>
          </button>

          <button
            type="button"
            className="dashboard-card"
            onClick={() => onNavigate?.('results')}
          >
            <div className="dashboard-card-icon icon-amber">
              <IconTrophy size={20} />
            </div>
            <div className="dashboard-card-info">
              <strong>Ranking / Resultados</strong>
              <span>Classificação geral</span>
            </div>
            <span className="dashboard-card-arrow"><IconChevronRight size={16} /></span>
          </button>

          <button
            type="button"
            className="dashboard-card"
            onClick={() => setPanel('ranking-link')}
          >
            <div className="dashboard-card-icon icon-purple">
              <IconTV size={20} />
            </div>
            <div className="dashboard-card-info">
              <strong>Telão TV (Ao Vivo)</strong>
              <span>Transmissão em tempo real</span>
            </div>
            <span className="dashboard-card-arrow"><IconChevronRight size={16} /></span>
          </button>

          <button
            type="button"
            className="dashboard-card"
            onClick={() => setPanel('register-link')}
          >
            <div className="dashboard-card-icon icon-teal">
              <IconEditDoc size={20} />
            </div>
            <div className="dashboard-card-info">
              <strong>Link de Inscrição</strong>
              <span>Compartilhar com atletas</span>
            </div>
            <span className="dashboard-card-arrow"><IconChevronRight size={16} /></span>
          </button>

          <button
            type="button"
            className="dashboard-card"
            onClick={() => onNavigate?.('races')}
          >
            <div className="dashboard-card-icon icon-slate">
              <IconFlag size={20} />
            </div>
            <div className="dashboard-card-info">
              <strong>Trocar Corrida</strong>
              <span>Ver todas as provas</span>
            </div>
            <span className="dashboard-card-arrow"><IconChevronRight size={16} /></span>
          </button>
        </div>
      </section>

      {panel === 'start' && (
        <div className="share-panel">
          <button className="close-panel-btn" onClick={closePanel}>Fechar</button>
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
          <button className="close-panel-btn" onClick={closePanel}>Fechar</button>
          <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>Compartilhar Inscrição de Corredores</h3>

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
        </div>
      )}

      {panel === 'ranking-link' && (
        <div className="share-panel">
          <button className="close-panel-btn" onClick={closePanel}>Fechar</button>
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
