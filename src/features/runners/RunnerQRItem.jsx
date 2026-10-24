// UI only: item da lista de corredores com menu de três pontinhos (⋮) para visualizar/baixar/imprimir seu QR code.
import React, { useState } from 'react'
import { useRunnerQRCode } from './useRunnerQRCode.js'
import { printRunnerQRCode } from './print.service.js'
import { downloadDataUrl } from './download.service.js'
import { buildQRFilename } from './qr-filename.service.js'
import { isBluetoothSupported, printRunnerToBluetooth } from './bluetooth-printer.service.js'
import ActionsMenu from '../../shared/ActionsMenu.jsx'
import { IconPrinter, IconReceipt, IconDownload, IconClose } from '../../shared/Icons.jsx'

/**
 * @param {{
 *   runner: import('./runners.types.js').Runner,
 *   raceName?: string,
 *   onShowHistory?: (runner: import('./runners.types.js').Runner) => void,
 *   onEdit?: (runner: import('./runners.types.js').Runner) => void,
 *   onDelete?: (runner: import('./runners.types.js').Runner) => void,
 *   highlightRaceBadge?: boolean,
 *   onSelectRace?: (raceId: string) => void
 * }} props
 */
export default function RunnerQRItem({
  runner,
  raceName,
  showRaceName = false,
  onShowHistory,
  onEdit,
  onDelete,
  highlightRaceBadge = false,
  onSelectRace,
  disableActions = false
}) {
  const { qrDataUrl, loading, ensureQRCode } = useRunnerQRCode(runner)
  const [showPreview, setShowPreview] = useState(false)
  const [printingBt, setPrintingBt] = useState(false)
  const btSupported = isBluetoothSupported()

  const handleToggleView = async () => {
    if (!showPreview) {
      await ensureQRCode()
      setShowPreview(true)
    } else {
      setShowPreview(false)
    }
  }

  const handlePrintStandard = async () => {
    const dataUrl = await ensureQRCode()
    printRunnerQRCode(dataUrl, runner, raceName)
  }

  const handlePrintBluetooth = async () => {
    if (!isBluetoothSupported()) {
      const dataUrl = await ensureQRCode()
      printRunnerQRCode(dataUrl, runner, raceName)
      return
    }
    setPrintingBt(true)
    try {
      const dataUrl = await ensureQRCode()
      await printRunnerToBluetooth(dataUrl, runner, raceName)
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        alert(`Erro na impressora Bluetooth: ${err.message || 'Verifique se a impressora térmica está ligada.'}`)
      }
    } finally {
      setPrintingBt(false)
    }
  }

  const handleDownload = async () => {
    const dataUrl = await ensureQRCode()
    downloadDataUrl(dataUrl, buildQRFilename(runner))
  }

  const menuItems = [
    {
      label: showPreview ? 'Ocultar QR Code' : 'Ver QR Code',
      onClick: handleToggleView
    },
    {
      label: printingBt ? 'Enviando p/ Térmica...' : 'Imprimir Térmica (Bluetooth)',
      onClick: handlePrintBluetooth
    },
    {
      label: 'Imprimir Cupom (58mm / Sistema)',
      onClick: handlePrintStandard
    },
    {
      label: 'Baixar PNG',
      onClick: handleDownload
    },
    ...(onEdit
      ? [{ label: 'Editar corredor', onClick: () => onEdit(runner), disabled: disableActions }]
      : []),
    ...(onShowHistory
      ? [{ label: 'Ver histórico', onClick: () => onShowHistory(runner) }]
      : []),
    ...(onSelectRace
      ? [{ label: 'Abrir nesta corrida', onClick: () => onSelectRace(runner.raceId) }]
      : []),
    ...(onDelete
      ? [{ label: 'Excluir corredor', onClick: () => onDelete(runner), danger: true, disabled: disableActions }]
      : [])
  ]

  const handleCardClick = (e) => {
    if (e.target.closest('.runner-actions-wrap') || e.target.closest('.runner-qr-preview')) {
      return
    }
    handleToggleView()
  }

  return (
    <li
      className={`runner-qr-item ${showPreview ? 'preview-open' : ''}`}
      onClick={handleCardClick}
      title="Clique para ver o QR Code deste corredor"
    >
      <div className="runner-item-header">
        <div className="runner-info">
          <div className="runner-name-row">
            <strong className="runner-name">{runner.name}</strong>
            <span
              className={`runner-number-badge ${!runner.number ? 'empty' : ''}`}
              aria-label={`Número ${runner.number || 'sem número'}`}
            >
              Nº {runner.number || '—'}
            </span>
          </div>
          <div className="runner-meta-row">
            {runner.cpf ? (
              <span className="runner-cpf-tag">CPF: {runner.cpf}</span>
            ) : (
              <span className="runner-cpf-tag empty">Sem CPF</span>
            )}
            {showRaceName && raceName && (
              <span className={`runner-race-badge ${highlightRaceBadge ? 'highlight' : ''}`}>
                {raceName}
              </span>
            )}
          </div>
        </div>

        <div className="runner-actions-wrap" onClick={e => e.stopPropagation()}>
          <ActionsMenu items={menuItems} />
        </div>
      </div>

      {showPreview && qrDataUrl && (
        <div className="runner-qr-preview">
          <div className="runner-qr-preview-header">
            {showRaceName && raceName && <p className="runner-preview-race">Corrida: <strong>{raceName}</strong></p>}
            <button
              type="button"
              className="runner-qr-preview-close"
              onClick={() => setShowPreview(false)}
              aria-label="Fechar visualização"
            >
              <IconClose size={14} />
            </button>
          </div>
          <img src={qrDataUrl} alt={`QR de ${runner.name}`} style={{ width: 160, height: 'auto', maxHeight: 210 }} />
          <div className="runner-qr-preview-caption">
            <span className="runner-qr-preview-name">{runner.name}</span>
            <span className="runner-qr-preview-number">Nº {runner.number || '—'}</span>
          </div>
          <div className="runner-qr-preview-actions">
            <button
              type="button"
              className="print-btn"
              onClick={handlePrintBluetooth}
              disabled={loading || printingBt}
            >
              <IconPrinter size={15} /> {printingBt ? 'Enviando...' : 'Térmica Bluetooth'}
            </button>
            <button type="button" onClick={handlePrintStandard} disabled={loading}>
              <IconReceipt size={15} /> Cupom Sistema
            </button>
            <button type="button" onClick={handleDownload} disabled={loading}>
              <IconDownload size={15} /> Baixar PNG
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
