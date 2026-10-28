import React, { useState, useEffect, useCallback } from 'react'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { useRaces } from './useRaces.js'
import { useRunners } from '../runners/useRunners.js'
import { useResults } from '../results/useResults.js'
import { printRunnerQRCode } from '../runners/print.service.js'
import { downloadDataUrl } from '../runners/download.service.js'
import { buildQRFilename } from '../runners/qr-filename.service.js'
import { isBluetoothSupported, printRunnerToBluetooth } from '../runners/bluetooth-printer.service.js'
import { generateRunnerQRCode } from '../runners/qrcode.service.js'
import StartTimeField from './StartTimeField.jsx'
import EditRaceForm from './EditRaceForm.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import ReopenRaceModal from './ReopenRaceModal.jsx'
import Modal from '../../shared/Modal.jsx'
import { IconPlay, IconMenu, IconClock, IconHome } from '../../shared/Icons.jsx'

// ─── Category Toggle Button ───────────────────────────────────────────────────
function CategoryToggle({ label, active, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cat-toggle ${active ? 'cat-toggle--active' : ''}`}
      style={active ? { '--cat-color': color, background: color + '33', borderColor: color, color } : {}}
      title={label}
    >
      {label}
    </button>
  )
}

// ─── QR Result Panel ──────────────────────────────────────────────────────────
function QRResultPanel({ lastQrCode, raceName, onDismiss }) {
  const [printingBt, setPrintingBt] = useState(false)

  const handlePrintBt = async () => {
    if (!isBluetoothSupported()) {
      printRunnerQRCode(lastQrCode.qrDataUrl, lastQrCode.runner, raceName)
      return
    }
    setPrintingBt(true)
    try {
      await printRunnerToBluetooth(lastQrCode.qrDataUrl, lastQrCode.runner, raceName)
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        alert(`Erro na impressora Bluetooth: ${err.message || 'Verifique se a impressora térmica está ligada.'}`)
      }
    } finally {
      setPrintingBt(false)
    }
  }

  return (
    <div className="qr-result-panel">
      <div className="qr-result-header">
        <span className="qr-result-badge">✓ Corredor cadastrado!</span>
        <button type="button" className="qr-result-dismiss" onClick={onDismiss}>✕</button>
      </div>
      <div className="qr-result-body">
        <div className="qr-result-img-wrap">
          <img src={lastQrCode.qrDataUrl} alt={`QR de ${lastQrCode.runner.name}`} className="qr-result-img" />
        </div>
        <div className="qr-result-info">
          <div className="qr-result-name">{lastQrCode.runner.name}</div>
          <div className="qr-result-meta">
            {lastQrCode.runner.number && <span className="qr-result-num">Nº {lastQrCode.runner.number}</span>}
            {lastQrCode.runner.category && <span className="qr-result-cat">{lastQrCode.runner.category}</span>}
          </div>
          <div className="qr-result-actions">
            <button type="button" className="qr-action-btn qr-action-thermal" onClick={handlePrintBt} disabled={printingBt}>
              🖨 {printingBt ? 'Enviando...' : 'Imprimir Térmica'}
            </button>
            <button type="button" className="qr-action-btn qr-action-cupom" onClick={() => printRunnerQRCode(lastQrCode.qrDataUrl, lastQrCode.runner, raceName)}>
              🧾 Cupom Sistema
            </button>
            <a className="qr-action-btn qr-action-download" href={lastQrCode.qrDataUrl} download={buildQRFilename(lastQrCode.runner)}>
              ⬇ Baixar PNG
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── New Race Form (inline) ───────────────────────────────────────────────────
function NewRaceForm({ onConfirm, onCancel, creating }) {
  const [name, setName] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [eventDate, setEventDate] = useState('')

  return (
    <form className="new-race-form" onSubmit={e => { e.preventDefault(); onConfirm(name, eventDate, distanceKm) }}>
      <div className="new-race-form-title">🏁 Nova Corrida</div>
      <div className="new-race-fields">
        <div className="new-race-field">
          <label htmlFor="new-race-name">Nome da corrida</label>
          <input id="new-race-name" placeholder="Ex: Corrida Aliança 2025" value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div className="new-race-field new-race-field--short">
          <label htmlFor="new-race-dist">Distância</label>
          <input id="new-race-dist" placeholder="Ex: 10km" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} />
        </div>
        <div className="new-race-field new-race-field--short">
          <label htmlFor="new-race-date">Data</label>
          <input id="new-race-date" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
        </div>
      </div>
      <div className="new-race-actions">
        <button type="submit" className="confirm-race-btn" disabled={creating}>
          {creating ? '...' : '✓'} Confirmar
        </button>
        <button type="button" className="cancel-race-btn" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

// ─── Runner Form ──────────────────────────────────────────────────────────────
function RunnerForm({ activeRace, onEnsureActiveRace }) {
  const { createRunner, error: runnerError, lastQrCode, clearError, clearLastQrCode } = useRunners(activeRace?.id)
  const nameInputRef = React.useRef(null)

  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [gender, setGender] = useState('MASCULINO')
  const [origin, setOrigin] = useState('LOCAL')   // 'LOCAL' | 'VISITANTE'
  const [isPcd, setIsPcd] = useState(false)
  const [is60Plus, setIs60Plus] = useState(false)
  const [localError, setLocalError] = useState(null)

  const buildCategory = () => {
    const parts = [gender, origin]
    if (isPcd) parts.push('PCD')
    if (is60Plus) parts.push('+60')
    return parts.join(' | ')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    setSubmitting(true)
    try {
      let targetRace = activeRace
      if (!targetRace?.id && onEnsureActiveRace) {
        targetRace = await onEnsureActiveRace()
      }
      if (!targetRace?.id) {
        const msg = 'Informe o nome da corrida e clique em "✓ Confirmar Corrida" antes de cadastrar corredores.'
        setLocalError(msg)
        alert(msg)
        return
      }

      const result = await createRunner(name, number, '', targetRace.id, buildCategory())
      if (result) {
        setName('')
        setNumber('')
        setGender('MASCULINO')
        setOrigin('LOCAL')
        setIsPcd(false)
        setIs60Plus(false)
        nameInputRef.current?.focus()
      }
    } catch (err) {
      console.error('Erro ao cadastrar corredor:', err)
      const msg = err.message || 'Erro ao cadastrar corredor.'
      setLocalError(msg)
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const displayedError = localError || runnerError

  return (
    <div className="runner-form-wrap">
      <div className="runner-form-section-title">CADASTRAR CORREDOR</div>
      <form onSubmit={handleSubmit} className="runner-inline-form">
        <div className="runner-form-row">
          <input
            ref={nameInputRef}
            className="runner-form-input runner-form-name"
            placeholder="Nome do corredor"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
          <input
            className="runner-form-input runner-form-number"
            placeholder="Nº peito"
            inputMode="numeric"
            value={number}
            onChange={e => setNumber(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>

        <div className="runner-form-cats">
          <div className="cat-group">
            <CategoryToggle
              label="♂ Masculino"
              active={gender === 'MASCULINO'}
              onClick={() => setGender('MASCULINO')}
              color="#3b82f6"
            />
            <CategoryToggle
              label="♀ Feminino"
              active={gender === 'FEMININO'}
              onClick={() => setGender('FEMININO')}
              color="#ec4899"
            />
          </div>

          <div className="cat-group">
            <CategoryToggle
              label="🏠 Local"
              active={origin === 'LOCAL'}
              onClick={() => setOrigin('LOCAL')}
              color="#22c55e"
            />
            <CategoryToggle
              label="🚗 Visitante"
              active={origin === 'VISITANTE'}
              onClick={() => setOrigin('VISITANTE')}
              color="#06b6d4"
            />
          </div>

          <div className="cat-group">
            <CategoryToggle
              label="♿ PCD"
              active={isPcd}
              onClick={() => setIsPcd(p => !p)}
              color="#a855f7"
            />
            <CategoryToggle
              label="👴 +60"
              active={is60Plus}
              onClick={() => setIs60Plus(p => !p)}
              color="#14b8a6"
            />
          </div>
        </div>

        <div className="cat-preview">Categoria: <strong>{buildCategory()}</strong></div>

        {displayedError && <div className="runner-form-error">{displayedError}</div>}

        <button type="submit" className="runner-submit-btn" disabled={submitting}>
          {submitting ? 'Cadastrando...' : '✓ Confirmar Corredor'}
        </button>
      </form>

      {lastQrCode && (
        <QRResultPanel lastQrCode={lastQrCode} raceName={activeRace?.name} onDismiss={clearLastQrCode} />
      )}
    </div>
  )
}

// ─── Runner QR Code Modal (for clicking registered runners) ────────────────────
function RunnerQRModal({ runner, raceName, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printingBt, setPrintingBt] = useState(false)

  useEffect(() => {
    let active = true
    generateRunnerQRCode(runner).then(url => {
      if (active) {
        setQrDataUrl(url)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [runner])

  const handlePrintBt = async () => {
    if (!qrDataUrl) return
    if (!isBluetoothSupported()) {
      printRunnerQRCode(qrDataUrl, runner, raceName)
      return
    }
    setPrintingBt(true)
    try {
      await printRunnerToBluetooth(qrDataUrl, runner, raceName)
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        alert(`Erro na impressora Bluetooth: ${err.message || 'Verifique se a impressora térmica está ligada.'}`)
      }
    } finally {
      setPrintingBt(false)
    }
  }

  return (
    <Modal title={`QR Code — ${runner.name}`} onClose={onClose} maxWidth={440}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '10px 0' }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Gerando QR Code...</p>
        ) : (
          <>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              <img src={qrDataUrl} alt={`QR de ${runner.name}`} style={{ width: 190, height: 190, display: 'block' }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{runner.name}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                {runner.number && (
                  <span style={{ background: 'rgba(124, 58, 237, 0.25)', color: '#c4b5fd', padding: '3px 12px', borderRadius: 12, fontSize: '0.88rem', fontWeight: 700 }}>
                    Nº {runner.number}
                  </span>
                )}
                {runner.category && (
                  <span style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.75)', padding: '3px 12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600 }}>
                    {runner.category}
                  </span>
                )}
              </div>
            </div>

            <div className="qr-result-actions" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="qr-action-btn qr-action-thermal"
                onClick={handlePrintBt}
                disabled={printingBt}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🖨 {printingBt ? 'Enviando...' : 'Imprimir Térmica'}
              </button>
              <button
                type="button"
                className="qr-action-btn qr-action-cupom"
                onClick={() => printRunnerQRCode(qrDataUrl, runner, raceName)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🧾 Imprimir Cupom Sistema
              </button>
              <a
                className="qr-action-btn qr-action-download"
                href={qrDataUrl}
                download={buildQRFilename(runner)}
                style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
              >
                ⬇ Baixar Imagem (PNG)
              </a>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Registered Runners List ──────────────────────────────────────────────────
function RegisteredRunnersList({ runners, onSelectRunner }) {
  const [page, setPage] = useState(0)
  const PAGE = 20
  const paged = runners.slice(page * PAGE, (page + 1) * PAGE)
  const totalPages = Math.ceil(runners.length / PAGE)

  return (
    <div className="registered-runners-section">
      <div className="registered-runners-header">
        CORREDORES CADASTRADOS
        <span className="registered-runners-count">{runners.length}</span>
      </div>
      {runners.length === 0 ? (
        <p className="registered-runners-empty">Nenhum corredor cadastrado.</p>
      ) : (
        <>
          <ul className="registered-runners-list">
            {paged.map(r => (
              <li
                key={r.id}
                className="registered-runner-item"
                onClick={() => onSelectRunner?.(r)}
                title="Clique para abrir e imprimir o QR Code"
              >
                <span className="rri-number">Nº {r.number || '—'}</span>
                <span className="rri-name">{r.name}</span>
                <span className="rri-cat">{r.category || '—'}</span>
                <span className="rri-qr-icon">📷 QR</span>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="runners-pagination">
              <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>◀</button>
              <span>{page + 1}/{totalPages}</span>
              <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>▶</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RaceHomePage({ onNavigate, onOpenScanner }) {
  const { activeRace, clearActiveRace, selectRace } = useActiveRace()
  const { races, setStartTime, finishRace, reopenRace, editRace, removeRace, createRace } = useRaces()
  const { runners } = useRunners(activeRace?.id)
  const { runners: allRunners } = useRunners('ALL')
  const { placements } = useResults(activeRace?.id)

  const [raceTab, setRaceTab] = useState('current')
  const [registeredPage, setRegisteredPage] = useState(0)
  const [name, setName] = useState(activeRace?.name || '')
  const [distanceKm, setDistanceKm] = useState(activeRace?.distanceKm || '')
  const [isConfirmed, setIsConfirmed] = useState(Boolean(activeRace?.id))
  const [savingRace, setSavingRace] = useState(false)
  const [confirmingStartEmpty, setConfirmingStartEmpty] = useState(false)
  const [selectedRunnerModal, setSelectedRunnerModal] = useState(null)
  const [lastRace, setLastRace] = useState(activeRace || null)
  const raceNameInputRef = React.useRef(null)

  useEffect(() => {
    if (activeRace) {
      setName(activeRace.name || '')
      setDistanceKm(activeRace.distanceKm || '')
      setIsConfirmed(true)
      setLastRace(activeRace)
    }
  }, [activeRace?.id, activeRace?.name, activeRace?.distanceKm])

  const handleToggleConfirmRace = async () => {
    const trimmed = (name || '').trim()
    if (!trimmed) {
      alert('Informe o nome da corrida para confirmar.')
      raceNameInputRef.current?.focus()
      return
    }
    setSavingRace(true)
    try {
      if (activeRace?.id) {
        await editRace(activeRace.id, {
          name: trimmed,
          distanceKm: (distanceKm || '').trim(),
          eventDate: activeRace.eventDate || new Date().toISOString().split('T')[0]
        })
        setIsConfirmed(true)
      } else {
        const newRace = await createRace(
          trimmed,
          new Date().toISOString().split('T')[0],
          (distanceKm || '').trim()
        )
        if (newRace) {
          selectRace(newRace)
          setIsConfirmed(true)
          setLastRace(newRace)
        }
      }
    } finally {
      setSavingRace(false)
    }
  }

  const handleStartNewRace = () => {
    if (activeRace) {
      setLastRace(activeRace)
    }
    clearActiveRace()
    setName('')
    setDistanceKm('')
    setIsConfirmed(false)
    setRaceTab('current')
    setTimeout(() => raceNameInputRef.current?.focus(), 50)
  }

  const handleRestoreLastRace = () => {
    if (lastRace) {
      selectRace(lastRace)
      setName(lastRace.name || '')
      setDistanceKm(lastRace.distanceKm || '')
      setIsConfirmed(true)
      setRaceTab('current')
    }
  }

  const handleEnsureActiveRace = async () => {
    if (activeRace?.id) return activeRace
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    setSavingRace(true)
    try {
      const newRace = await createRace(
        trimmed,
        new Date().toISOString().split('T')[0],
        (distanceKm || '').trim()
      )
      if (newRace) {
        selectRace(newRace)
        setIsConfirmed(true)
        return newRace
      }
      return null
    } finally {
      setSavingRace(false)
    }
  }

  const handleStartNow = async () => {
    if (!activeRace?.id) {
      alert('Confirme a corrida antes de iniciar o cronômetro.')
      return
    }
    if (runners.length === 0) {
      setConfirmingStartEmpty(true)
      return
    }
    await setStartTime(activeRace.id, new Date().toISOString())
  }

  const handleConfirmStartEmpty = async () => {
    if (!activeRace?.id) return
    await setStartTime(activeRace.id, new Date().toISOString())
    setConfirmingStartEmpty(false)
  }

  const raceStatus = activeRace?.startTime && !activeRace?.endTime
    ? 'EM ANDAMENTO'
    : activeRace?.endTime
      ? 'ENCERRADA'
      : isConfirmed
        ? 'CONFIRMADA'
        : 'NOVA CORRIDA'

  return (
    <div className="race-config-page">
      {/* Header */}
      <header className="race-config-header">
        <div className="race-config-brand">
          <IconClock size={20} />
          <span>JANELAMARCA</span>
        </div>
        <div className="race-config-status">
          <span className="status-dot" style={{ background: isConfirmed ? '#22c55e' : '#eab308' }} />
          {raceStatus}
        </div>
      </header>

      {/* Tabs */}
      <div className="race-config-tabs" style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
        <button
          type="button"
          onClick={handleStartNewRace}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: !isConfirmed && raceTab === 'current' ? '#7c3aed' : '#1f1633',
            color: '#fff',
            fontWeight: 700,
            width: 'auto',
            display: 'inline-flex',
            cursor: 'pointer'
          }}
        >
          + Cadastrar Nova Corrida
        </button>
        {isConfirmed ? (
          <button
            type="button"
            onClick={() => setRaceTab('current')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: raceTab === 'current' ? '#7c3aed' : '#1f1633',
              color: '#fff',
              fontWeight: 700,
              width: 'auto',
              display: 'inline-flex',
              cursor: 'pointer'
            }}
          >
            🏁 Corrida Atual
          </button>
        ) : lastRace ? (
          <button
            type="button"
            onClick={handleRestoreLastRace}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid rgba(167, 139, 250, 0.35)',
              background: '#1f1633',
              color: '#c4b5fd',
              fontWeight: 700,
              width: 'auto',
              display: 'inline-flex',
              cursor: 'pointer'
            }}
            title="Voltar para a última corrida"
          >
            ↩ Última Corrida
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setRaceTab('registered')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: raceTab === 'registered' ? '#7c3aed' : '#1f1633',
            color: '#fff',
            fontWeight: 700,
            width: 'auto',
            display: 'inline-flex',
            cursor: 'pointer'
          }}
        >
          📋 Corridas Cadastradas
        </button>
      </div>

      {/* ── Tab: Current ── */}
      {raceTab === 'current' && (
        <main className="race-config-main">
          <div className="race-config-split">
            <div className="race-config-left">
              <div className="race-config-title-row">
                <IconMenu size={28} />
                <h1>{isConfirmed ? 'CONFIGURAR CORRIDA' : 'CADASTRAR CORRIDA'}</h1>
              </div>
              <p className="race-config-desc">
                {isConfirmed
                  ? 'Corrida salva. Cadastre os corredores abaixo para gerar os QR Codes.'
                  : 'Preencha os dados da corrida e clique em confirmar.'}
              </p>

              <div className="race-config-fields" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
                <div className="race-config-field" style={{ flex: '1 1 260px', maxWidth: '100%' }}>
                  <label>NOME DA CORRIDA</label>
                  <input
                    ref={raceNameInputRef}
                    value={name}
                    onChange={e => { setName(e.target.value); setIsConfirmed(false) }}
                    placeholder="Ex: Corrida Aliança 2025"
                  />
                </div>
                <div className="race-config-field" style={{ flex: '0 0 120px', maxWidth: '100%' }}>
                  <label>DISTÂNCIA</label>
                  <input
                    value={distanceKm}
                    onChange={e => { setDistanceKm(e.target.value); setIsConfirmed(false) }}
                    placeholder="Ex: 5km, 10km..."
                  />
                </div>
                <div className="race-config-field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={`race-confirm-toggle-btn ${isConfirmed ? 'race-confirm-toggle-btn--confirmed' : ''}`}
                    onClick={handleToggleConfirmRace}
                    disabled={savingRace}
                    title={isConfirmed ? 'Corrida confirmada e salva' : 'Confirmar e salvar corrida'}
                  >
                    {savingRace ? 'Salvando...' : isConfirmed ? '✓ Corrida Ativada' : '✓ Confirmar Corrida'}
                  </button>
                </div>
              </div>

              <RunnerForm activeRace={activeRace} onEnsureActiveRace={handleEnsureActiveRace} />
            </div>

            <div className="race-config-right">
              <RegisteredRunnersList runners={runners} onSelectRunner={setSelectedRunnerModal} />
            </div>
          </div>

          <p className="race-config-info">
            <IconHome size={14} /> Corredores locais serão marcados <strong>após o encerramento</strong> da corrida.
          </p>

          <button
            type="button"
            className="race-config-start-btn"
            onClick={() => { handleStartNow(); onNavigate?.('chronometer') }}
          >
            <IconPlay size={20} /> INICIAR CRONÔMETRO
          </button>
        </main>
      )}

      {/* ── Tab: Registered ── */}
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
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="registered-race-select-btn"
                        onClick={() => { selectRace(r); setRaceTab('current') }}
                      >
                        {isActive ? '✓ Em edição' : 'Selecionar'}
                      </button>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          {races.length > 6 && (
            <div className="registered-races-pagination" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button
                type="button"
                disabled={registeredPage === 0}
                onClick={() => setRegisteredPage(p => p - 1)}
                style={{ padding: '6px 12px', borderRadius: 8, background: '#1f1633', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                ◀ Anterior
              </button>
              <button
                type="button"
                disabled={(registeredPage + 1) * 6 >= races.length}
                onClick={() => setRegisteredPage(p => p + 1)}
                style={{ padding: '6px 12px', borderRadius: 8, background: '#1f1633', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Próximo ▶
              </button>
            </div>
          )}
        </main>
      )}

      {/* Confirm Start Empty Dialog */}
      {confirmingStartEmpty && (
        <ConfirmDialog
          isOpen={confirmingStartEmpty}
          message="Deseja iniciar o cronômetro mesmo sem nenhum corredor cadastrado?"
          confirmLabel="Iniciar mesmo assim"
          onConfirm={handleConfirmStartEmpty}
          onCancel={() => setConfirmingStartEmpty(false)}
        />
      )}

      {/* Runner QR Code Modal */}
      {selectedRunnerModal && (
        <RunnerQRModal
          runner={selectedRunnerModal}
          raceName={activeRace?.name}
          onClose={() => setSelectedRunnerModal(null)}
        />
      )}
    </div>
  )
}

