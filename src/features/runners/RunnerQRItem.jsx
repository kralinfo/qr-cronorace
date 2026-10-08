// UI only: item da lista de corredores com menu de três pontinhos (⋮) para visualizar/baixar/imprimir seu QR code.
import React, { useState } from 'react'
import { useRunnerQRCode } from './useRunnerQRCode.js'
import { printRunnerQRCode } from './print.service.js'
import { downloadDataUrl } from './download.service.js'
import { buildQRFilename } from './qr-filename.service.js'
import ActionsMenu from '../../shared/ActionsMenu.jsx'

/**
 * @param {{
 *   runner: import('./runners.types.js').Runner,
 *   raceName?: string,
 *   onShowHistory?: (runner: import('./runners.types.js').Runner) => void,
 *   highlightRaceBadge?: boolean,
 *   onSelectRace?: (raceId: string) => void
 * }} props
 */
export default function RunnerQRItem({
  runner,
  raceName,
  onShowHistory,
  highlightRaceBadge = false,
  onSelectRace
}) {
  const { qrDataUrl, loading, ensureQRCode } = useRunnerQRCode(runner)
  const [showPreview, setShowPreview] = useState(false)

  const handleToggleView = async () => {
    if (!showPreview) {
      await ensureQRCode()
      setShowPreview(true)
    } else {
      setShowPreview(false)
    }
  }

  const handlePrint = async () => {
    const dataUrl = await ensureQRCode()
    printRunnerQRCode(dataUrl, runner, raceName)
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
      label: 'Baixar PNG',
      onClick: handleDownload
    },
    {
      label: 'Imprimir QR Code',
      onClick: handlePrint
    },
    ...(onShowHistory
      ? [{ label: 'Ver histórico', onClick: () => onShowHistory(runner) }]
      : []),
    ...(onSelectRace
      ? [{ label: 'Abrir nesta corrida', onClick: () => onSelectRace(runner.raceId) }]
      : [])
  ]

  return (
    <li className="runner-qr-item">
      <div className="runner-item-header">
        <div className="runner-info">
          <div className="runner-name-row">
            <strong className="runner-name">{runner.name}</strong>
            {runner.number ? <span className="runner-number-badge">Nº {runner.number}</span> : null}
          </div>
          <div className="runner-meta-row">
            <span className="runner-id-tag">ID: {runner.id}</span>
            {raceName && (
              <span className={`runner-race-badge ${highlightRaceBadge ? 'highlight' : ''}`}>
                🏁 {raceName}
              </span>
            )}
          </div>
        </div>

        <div className="runner-actions-wrap">
          <ActionsMenu items={menuItems} />
        </div>
      </div>

      {showPreview && qrDataUrl && (
        <div className="runner-qr-preview">
          <div className="runner-qr-preview-header">
            {raceName && <p className="runner-preview-race">Corrida: <strong>{raceName}</strong></p>}
            <button
              type="button"
              className="runner-qr-preview-close"
              onClick={() => setShowPreview(false)}
              aria-label="Fechar visualização"
            >
              ✕
            </button>
          </div>
          <img src={qrDataUrl} alt={`QR de ${runner.name}`} style={{ width: 140, height: 140 }} />
          <div className="runner-qr-preview-actions">
            <button type="button" onClick={handleDownload} disabled={loading}>
              Baixar PNG
            </button>
            <button type="button" className="print-btn" onClick={handlePrint} disabled={loading}>
              🖨️ Imprimir QR
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
