import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useActiveRace } from './ActiveRaceContext.jsx'
import { useRaces } from './useRaces.js'
import { useRunners } from '../runners/useRunners.js'
import { useResults } from '../results/useResults.js'
import { printRunnerQRCode, printRunnersQRCodeBatch } from '../runners/print.service.js'
import { downloadDataUrl } from '../runners/download.service.js'
import { buildQRFilename } from '../runners/qr-filename.service.js'
import { isBluetoothSupported, printRunnerToBluetooth } from '../runners/bluetooth-printer.service.js'
import { generateRunnerBarcode } from '../runners/barcode.service.js'
import StartTimeField from './StartTimeField.jsx'
import EditRaceForm from './EditRaceForm.jsx'
import ConfirmDialog from '../../shared/ConfirmDialog.jsx'
import ReopenRaceModal from './ReopenRaceModal.jsx'
import Modal from '../../shared/Modal.jsx'
import AllRunnersModal from './AllRunnersModal.jsx'
import ImportRunnersModal from '../runners/ImportRunnersModal.jsx'
import RunnerQRModal from '../runners/RunnerQRModal.jsx'
import { IconPlay, IconMenu, IconClock, IconHome, IconCheck } from '../../shared/Icons.jsx'

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
          <img src={lastQrCode.qrDataUrl} alt={`Código de barras de ${lastQrCode.runner.name}`} className="qr-result-img" />
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
  const [sex, setSex] = useState('MASCULINO')             // 'MASCULINO' | 'FEMININO'
  const [isLocal, setIsLocal] = useState(false)            // false = VISITANTE, true = LOCAL
  const [specialCondition, setSpecialCondition] = useState('') // '' | 'PCD' | '+60'
  const [localError, setLocalError] = useState(null)

  const buildCategory = () => {
    const base = isLocal
      ? (sex === 'FEMININO' ? 'LOCAL FEM' : 'LOCAL MASC')
      : (sex === 'FEMININO' ? 'FEMININO' : 'MASCULINO')
    return specialCondition ? `${base} | ${specialCondition}` : base
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
        setIsLocal(false)
        setSpecialCondition('')
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
  const isMasc = sex === 'MASCULINO'

  return (
    <div className="runner-form-wrap">
      {/* ── Abas de Sexo: Masculino / Feminino ── */}
      <div className="runner-gender-tabs">
        <button
          type="button"
          className={`runner-gender-tab runner-gender-tab--masc ${isMasc ? 'active' : ''}`}
          onClick={() => setSex('MASCULINO')}
        >
          <span className="gender-icon">♂</span>
          <span>CADASTRO MASCULINO</span>
        </button>
        <button
          type="button"
          className={`runner-gender-tab runner-gender-tab--fem ${!isMasc ? 'active' : ''}`}
          onClick={() => setSex('FEMININO')}
        >
          <span className="gender-icon">♀</span>
          <span>CADASTRO FEMININO</span>
        </button>
      </div>

      <div className="runner-form-section-title" style={{ color: isMasc ? '#60a5fa' : '#f472b6' }}>
        {isMasc ? '♂ CADASTRAR CORREDOR MASCULINO' : '♀ CADASTRAR CORREDORA FEMININA'}
      </div>

      <form onSubmit={handleSubmit} className="runner-inline-form">
        <div className="runner-form-row">
          <input
            ref={nameInputRef}
            className="runner-form-input runner-form-name"
            placeholder={isMasc ? 'Nome do corredor' : 'Nome da corredora'}
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

        <div className="runner-form-cats" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          {/* Opção de Local (não clicou = visitante) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ORIGEM:
            </span>
            <CategoryToggle
              label={isLocal ? '🏠 Local ✓' : '🏠 Local'}
              active={isLocal}
              onClick={() => setIsLocal(p => !p)}
              color="#f59e0b"
            />
          </div>

          {/* Opção de PCD ou +60 (não clicou = nenhum) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CONDIÇÃO (OPCIONAL):
            </span>
            <div className="cat-group">
              <CategoryToggle
                label="♿ PCD"
                active={specialCondition === 'PCD'}
                onClick={() => setSpecialCondition(p => p === 'PCD' ? '' : 'PCD')}
                color="#a855f7"
              />
              <CategoryToggle
                label="👴 +60"
                active={specialCondition === '+60'}
                onClick={() => setSpecialCondition(p => p === '+60' ? '' : '+60')}
                color="#14b8a6"
              />
            </div>
          </div>
        </div>

        <div className="cat-preview">
          Categoria: <strong style={{ color: isMasc ? '#93c5fd' : '#f9a8d4' }}>{buildCategory()}</strong>
          <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: 8 }}>
            ({isLocal ? 'Local' : 'Visitante'}{specialCondition ? ` · ${specialCondition}` : ''})
          </span>
        </div>

        {displayedError && <div className="runner-form-error">{displayedError}</div>}

        <button
          type="submit"
          className="runner-submit-btn"
          disabled={submitting}
          style={!isMasc ? { background: 'linear-gradient(135deg, #db2777, #be185d)' } : {}}
        >
          {submitting
            ? 'Cadastrando...'
            : isMasc
              ? '✓ Confirmar Corredor Masculino'
              : '✓ Confirmar Corredora Feminina'}
        </button>
      </form>

      {lastQrCode && (
        <QRResultPanel lastQrCode={lastQrCode} raceName={activeRace?.name} onDismiss={clearLastQrCode} />
      )}
    </div>
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
                title="Clique para abrir e imprimir o código de barras"
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
  const { runners, createRunner, removeRunner } = useRunners(activeRace?.id)
  const { runners: allRunners } = useRunners('ALL')
  const { placements } = useResults(activeRace?.id)

  const [raceTab, setRaceTab] = useState('current')
  const [registeredPage, setRegisteredPage] = useState(0)
  const [name, setName] = useState(activeRace?.name || '')
  const [distanceKm, setDistanceKm] = useState(activeRace?.distanceKm || '')
  const [isConfirmed, setIsConfirmed] = useState(Boolean(activeRace?.id))
  const [savingRace, setSavingRace] = useState(false)
  const [confirmingStartEmpty, setConfirmingStartEmpty] = useState(false)
  const [lastRace, setLastRace] = useState(activeRace || null)
  const raceNameInputRef = React.useRef(null)
  const raceDistInputRef = React.useRef(null)

  // Estados dos cards MASCULINO e FEMININO
  const [maleName, setMaleName] = useState('')
  const [maleNumber, setMaleNumber] = useState('')
  const [maleIsLocal, setMaleIsLocal] = useState(false)
  const [maleSpecial, setMaleSpecial] = useState('')
  const [submittingMale, setSubmittingMale] = useState(false)

  const [femaleName, setFemaleName] = useState('')
  const [femaleNumber, setFemaleNumber] = useState('')
  const [femaleIsLocal, setFemaleIsLocal] = useState(false)
  const [femaleSpecial, setFemaleSpecial] = useState('')
  const [submittingFemale, setSubmittingFemale] = useState(false)

  // Input refs para navegação rápida com Enter
  const maleNameRef = useRef(null)
  const maleNumberRef = useRef(null)
  const femaleNameRef = useRef(null)
  const femaleNumberRef = useRef(null)
  const maleAddBtnRef = useRef(null)
  const femaleAddBtnRef = useRef(null)

  // Corredor selecionado para exibir o QR Code em baixo
  const [selectedRunner, setSelectedRunner] = useState(null)
  const [selectedQrUrl, setSelectedQrUrl] = useState(null)
  const [printingBt, setPrintingBt] = useState(false)
  const [printingBatchCat, setPrintingBatchCat] = useState(null)
  const [printingBtCat, setPrintingBtCat] = useState(null)

  // Modal de QR individual, todos os corredores e reabrir corrida
  const [selectedRunnerModal, setSelectedRunnerModal] = useState(null)
  const [allRunnersModalOpen, setAllRunnersModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)

useEffect(() => {
    let active = true
    if (selectedRunner) {
      generateRunnerBarcode(selectedRunner)
        .then(url => { if (active) setSelectedQrUrl(url) })
        .catch(err => { console.error('Erro ao gerar código de barras:', err); if (active) setSelectedQrUrl(null) })
    } else {
      setSelectedQrUrl(null)
    }
    return () => { active = false }
  }, [selectedRunner])

useEffect(() => {
    if (activeRace) {
      setName(activeRace.name || '')
      setDistanceKm(activeRace.distanceKm || '')
      setIsConfirmed(true)
      setLastRace(activeRace)
      try {
        localStorage.setItem('pwa-qr-timing:active-race', JSON.stringify(activeRace))
        localStorage.setItem('pwa-qr-timing:active-race-id', activeRace.id)
      } catch (e) {}
    }
  }, [activeRace?.id, activeRace?.name, activeRace?.distanceKm, activeRace?.startTime, activeRace?.endTime])

  useEffect(() => {
    if (runners) {
      try {
        localStorage.setItem('pwa-qr-timing:runners-lookup', JSON.stringify(runners))
      } catch (e) {}
    }
  }, [runners])

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
    const trimmed = (name || '').trim()
    setSavingRace(true)
    try {
      if (activeRace?.id) {
        if (trimmed && (trimmed !== activeRace.name || (distanceKm || '').trim() !== (activeRace.distanceKm || ''))) {
          await editRace(activeRace.id, {
            name: trimmed,
            distanceKm: (distanceKm || '').trim(),
            eventDate: activeRace.eventDate || new Date().toISOString().split('T')[0]
          })
          setIsConfirmed(true)
        }
        return activeRace
      }
      const raceName = trimmed || `Corrida ${new Date().toLocaleDateString('pt-BR')}`
      const newRace = await createRace(
        raceName,
        new Date().toISOString().split('T')[0],
        (distanceKm || '').trim()
      )
      if (newRace) {
        if (!trimmed) setName(raceName)
        selectRace(newRace)
        setIsConfirmed(true)
        setLastRace(newRace)
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

  const handlePrintBt = async () => {
    if (!selectedQrUrl || !selectedRunner) return
    if (!isBluetoothSupported()) {
      printRunnerQRCode(selectedQrUrl, selectedRunner, activeRace?.name)
      return
    }
    setPrintingBt(true)
    try {
      await printRunnerToBluetooth(selectedQrUrl, selectedRunner, activeRace?.name)
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        alert(`Erro na impressora Bluetooth: ${err.message || 'Verifique se a impressora térmica está ligada.'}`)
      }
    } finally {
      setPrintingBt(false)
    }
  }

  const handlePrintBatchSystem = async (runnersList, catKey) => {
    if (!runnersList || runnersList.length === 0) return
    setPrintingBatchCat(catKey)
    try {
      await printRunnersQRCodeBatch(runnersList, activeRace?.name)
    } catch (err) {
      console.error(err)
      alert('Erro ao imprimir lote de QR Codes.')
    } finally {
      setPrintingBatchCat(null)
    }
  }

  const handlePrintBatchBt = async (runnersList, catKey) => {
    if (!runnersList || runnersList.length === 0) return
    if (!isBluetoothSupported()) {
      await handlePrintBatchSystem(runnersList, catKey)
      return
    }
    setPrintingBtCat(catKey)
    try {
      for (const runner of runnersList) {
        const dataUrl = await generateRunnerBarcode(runner)
        await printRunnerToBluetooth(dataUrl, runner, activeRace?.name)
      }
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        alert(`Erro na impressora Bluetooth: ${err.message || 'Verifique se a impressora térmica está ligada.'}`)
      }
    } finally {
      setPrintingBtCat(null)
    }
  }

  const handleSaveField = async () => {
    if (activeRace?.id) {
      await editRace(activeRace.id, {
        name: (name || '').trim() || activeRace.name,
        distanceKm: (distanceKm || '').trim()
      })
    }
  }

  const checkNumberInUse = useCallback((num) => {
    if (!num) return null
    const clean = String(num).replace(/\D/g, '')
    if (!clean) return null
    const intVal = parseInt(clean, 10)
    const padded = clean.padStart(4, '0')
    return (runners || []).find(r => {
      if (!r.number) return false
      const rClean = String(r.number).replace(/\D/g, '')
      return rClean === clean || rClean === padded || parseInt(rClean, 10) === intVal
    })
  }, [runners])

  const checkNameInUse = useCallback((runnerName) => {
    if (!runnerName) return null
    const norm = String(runnerName).trim().toLowerCase().replace(/\s+/g, ' ')
    if (!norm) return null
    return (runners || []).find(r => {
      const rNorm = String(r.name || '').trim().toLowerCase().replace(/\s+/g, ' ')
      return rNorm === norm
    })
  }, [runners])

  const handleAddMale = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    let targetRace = activeRace
    if (!targetRace?.id && handleEnsureActiveRace) {
      targetRace = await handleEnsureActiveRace()
    }
    if (!targetRace?.id) {
      alert('Informe o nome da corrida antes de cadastrar corredores.')
      return
    }

    const trimmedName = (maleName || '').trim()
    const trimmedNumber = (maleNumber || '').trim()

    if (!trimmedName) {
      alert('Informe o nome do corredor.')
      maleNameRef.current?.focus()
      return
    }
    if (!trimmedNumber) {
      alert('Informe o número de peito do corredor.')
      maleNumberRef.current?.focus()
      return
    }

    const existingRunner = checkNumberInUse(trimmedNumber)
    if (existingRunner) {
      alert(`⚠️ O número ${trimmedNumber} já está sendo usado pelo corredor "${existingRunner.name}" nesta corrida! Escolha outro número.`)
      maleNumberRef.current?.focus()
      maleNumberRef.current?.select?.()
      return
    }

    const existingName = checkNameInUse(trimmedName)
    if (existingName) {
      alert(`⚠️ O corredor "${existingName.name}" já está cadastrado nesta corrida com o Nº ${existingName.number || '—'}.`)
      maleNameRef.current?.focus()
      return
    }

    setSubmittingMale(true)
    try {
      const base = maleIsLocal ? 'LOCAL MASC' : 'MASCULINO'
      const cat = maleSpecial ? `${base} | ${maleSpecial}` : base
      const created = await createRunner(trimmedName, trimmedNumber, '', targetRace.id, cat)
      if (created) {
        setMaleName('')
        setMaleNumber('')
        setMaleIsLocal(false)
        setMaleSpecial('')
        setSelectedRunner(created.runner || created)
        maleNameRef.current?.focus()
      } else {
        alert('Não foi possível cadastrar o corredor. Verifique se o número já está em uso.')
      }
    } catch (err) {
      console.error(err)
      alert(err.message || 'Erro ao cadastrar corredor.')
    } finally {
      setSubmittingMale(false)
    }
  }

  const handleAddFemale = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    let targetRace = activeRace
    if (!targetRace?.id && handleEnsureActiveRace) {
      targetRace = await handleEnsureActiveRace()
    }
    if (!targetRace?.id) {
      alert('Informe o nome da corrida antes de cadastrar corredores.')
      return
    }

    const trimmedName = (femaleName || '').trim()
    const trimmedNumber = (femaleNumber || '').trim()

    if (!trimmedName) {
      alert('Informe o nome da corredora.')
      femaleNameRef.current?.focus()
      return
    }
    if (!trimmedNumber) {
      alert('Informe o número de peito da corredora.')
      femaleNumberRef.current?.focus()
      return
    }

    const existingRunner = checkNumberInUse(trimmedNumber)
    if (existingRunner) {
      alert(`⚠️ O número ${trimmedNumber} já está sendo usado pela corredora "${existingRunner.name}" nesta corrida! Escolha outro número.`)
      femaleNumberRef.current?.focus()
      femaleNumberRef.current?.select?.()
      return
    }

    const existingName = checkNameInUse(trimmedName)
    if (existingName) {
      alert(`⚠️ A corredora "${existingName.name}" já está cadastrada nesta corrida com o Nº ${existingName.number || '—'}.`)
      femaleNameRef.current?.focus()
      return
    }

    setSubmittingFemale(true)
    try {
      const base = femaleIsLocal ? 'LOCAL FEM' : 'FEMININO'
      const cat = femaleSpecial ? `${base} | ${femaleSpecial}` : base
      const created = await createRunner(trimmedName, trimmedNumber, '', targetRace.id, cat)
      if (created) {
        setFemaleName('')
        setFemaleNumber('')
        setFemaleIsLocal(false)
        setFemaleSpecial('')
        setSelectedRunner(created.runner || created)
        femaleNameRef.current?.focus()
      } else {
        alert('Não foi possível cadastrar a corredora. Verifique se o número já está em uso.')
      }
    } catch (err) {
      console.error(err)
      alert(err.message || 'Erro ao cadastrar corredora.')
    } finally {
      setSubmittingFemale(false)
    }
  }

  const maleRunners = useMemo(() => {
    return (runners || [])
      .filter(r => (r.category || '').toUpperCase().includes('MASC') || !(r.category || '').toUpperCase().includes('FEM'))
      .sort((a, b) => {
        const na = parseInt(a.number, 10)
        const nb = parseInt(b.number, 10)
        if (!isNaN(na) && !isNaN(nb)) return na - nb
        return (a.name || '').localeCompare(b.name || '')
      })
  }, [runners])

  const femaleRunners = useMemo(() => {
    return (runners || [])
      .filter(r => (r.category || '').toUpperCase().includes('FEM'))
      .sort((a, b) => {
        const na = parseInt(a.number, 10)
        const nb = parseInt(b.number, 10)
        if (!isNaN(na) && !isNaN(nb)) return na - nb
        return (a.name || '').localeCompare(b.name || '')
      })
  }, [runners])


  const handleOpenImportModal = async () => {
    if (!activeRace?.id) {
      const race = await handleEnsureActiveRace()
      if (!race?.id) {
        alert('Informe o nome da corrida antes de importar a planilha de corredores.')
        raceNameInputRef.current?.focus()
        return
      }
    }
    setImportModalOpen(true)
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
      : 'AGUARDANDO'

  return (
    <div className="race-config-page">
      {/* Header */}
      <header className="race-config-header">
        <div className="race-config-brand">
          <IconClock size={20} />
          <span>JANELAMARCA</span>
        </div>
        <div className="race-config-status">
          <span className="status-dot" style={{ background: activeRace?.startTime ? '#22c55e' : '#a78bfa' }} />
          {raceStatus}
        </div>
      </header>

      {/* Tabs */}
      <div className="race-config-tabs">
        <button
          type="button"
          onClick={handleStartNewRace}
          className={`race-config-tab-btn ${!isConfirmed && raceTab === 'current' ? 'active' : ''}`}
        >
          + Nova Corrida
        </button>
        {isConfirmed ? (
          <button
            type="button"
            onClick={() => setRaceTab('current')}
            className={`race-config-tab-btn ${raceTab === 'current' ? 'active' : ''}`}
          >
            🏁 Corrida Atual
          </button>
        ) : lastRace ? (
          <button
            type="button"
            onClick={handleRestoreLastRace}
            className="race-config-tab-btn"
            title="Voltar para a última corrida"
          >
            ↩ Última Corrida
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setRaceTab('registered')}
          className={`race-config-tab-btn ${raceTab === 'registered' ? 'active' : ''}`}
        >
          📋 Corridas ({races?.length || 0})
        </button>
      </div>

      {/* ── Tab: Current ── */}
      {raceTab === 'current' && (
        <main className="race-config-main">
          <div className="race-config-title-row">
            <div className="race-config-title-left">
              <span style={{ fontSize: '20px', display: 'inline-flex' }}>⚙</span>
              <h1>CONFIGURAR CORRIDA</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="race-config-batch-btn"
                onClick={handleOpenImportModal}
                title="Cadastrar múltiplos corredores via planilha Excel (.xlsx) ou CSV"
              >
                📋 Inscrição em lote
              </button>
              <button
                type="button"
                className="race-config-telao-btn"
                onClick={() => window.open(`/?ranking=1${activeRace?.id ? `&corrida=${activeRace.id}` : ''}`, '_blank')}
                title="Abrir tela de acompanhamento ao vivo para TV ou Telão"
              >
                📺 ABRIR TELÃO / TV
              </button>
            </div>
          </div>

          <div className="race-config-fields">
            <div className="race-config-field race-config-field--name">
              <label>NOME DA CORRIDA</label>
              <input
                ref={raceNameInputRef}
                value={name}
                onChange={e => { setName(e.target.value); setIsConfirmed(false) }}
                onBlur={handleSaveField}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    raceDistInputRef.current?.focus()
                  }
                }}
                placeholder="Ex: Aliança Run 2025"
              />
            </div>
            <div className="race-config-field race-config-field--dist">
              <label>DISTÂNCIA</label>
              <div className="race-config-dist-group">
                <input
                  ref={raceDistInputRef}
                  value={distanceKm}
                  onChange={e => { setDistanceKm(e.target.value); setIsConfirmed(false) }}
                  onBlur={handleSaveField}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleToggleConfirmRace()
                    }
                  }}
                  placeholder="Ex: 5km, 10km..."
                />
                <button
                  type="button"
                  className={`race-config-save-btn ${isConfirmed && activeRace?.id ? 'saved' : 'pending'}`}
                  onClick={handleToggleConfirmRace}
                  disabled={savingRace || !name.trim()}
                  title={isConfirmed && activeRace?.id ? 'Corrida salva e configurada! Clique para salvar alterações.' : 'Salvar configurações da corrida'}
                  aria-label="Salvar corrida"
                >
                  {savingRace ? '⏳' : <IconCheck size={22} strokeWidth={3.2} color="#ffffff" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Cards MASCULINO e FEMININO lado a lado ── */}
          <div className="race-config-cards">
            {/* CARD MASCULINO */}
            <section className="race-config-card male">
              <div className="race-config-card-header">
                <div className="race-config-card-title">
                  <span className="cat-dot male" />
                  MASCULINO {maleRunners.length > 0 && <span className="cat-count">({maleRunners.length})</span>}
                </div>
                <div className="card-batch-actions">
                  <button
                    type="button"
                    className="card-batch-btn bt"
                    onClick={() => handlePrintBatchBt(maleRunners, 'male')}
                    disabled={maleRunners.length === 0 || printingBtCat === 'male'}
                    title="Imprimir todos os cupons QR masculinos na Impressora Térmica Bluetooth"
                  >
                    {printingBtCat === 'male' ? '⏳' : '🖨'}
                  </button>
                </div>
              </div>
              <div className="race-config-small-label">NOME DO CORREDOR · Nº PEITO</div>
              <form onSubmit={handleAddMale} className="card-runner-form">
                {/* Linha 1: Nome (amplo) + Nº */}
                <div className="race-config-card-row">
                  <input
                    ref={maleNameRef}
                    className="race-config-input race-config-input--name"
                    placeholder="Nome do corredor"
                    value={maleName}
                    onChange={e => setMaleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (maleNumber.trim()) {
                          handleAddMale()
                        } else {
                          maleNumberRef.current?.focus()
                        }
                      }
                    }}
                    required
                  />
                  <input
                    ref={maleNumberRef}
                    className="race-config-input narrow"
                    placeholder="Nº"
                    inputMode="numeric"
                    value={maleNumber}
                    onChange={e => setMaleNumber(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault()
                        maleAddBtnRef.current?.focus()
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (!maleName.trim()) {
                          maleNameRef.current?.focus()
                        } else {
                          handleAddMale()
                        }
                      }
                    }}
                    required
                  />
                </div>
                {/* Linha 2: Opções de Categoria + Botão Adicionar menor no final */}
                <div className="race-config-card-toggles">
                  <div className="card-toggles-group">
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`card-toggle-btn ${maleIsLocal ? 'active' : ''}`}
                      onClick={() => setMaleIsLocal(p => !p)}
                    >
                      {maleIsLocal ? '🏠 Local ✓' : '🏠 Local'}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`card-toggle-btn pcd ${maleSpecial === 'PCD' ? 'active' : ''}`}
                      onClick={() => setMaleSpecial(p => p === 'PCD' ? '' : 'PCD')}
                    >
                      {maleSpecial === 'PCD' ? '♿ PCD ✓' : '♿ PCD'}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`card-toggle-btn age ${maleSpecial === '+60' ? 'active' : ''}`}
                      onClick={() => setMaleSpecial(p => p === '+60' ? '' : '+60')}
                    >
                      {maleSpecial === '+60' ? '👴 +60 ✓' : '👴 +60'}
                    </button>
                  </div>
                  <button ref={maleAddBtnRef} type="submit" className="race-config-add-btn compact" disabled={submittingMale}>
                    {submittingMale ? '...' : '+ Adicionar'}
                  </button>
                </div>
              </form>

              {/* Chips dos corredores cadastrados (apenas números para economizar espaço) */}
              <div className="race-config-runner-chips">
                {maleRunners.length === 0 ? (
                  <span style={{ fontSize: '0.78rem', color: '#898093', fontStyle: 'italic', padding: '6px 0' }}>
                    Nenhum corredor cadastrado ainda.
                  </span>
                ) : (
                  maleRunners.map(r => {
                    const isSelected = selectedRunner?.id === r.id
                    const isLocal = (r.category || '').toUpperCase().includes('LOCAL')
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className={`runner-chip male ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedRunner(prev => prev?.id === r.id ? null : r)}
                        title={`${r.name} (Nº ${r.number || '—'})${r.category ? ' · ' + r.category : ''} — Clique para ${isSelected ? 'fechar' : 'ver dados e QR'}`}
                      >
                        <span>{r.number || '—'}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </section>

            {/* CARD FEMININO */}
            <section className="race-config-card female">
              <div className="race-config-card-header">
                <div className="race-config-card-title">
                  <span className="cat-dot female" />
                  FEMININO {femaleRunners.length > 0 && <span className="cat-count">({femaleRunners.length})</span>}
                </div>
                <div className="card-batch-actions">
                  <button
                    type="button"
                    className="card-batch-btn bt"
                    onClick={() => handlePrintBatchBt(femaleRunners, 'female')}
                    disabled={femaleRunners.length === 0 || printingBtCat === 'female'}
                    title="Imprimir todos os cupons QR femininos na Impressora Térmica Bluetooth"
                  >
                    {printingBtCat === 'female' ? '⏳' : '🖨'}
                  </button>
                </div>
              </div>
              <div className="race-config-small-label">NOME DA CORREDORA · Nº PEITO</div>
              <form onSubmit={handleAddFemale} className="card-runner-form">
                {/* Linha 1: Nome (amplo) + Nº */}
                <div className="race-config-card-row">
                  <input
                    ref={femaleNameRef}
                    className="race-config-input race-config-input--name"
                    placeholder="Nome da corredora"
                    value={femaleName}
                    onChange={e => setFemaleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (femaleNumber.trim()) {
                          handleAddFemale()
                        } else {
                          femaleNumberRef.current?.focus()
                        }
                      }
                    }}
                    required
                  />
                  <input
                    ref={femaleNumberRef}
                    className="race-config-input narrow"
                    placeholder="Nº"
                    inputMode="numeric"
                    value={femaleNumber}
                    onChange={e => setFemaleNumber(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault()
                        femaleAddBtnRef.current?.focus()
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (!femaleName.trim()) {
                          femaleNameRef.current?.focus()
                        } else {
                          handleAddFemale()
                        }
                      }
                    }}
                    required
                  />
                </div>
                {/* Linha 2: Opções de Categoria + Botão Adicionar menor no final */}
                <div className="race-config-card-toggles">
                  <div className="card-toggles-group">
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`card-toggle-btn ${femaleIsLocal ? 'active' : ''}`}
                      onClick={() => setFemaleIsLocal(p => !p)}
                    >
                      {femaleIsLocal ? '🏠 Local ✓' : '🏠 Local'}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`card-toggle-btn pcd ${femaleSpecial === 'PCD' ? 'active' : ''}`}
                      onClick={() => setFemaleSpecial(p => p === 'PCD' ? '' : 'PCD')}
                    >
                      {femaleSpecial === 'PCD' ? '♿ PCD ✓' : '♿ PCD'}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`card-toggle-btn age ${femaleSpecial === '+60' ? 'active' : ''}`}
                      onClick={() => setFemaleSpecial(p => p === '+60' ? '' : '+60')}
                    >
                      {femaleSpecial === '+60' ? '👴 +60 ✓' : '👴 +60'}
                    </button>
                  </div>
                  <button ref={femaleAddBtnRef} type="submit" className="race-config-add-btn compact" disabled={submittingFemale}>
                    {submittingFemale ? '...' : '+ Adicionar'}
                  </button>
                </div>
              </form>

              {/* Chips das corredoras cadastradas (apenas números para economizar espaço) */}
              <div className="race-config-runner-chips">
                {femaleRunners.length === 0 ? (
                  <span style={{ fontSize: '0.78rem', color: '#898093', fontStyle: 'italic', padding: '6px 0' }}>
                    Nenhuma corredora cadastrada ainda.
                  </span>
                ) : (
                  femaleRunners.map(r => {
                    const isSelected = selectedRunner?.id === r.id
                    const isLocal = (r.category || '').toUpperCase().includes('LOCAL')
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className={`runner-chip female ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedRunner(prev => prev?.id === r.id ? null : r)}
                        title={`${r.name} (Nº ${r.number || '—'})${r.category ? ' · ' + r.category : ''} — Clique para ${isSelected ? 'fechar' : 'ver dados e QR'}`}
                      >
                        <span>{r.number || '—'}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </section>
          </div>

          {/* Botão Iniciar Cronômetro / Ver Informações */}
          {activeRace?.endTime ? (
            <button
              type="button"
              className="race-config-start-btn race-config-start-btn--finished"
              onClick={() => onNavigate?.('chronometer')}
            >
              <IconMenu size={20} /> VER INFORMAÇÕES
            </button>
          ) : (
            <button
              type="button"
              className="race-config-start-btn"
              onClick={() => { handleStartNow(); onNavigate?.('chronometer') }}
            >
              <IconPlay size={20} /> INICIAR CRONÔMETRO
            </button>
          )}

          {/* Link para abrir modal com todos os corredores */}
          <div className="race-config-view-all-row">
            <button
              type="button"
              className="race-config-view-all-btn"
              onClick={() => setAllRunnersModalOpen(true)}
              title="Abrir tabela com todos os corredores cadastrados"
            >
              👥 Ver todos os corredores ({runners.length}) →
            </button>
          </div>

          {/* QR Code Centralizado Abaixo do Botão Iniciar Cronômetro */}
          {selectedRunner && (
            <div className="centered-qr-panel">
              <button
                type="button"
                className="cqr-close"
                onClick={() => setSelectedRunner(null)}
                title="Fechar QR Code"
              >
                ✕
              </button>

              <div className="cqr-card">
                {selectedRunner.number && (
                  <span className="cqr-num">Nº {selectedRunner.number}</span>
                )}
                {selectedQrUrl ? (
                  <img src={selectedQrUrl} alt={`Código de barras de ${selectedRunner.name}`} className="cqr-img" />
                ) : (
                  <span className="cqr-loading">...</span>
                )}
              </div>

              <div className="cqr-details">
                <div className="cqr-name-group">
                  <span className="cqr-name" title={selectedRunner.name}>{selectedRunner.name}</span>
                  {selectedRunner.category && <span className="cqr-cat">{selectedRunner.category}</span>}
                </div>

                <div className="cqr-actions">
                  <button
                    type="button"
                    className="cqr-btn cqr-btn-bt"
                    onClick={handlePrintBt}
                    disabled={printingBt}
                    title="Imprimir na Impressora Térmica Bluetooth"
                  >
                    🖨 {printingBt ? 'Enviando...' : 'Imprimir Térmica'}
                  </button>
                  {selectedQrUrl && (
                    <a
                      className="cqr-btn cqr-btn-dl"
                      href={selectedQrUrl}
                      download={buildQRFilename(selectedRunner)}
                      title="Baixar imagem PNG do QR Code"
                    >
                      ⬇ Baixar PNG
                    </a>
                  )}
                </div>

                <div className="cqr-footer-actions">
                  <button
                    type="button"
                    className="cqr-btn-del"
                    onClick={() => {
                      if (confirm(`Excluir ${selectedRunner.name} (Nº ${selectedRunner.number})?`)) {
                        removeRunner(selectedRunner.id)
                        setSelectedRunner(null)
                      }
                    }}
                    title="Excluir este participante"
                  >
                    🗑 Excluir participante
                  </button>
                </div>
              </div>
            </div>
          )}
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

      {/* Modal de Todos os Corredores com Tabela e Exportação em PDF */}
      <AllRunnersModal
        isOpen={allRunnersModalOpen}
        runners={runners}
        raceName={activeRace?.name}
        distanceKm={activeRace?.distanceKm}
        onClose={() => setAllRunnersModalOpen(false)}
        onSelectRunner={(runner) => {
          setSelectedRunner(runner)
        }}
        onDeleteRunner={(runnerId) => {
          removeRunner(runnerId)
          if (selectedRunner?.id === runnerId) {
            setSelectedRunner(null)
          }
        }}
      />

      {/* Modal de Inscrição em Lote de Corredores via Planilha */}
      {importModalOpen && (
        <ImportRunnersModal
          raceId={activeRace?.id}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </div>
  )
}

