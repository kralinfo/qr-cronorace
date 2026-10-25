import React, { useState, useEffect } from 'react'
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
  IconPlay,
  IconPrinter,
  IconMenu,
  IconClock,
  IconHome
} from '../../shared/Icons.jsx'

export default function RaceHomePage({ onNavigate, onOpenScanner }) {
  const { activeRace, clearActiveRace } = useActiveRace()
  const { setStartTime, finishRace, reopenRace, editRace, removeRace } = useRaces()
  const { runners } = useRunners(activeRace?.id)
  const { placements } = useResults(activeRace?.id)
  const [panel, setPanel] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)
  const [confirmingStartEmpty, setConfirmingStartEmpty] = useState(false)
  const [name, setName] = useState(activeRace?.name || '')
  const [distanceKm, setDistanceKm] = useState(activeRace?.distanceKm || '')

  useEffect(() => {
    setName(activeRace?.name || '')
    setDistanceKm(activeRace?.distanceKm || '')
  }, [activeRace?.id, activeRace?.name, activeRace?.distanceKm])

  if (!activeRace) return null

  const closePanel = () => setPanel(null)
  const maleRunners = runners.filter(r => (r.category || '').toLowerCase().includes('masc'))
  const femaleRunners = runners.filter(r => (r.category || '').toLowerCase().includes('fem'))

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
    if (runners.length === 0) {
      setConfirmingStartEmpty(true)
      return
    }
    await setStartTime(activeRace.id, new Date().toISOString())
  }
  const handleConfirmStartEmpty = async () => {
    await setStartTime(activeRace.id, new Date().toISOString())
    setConfirmingStartEmpty(false)
  }
  const handleSaveField = async () => {
    await editRace(activeRace.id, { name, distanceKm })
  }
  const arrivedCount = new Set(placements.map(p => p.barcode).filter(Boolean)).size

  return (
    <div className="race-config-page">
      <header className="race-config-header">
        <div className="race-config-brand">
          <IconClock size={20} />
          <span>JANELAMARCA</span>
        </div>
        <div className="race-config-status">
          <span className="status-dot" />
          AGUARDANDO
        </div>
      </header>

      <main className="race-config-main">
        <div className="race-config-title-row">
          <IconMenu size={28} />
          <h1>CONFIGURAR CORRIDA</h1>
        </div>
        <p className="race-config-desc">Configure as categorias antes de iniciar. Posições gerais são opcionais.</p>

        <div className="race-config-fields">
          <div className="race-config-field">
            <label>NOME DA CORRIDA</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleSaveField}
              placeholder="Ex: Aliança Run 2025"
            />
          </div>
          <div className="race-config-field">
            <label>DISTÂNCIA</label>
            <input
              value={distanceKm}
              onChange={e => setDistanceKm(e.target.value)}
              onBlur={handleSaveField}
              placeholder="Ex: 5km, 10km..."
            />
          </div>
        </div>

        <div className="race-config-cards">
          <section className="race-config-card male">
            <div className="race-config-card-title">
              <span className="cat-dot male" />
              MASCULINO
            </div>
            <label className="race-config-small-label">NÚMERO · POS. GERAL (OPCIONAL)</label>
            <div className="race-config-card-row">
              <input className="race-config-input" placeholder="Nº peito" />
              <input className="race-config-input narrow" placeholder="Pos. geral" />
              <button type="button" className="race-config-add-btn" onClick={() => onNavigate?.('runners')}>
                + Add
              </button>
            </div>
            <ul className="race-config-runner-list">
              {maleRunners.map(r => (
                <li key={r.id}>Nº {r.number ?? '—'} · {r.name}</li>
              ))}
            </ul>
          </section>

          <section className="race-config-card female">
            <div className="race-config-card-title">
              <span className="cat-dot female" />
              FEMININO
            </div>
            <label className="race-config-small-label">NÚMERO · POS. GERAL (OPCIONAL)</label>
            <div className="race-config-card-row">
              <input className="race-config-input" placeholder="Nº peito" />
              <input className="race-config-input narrow" placeholder="Pos. geral" />
              <button type="button" className="race-config-add-btn" onClick={() => onNavigate?.('runners')}>
                + Add
              </button>
            </div>
            <ul className="race-config-runner-list">
              {femaleRunners.map(r => (
                <li key={r.id}>Nº {r.number ?? '—'} · {r.name}</li>
              ))}
            </ul>
          </section>
        </div>

        <p className="race-config-info">
          <IconHome size={14} /> Corredores locais serão marcados <strong>após o encerramento</strong> da corrida.
        </p>

        <button type="button" className="race-config-start-btn mx-auto" onClick={() => { handleStartNow(); onNavigate?.('chronometer') }}>
          <IconPlay size={20} /> INICIAR CRONÔMETRO
        </button>
      </main>

      {panel === 'start' && (
        <Modal title="Editar Largada" onClose={closePanel} maxWidth={480}>
          <StartTimeField race={activeRace} onSave={setStartTime} onClose={closePanel} runnerCount={runners.length} />
        </Modal>
      )}
      {panel === 'edit' && (
        <Modal title="Editar Corrida" onClose={closePanel} maxWidth={480}>
          <EditRaceForm race={activeRace} onSave={editRace} onCancel={closePanel} />
        </Modal>
      )}
      {confirmingDelete && (
        <ConfirmDialog message={`Tem certeza que deseja excluir a corrida "${activeRace.name}"? Essa ação não pode ser desfeita.`} confirmLabel="Excluir corrida" onConfirm={handleConfirmDelete} onCancel={() => setConfirmingDelete(false)} />
      )}
      {confirmingFinish && (
        <ConfirmDialog message={`Tem certeza que deseja encerrar a corrida "${activeRace.name}"? O cronômetro vai parar de contar.`} confirmLabel="Encerrar corrida" onConfirm={handleConfirmFinish} onCancel={() => setConfirmingFinish(false)} />
      )}
      {confirmingStartEmpty && (
        <ConfirmDialog message="Esta corrida não tem corredores cadastrados. Deseja iniciar mesmo assim?" confirmLabel="Iniciar mesmo assim" onConfirm={handleConfirmStartEmpty} onCancel={() => setConfirmingStartEmpty(false)} />
      )}
      {reopenModalOpen && (
        <ReopenRaceModal race={activeRace} onReopen={async (mode) => { await reopenRace(activeRace.id, mode) }} onClose={() => setReopenModalOpen(false)} />
      )}
    </div>
  )
}
