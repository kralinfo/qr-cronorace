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
  const { activeRace, clearActiveRace, selectRace } = useActiveRace()
  const { races, setStartTime, finishRace, reopenRace, editRace, removeRace } = useRaces()
  const { runners } = useRunners(activeRace?.id)
  const { runners: allRunners } = useRunners('ALL')
  const { placements } = useResults(activeRace?.id)
  const [panel, setPanel] = useState(null)
const [raceTab, setRaceTab] = useState('current')
  const [registeredPage, setRegisteredPage] = useState(0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)
  const [confirmingStartEmpty, setConfirmingStartEmpty] = useState(false)
  const [name, setName] = useState(activeRace?.name || '')
  const [distanceKm, setDistanceKm] = useState(activeRace?.distanceKm || '')
  const [runnerName, setRunnerName] = useState('')
  const [runnerNumber, setRunnerNumber] = useState('')
  const [runnerCategory, setRunnerCategory] = useState('MASCULINO')

  useEffect(() => {
    setName(activeRace?.name || '')
    setDistanceKm(activeRace?.distanceKm || '')
  }, [activeRace?.id, activeRace?.name, activeRace?.distanceKm])

  if (!activeRace) return null

  const closePanel = () => setPanel(null)
  const maleRunners = runners.filter(r => (r.category || '').toLowerCase().includes('masc'))
  const femaleRunners = runners.filter(r => (r.category || '').toLowerCase().includes('fem'))
  const pcdRunners = runners.filter(r => (r.category || '').toLowerCase().includes('pcd'))

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

      <div className="race-config-tabs" style={{ display:'flex', gap:8, padding:'12px 16px' }}>
        <button type="button" onClick={() => setRaceTab('current')} style={{ padding:'8px 16px', borderRadius:8, border:'none', background: raceTab==='current'?'#7c3aed':'#1f1633', color:'#fff', fontWeight:700, width:'auto', display:'inline-flex' }}>+ Cadastrar Nova Corrida</button>
        <button type="button" onClick={() => setRaceTab('registered')} style={{ padding:'8px 16px', borderRadius:8, border:'none', background: raceTab==='registered'?'#7c3aed':'#1f1633', color:'#fff', fontWeight:700, width:'auto', display:'inline-flex' }}>📋 Corridas Cadastradas</button>
      </div>

      {raceTab === 'current' && (
      <main className="race-config-main">
        <div className="race-config-split">
          <div className="race-config-left">
            <div className="race-config-title-row">
          <IconMenu size={28} />
          <h1>CONFIGURAR CORRIDA</h1>
        </div>
        <p className="race-config-desc">Configure as categorias antes de iniciar. Posições gerais são opcionais.</p>

        <div className="race-config-fields">
          <div className="race-config-field" style={{ flex: "0 0 420px", maxWidth: "100%" }}>
            <label>NOME DA CORRIDA</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleSaveField}
              placeholder="Ex: Aliança Run 2025"
            />
          </div>
          <div className="race-config-field" style={{ flex: "0 0 120px", maxWidth: "100%" }}>
            <label>DISTÂNCIA</label>
            <input
              value={distanceKm}
              onChange={e => setDistanceKm(e.target.value)}
              onBlur={handleSaveField}
              placeholder="Ex: 5km, 10km..."
            />
          </div>
        </div>

        <section className="race-config-card" style={{ marginBottom: 16 }}>
          <div className="race-config-card-title">CADASTRAR CORREDOR</div>
          <div className="race-config-card-row race-config-runner-form">
            <input className="race-config-input runner-name" placeholder="Nome do corredor" value={runnerName} onChange={e => setRunnerName(e.target.value)} />
            <input className="race-config-input runner-number" placeholder="Nº peito" value={runnerNumber} onChange={e => setRunnerNumber(e.target.value.replace(/\\D/g, ''))} />
            <select className="race-config-input runner-category" value={runnerCategory} onChange={e => setRunnerCategory(e.target.value)}>
              <option value="MASCULINO">MASCULINO</option>
              <option value="FEMININO">FEMININO</option>
              <option value="PCD">PCD</option>
            </select>
            <button type="button" className="race-config-add-btn runner-btn" onClick={() => onNavigate?.('runners')}>
              Cadastrar Corredor
            </button>
          </div>
        </section>

          </div>
          <div className="race-config-right">
            <section className="race-config-card" style={{ marginBottom: 16 }}>
              <div className="race-config-card-title">CORREDORES CADASTRADOS</div>
              <ul className="race-config-runner-list">
                {runners.map(r => (
                  <li key={r.id}>Nº {r.number ?? '—'} · {r.name} · {r.category || '—'}</li>
                ))}
                {runners.length === 0 && <li>Nenhum corredor cadastrado.</li>}
              </ul>
            </section>
          </div>
        </div>

        <p className="race-config-info">
          <IconHome size={14} /> Corredores locais serão marcados <strong>após o encerramento</strong> da corrida.
        </p>

        <button type="button" className="race-config-start-btn" onClick={() => { handleStartNow(); onNavigate?.('chronometer') }}>
          <IconPlay size={20} /> INICIAR CRONÔMETRO
        </button>
      </main>
      )}

      {raceTab === 'registered' && (
        <main className="race-config-main">
          <div className="registered-races-grid">
            {(() => {
              const pageSize = 6
              const pagedRaces = (races || []).slice(registeredPage * pageSize, (registeredPage + 1) * pageSize)
              return pagedRaces.map(r => {
                const isActive = r.id === activeRace?.id
                const status = r.endTime ? 'Encerrada' : r.startTime ? 'Em andamento' : 'Aguardando'
                return (
                  <div key={r.id} className={`registered-race-card ${isActive ? 'active' : ''}`}>
                    <div className="registered-race-title">{r.name}</div>
                    <div className="registered-race-meta">
                      {r.distanceKm && <span className="registered-race-badge">{r.distanceKm} km</span>}
                      <span className="registered-race-badge">{(allRunners || []).filter(rr => rr.raceId === r.id).length} corredores</span>
                      <span className={`registered-race-status ${r.endTime ? 'finished' : r.startTime ? 'running' : 'pending'}`}>{status}</span>
                      {isActive && <span className="registered-race-active">Ativa</span>}
                    </div>
                    <div className="registered-race-actions">
                      <button type="button" className="registered-race-select-btn" onClick={() => { selectRace(r); setRaceTab('current') }}>
                        ▶ Selecionar
                      </button>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          {(races || []).length === 0 && <p className="race-config-info">Nenhuma corrida cadastrada.</p>}
          {(races || []).length > 6 && (
            <div className="registered-races-pagination">
              <button type="button" disabled={registeredPage === 0} onClick={() => setRegisteredPage(p => Math.max(0, p - 1))}>Anterior</button>
              <span>Página {registeredPage + 1} de {Math.ceil((races || []).length / 6)}</span>
              <button type="button" disabled={registeredPage >= Math.ceil((races || []).length / 6) - 1} onClick={() => setRegisteredPage(p => p + 1)}>Próxima</button>
            </div>
          )}
        </main>
      )}

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
